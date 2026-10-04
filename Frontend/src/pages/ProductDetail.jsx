import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { WishlistContext } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import useRecentlyViewed from '../hooks/useRecentlyViewed';
import api from '../services/api';
import toast from 'react-hot-toast';
import './ProductDetail.css';

/* ── Star Rating component ── */
const StarRating = ({ value, onChange, readonly = false }) => (
  <div className="pd-stars" aria-label={`Rating: ${value} out of 5`}>
    {[1,2,3,4,5].map(n => (
      <button
        key={n}
        type="button"
        className={`pd-star${n <= value ? ' filled' : ''}`}
        onClick={() => !readonly && onChange && onChange(n)}
        disabled={readonly}
        aria-label={`${n} star`}
      >
        ★
      </button>
    ))}
  </div>
);

/* ── Reviews section ── */
const ReviewsSection = ({ productId, user }) => {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 0, title: '', body: '' });
  const [showForm, setShowForm] = useState(false);
  const [reviewImages, setReviewImages] = useState([]);
  const [imgPreviews, setImgPreviews]   = useState([]);
  const [imgUploading, setImgUploading] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/${productId}`);
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.averageRating || 0);
      setTotalReviews(res.data.totalReviews || 0);
      setBreakdown(res.data.breakdown || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, [productId]);

  const handleImagePick = async (e) => {
    const files = Array.from(e.target.files).slice(0, 3 - reviewImages.length);
    if (!files.length) return;
    // Show local previews immediately
    setImgPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    setImgUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('images', f));
      const res = await api.post('/upload/review', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReviewImages(prev => [...prev, ...res.data.imageUrls]);
    } catch {
      toast.error('Image upload failed');
      setImgPreviews(prev => prev.slice(0, prev.length - files.length));
    } finally {
      setImgUploading(false);
    }
  };

  const removeImage = (i) => {
    setReviewImages(prev => prev.filter((_, j) => j !== i));
    setImgPreviews(prev => prev.filter((_, j) => j !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating) { toast.error('Please select a star rating'); return; }
    if (imgUploading) { toast.error('Please wait for images to finish uploading'); return; }
    setSubmitting(true);
    try {
      await api.post(`/reviews/${productId}`, { ...form, images: reviewImages });
      toast.success('Review submitted!');
      setForm({ rating: 0, title: '', body: '' });
      setReviewImages([]);
      setImgPreviews([]);
      setShowForm(false);
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pd-reviews">
      <div className="pd-reviews-header">
        <div>
          <span className="pd-related-label">Customer Feedback</span>
          <h2 className="pd-related-heading">Reviews & Ratings</h2>
          <div className="pd-related-line" />
        </div>
        {avgRating > 0 && (
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Overall score */}
            <div className="pd-avg-rating">
              <span className="pd-avg-num">{avgRating}</span>
              <StarRating value={Math.round(avgRating)} readonly />
              <span className="pd-review-count">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</span>
            </div>
            {/* Breakdown bars */}
            {breakdown.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 180 }}>
                {breakdown.map(({ star, count, pct }) => (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'Jost,sans-serif', fontSize: 12, color: '#4A4A4A', width: 14, textAlign: 'right' }}>{star}</span>
                    <span style={{ color: '#B8960C', fontSize: 12 }}>★</span>
                    <div style={{ flex: 1, height: 6, background: '#E0D8CC', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#B8960C', borderRadius: 3, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontFamily: 'Jost,sans-serif', fontSize: 11, color: '#8A8A8A', width: 24 }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {user && user.role === 'user' && !showForm && (
        <button className="pd-btn-review" onClick={() => setShowForm(true)}>Write a Review</button>
      )}

      {showForm && (
        <form className="pd-review-form" onSubmit={handleSubmit}>
          <div className="pd-form-row">
            <label className="pd-review-label">Your Rating</label>
            <StarRating value={form.rating} onChange={r => setForm(p => ({ ...p, rating: r }))} />
          </div>
          <div className="pd-form-row">
            <label className="pd-review-label">Title (optional)</label>
            <input
              className="pd-review-input"
              placeholder="Summarise your experience"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              maxLength={100}
            />
          </div>
          <div className="pd-form-row">
            <label className="pd-review-label">Review (optional)</label>
            <textarea
              className="pd-review-input"
              rows={3}
              placeholder="Share your thoughts about this product..."
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              maxLength={1000}
            />
          </div>

          {/* Image upload */}
          <div className="pd-form-row">
            <label className="pd-review-label">Photos (optional, max 3)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {imgPreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                  <img src={src} alt="preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1.5px solid #E0D8CC' }} />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  >×</button>
                </div>
              ))}
              {imgPreviews.length < 3 && (
                <label style={{ width: 72, height: 72, border: '1.5px dashed #E0D8CC', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8A8A8A', fontSize: 11, fontFamily: 'Jost,sans-serif', gap: 4 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8960C" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {imgUploading ? '...' : 'Add'}
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImagePick} disabled={imgUploading} />
                </label>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="pd-btn-buy-now" style={{ maxWidth: 160 }} disabled={submitting || imgUploading}>
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
            <button type="button" className="pd-btn-wishlist" style={{ maxWidth: 120 }} onClick={() => { setShowForm(false); setReviewImages([]); setImgPreviews([]); }}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ fontFamily: 'Jost,sans-serif', color: '#8A8A8A', fontSize: 13 }}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p style={{ fontFamily: 'Jost,sans-serif', color: '#8A8A8A', fontSize: 13 }}>No reviews yet. Be the first to review this product!</p>
      ) : (
        <div className="pd-review-list">
          {reviews.map(r => (
            <div key={r._id} className="pd-review-item">
              <div className="pd-review-top">
                <div>
                  <span className="pd-reviewer-name">{r.userName}</span>
                  {r.verified && <span className="pd-verified-badge">✓ Verified Purchase</span>}
                </div>
                <StarRating value={r.rating} readonly />
              </div>
              {r.title && <p className="pd-review-title">{r.title}</p>}
              {r.body && <p className="pd-review-body">{r.body}</p>}
              {r.images && r.images.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {r.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Review photo ${i + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1.5px solid #E0D8CC', cursor: 'pointer' }}
                      onClick={() => window.open(img, '_blank')}
                    />
                  ))}
                </div>
              )}
              <p className="pd-review-date">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

/* ════════════════════════════════════════
   PRODUCT DETAIL PAGE
════════════════════════════════════════ */
const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext);
  const { viewed: recentlyViewed, addProduct: addToRecentlyViewed } = useRecentlyViewed();

  const [product,  setProduct]  = useState(null);
  const [related,  setRelated]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [mainImg,  setMainImg]  = useState('');
  const [qty,      setQty]      = useState(1);
  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [lightbox, setLightbox] = useState(false);
  // For weight products without pricingOptions: free-form weight entry
  const [customWeight, setCustomWeight]   = useState('');
  const [customUnit,   setCustomUnit]     = useState('gram'); // 'gram' | 'kg'

  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/products/${id}`);
        // Handle both plain product object and { success, data: product } envelope
        const productData = res.data?.data ?? res.data;
        setProduct(productData);
        setMainImg(productData.image);
        setQty(1);
        setActiveThumb(0);
        addToRecentlyViewed(productData);
        // Auto-select first pricing option if available
        if (productData.pricingOptions && productData.pricingOptions.length > 0) {
          setSelectedOption(productData.pricingOptions[0]);
        } else {
          setSelectedOption(null);
        }
        setCustomWeight('');
        setCustomUnit(productData.stockUnit === 'kg' ? 'kg' : 'gram');

        const relRes = await api.get(`/products?category=${encodeURIComponent(productData.category || productData.type || '')}`);
        const relList = Array.isArray(relRes.data) ? relRes.data : (relRes.data?.data ?? []);
        setRelated(relList.filter(p => p._id !== id).slice(0, 4));
      } catch (err) {
        console.error('ProductDetail fetch error:', err);
        toast.error('Product not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  if (loading) return (
    <div className="pd-loading">
      <div className="pd-spinner" />
      <p>Loading…</p>
    </div>
  );

  if (!product) return null;

  const isOutOfStock = product.stock === 0;
  const isLowStock   = product.stock > 0 && product.stock < 5;
  const inWishlist   = isInWishlist(product._id);
  const hasPricingOptions  = product.pricingOptions && product.pricingOptions.length > 0;
  const isWeightBased      = product.unitType === 'weight' || product.stockUnit === 'kg' || product.stockUnit === 'gram';
  const isWeightFreeForm   = isWeightBased && !hasPricingOptions;
  const isPieceBased       = product.unitType === 'piece' || product.stockUnit === 'piece';

  // Stock display in human-readable unit
  const stockDisplay = (() => {
    if (product.stockUnit === 'kg' || (isWeightBased && product.stock >= 1000)) {
      return `${(product.stock / 1000).toLocaleString('en-IN')} kg`;
    }
    if (product.stockUnit === 'gram') return `${product.stock.toLocaleString('en-IN')} g`;
    if (product.stockUnit && product.stockUnit !== 'count') return `${product.stock} ${product.stockUnit}`;
    return `${product.stock}`;
  })();

  // price per gram — product.price is defined per stockUnit by the seller
  // e.g. stockUnit=kg, price=500 means ₹500/kg → ₹0.5/gram
  // e.g. stockUnit=gram, price=2 means ₹2/gram
  const pricePerGram = (() => {
    if (product.stockUnit === 'kg')   return product.price / 1000;  // ₹/kg → ₹/gram
    if (product.stockUnit === 'gram') return product.price;          // already ₹/gram
    return product.price;                                            // fallback
  })();

  const customWeightInGrams = customUnit === 'kg'
    ? Number(customWeight) * 1000
    : Number(customWeight);

  // Calculate price for the entered custom weight
  const customPrice = isWeightBased && customWeight && customWeightInGrams > 0
    ? Math.round(pricePerGram * customWeightInGrams)
    : 0;

  // Effective display price
  const displayPrice = (isWeightBased && customWeight && customWeightInGrams > 0)
    ? customPrice
    : (selectedOption ? selectedOption.price : product.price);

  // Build the selectedOption for free-form weight (works for all weight-based products)
  const freeFormOption = isWeightBased && customWeight && customWeightInGrams > 0 ? {
    label: customUnit === 'kg' ? `${customWeight} kg` : `${customWeight} g`,
    value: Number(customWeight),
    unit: customUnit,
    price: customPrice,
  } : null;

  const thumbnails = product.images && product.images.length > 1
    ? product.images
    : [product.image, product.image, product.image, product.image];

  const tagMap = {
    Bouquets:     ['bouquet', 'flowers', 'gift'],
    Arrangements: ['arrangement', 'floral', 'decor'],
    Pots:         ['potted', 'indoor', 'plant'],
    Gifts:        ['gift', 'special', 'occasion'],
    Specials:     ['special', 'seasonal', 'premium'],
  };
  // Use product tags from DB if available, else fallback to category-based tags
  const tags = (product.tags && product.tags.length > 0)
    ? product.tags
    : (tagMap[product.category] || ['flowers', 'gift', 'fresh']);

  const handleAddToCart = () => {
    if (!user) { toast.error('Please login to add items to cart'); navigate('/login'); return; }
    // Custom weight always takes priority over option pills
    if (isWeightBased && customWeight) {
      if (customWeightInGrams <= 0) { toast.error('Please enter a valid weight'); return; }
      if (customWeightInGrams > product.stock) { toast.error('Not enough stock available'); return; }
      addToCart(product, 1, freeFormOption);
      return;
    }
    if (isWeightBased && hasPricingOptions && !selectedOption) { toast.error('Please select a weight option or enter a custom weight'); return; }
    if (!isWeightBased && hasPricingOptions && !selectedOption) { toast.error('Please select an option'); return; }
    addToCart(product, qty, selectedOption);
  };

  const handleBuyNow = () => {
    if (!user) { toast.error('Please login to buy products'); navigate('/login'); return; }
    if (isWeightBased && customWeight) {
      if (customWeightInGrams <= 0) { toast.error('Please enter a valid weight'); return; }
      if (customWeightInGrams > product.stock) { toast.error('Not enough stock available'); return; }
      navigate('/checkout', { state: { buyNowProduct: { ...product, qty: 1, price: customPrice, selectedOption: freeFormOption } } });
      return;
    }
    if (isWeightBased && hasPricingOptions && !selectedOption) { toast.error('Please select a weight option or enter a custom weight'); return; }
    if (!isWeightBased && hasPricingOptions && !selectedOption) { toast.error('Please select an option'); return; }
    const effectivePrice = selectedOption ? selectedOption.price : product.price;
    navigate('/checkout', { state: { buyNowProduct: { ...product, qty, price: effectivePrice, selectedOption } } });
  };

  const handleWishlist = () => {
    if (!user) { toast.error('Please login to manage wishlist'); navigate('/login'); return; }
    toggleWishlist(product);
  };

  const changeQty = (delta) => {
    setQty(prev => Math.min(Math.max(1, prev + delta), product.stock || 1));
  };

  const handleQtyInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) setQty(Math.min(Math.max(1, val), product.stock || 1));
    else if (e.target.value === '') setQty('');
  };

  const handleQtyBlur = () => {
    if (qty === '' || qty < 1) setQty(1);
  };

  const handleThumb = (src, i) => {
    setMainImg(src);
    setActiveThumb(i);
  };

  return (
    <div className="pd-page">

      <Helmet>
        <title>{product.name} — Buraq Flower Exports</title>
        <meta name="description" content={product.description?.slice(0, 155)} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description?.slice(0, 155)} />
        <meta property="og:image" content={product.image} />
        <meta property="og:type" content="product" />
      </Helmet>

      {/* ── BREADCRUMB ── */}
      <nav className="pd-breadcrumb">
        <Link to="/">Home</Link>
        <span className="pd-bc-sep">/</span>
        <Link to="/shop">{product.category}</Link>
        <span className="pd-bc-sep">/</span>
        <span className="pd-bc-current">{product.name}</span>
      </nav>

      {/* ── MAIN PRODUCT SECTION ── */}
      <section className="pd-section">
        <div className="pd-inner">

          {/* LEFT — images */}
          <div className="pd-images">
            <div className="pd-main-img-wrap">
              <img
                key={mainImg}
                src={mainImg}
                alt={product.name}
                className="pd-main-img"
                style={{ cursor: 'zoom-in' }}
                onClick={() => setLightbox(true)}
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=700'; }}
              />
              {isOutOfStock && <span className="pd-badge sold">Sold Out</span>}
              {!isOutOfStock && isLowStock && <span className="pd-badge low">Low Stock</span>}
              <button
                onClick={() => setLightbox(true)}
                style={{ position:'absolute', bottom:10, right:10, background:'rgba(26,26,26,0.6)', border:'none', borderRadius:4, padding:'5px 8px', cursor:'pointer', color:'#fff', fontSize:11, fontFamily:'Jost,sans-serif', display:'flex', alignItems:'center', gap:4 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                Zoom
              </button>
            </div>

            <div className="pd-thumbs">
              {thumbnails.map((src, i) => (
                <button
                  key={i}
                  className={`pd-thumb ${activeThumb === i ? 'active' : ''}`}
                  onClick={() => handleThumb(src, i)}
                  aria-label={`View ${i + 1}`}
                >
                  <img
                    src={src}
                    alt={`${product.name} view ${i + 1}`}
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=120'; }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT — details */}
          <div className="pd-details">
            <span className="pd-category-label" style={{ '--delay': '0.1s' }}>{product.category}</span>

            <h1 className="pd-name" style={{ '--delay': '0.2s' }}>{product.name}</h1>

            <div className="pd-gold-line" style={{ '--delay': '0.25s' }} />

            <p className="pd-price" style={{ '--delay': '0.3s' }}>
              ₹{displayPrice.toLocaleString('en-IN')}
              {isWeightBased && !customWeight && !selectedOption && (
                <span style={{ fontSize: 13, color: '#8A8A8A', fontWeight: 400, marginLeft: 6 }}>
                  / {product.stockUnit === 'kg' ? 'kg' : product.stockUnit === 'gram' ? 'g' : product.stockUnit}
                </span>
              )}
            </p>

            {/* Overall rating */}
            {product.averageRating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, '--delay': '0.32s' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1,2,3,4,5].map(n => (
                    <svg key={n} width="13" height="13" viewBox="0 0 24 24"
                      fill={n <= Math.round(product.averageRating) ? '#B8960C' : 'none'}
                      stroke="#B8960C" strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
                <span style={{ fontFamily: 'Jost,sans-serif', fontSize: 13, fontWeight: 600, color: '#B8960C' }}>
                  {product.averageRating.toFixed(1)}
                </span>
                {product.reviewCount > 0 && (
                  <span style={{ fontFamily: 'Jost,sans-serif', fontSize: 12, color: '#8A8A8A' }}>
                    ({product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
            )}

            <p className="pd-short-desc" style={{ '--delay': '0.4s' }}>{product.description}</p>

            {/* Stock status */}
            {isOutOfStock ? (
              <p className="pd-stock out" style={{ '--delay': '0.45s' }}>Out of Stock</p>
            ) : isLowStock ? (
              <p className="pd-stock low" style={{ '--delay': '0.45s' }}>
                <span className="pd-stock-dot" />
                Only {stockDisplay} left — order soon
              </p>
            ) : (
              <p className="pd-stock in" style={{ '--delay': '0.45s' }}>
                <span className="pd-stock-dot" />
                In Stock — {stockDisplay} available
              </p>
            )}

            <hr className="pd-divider" />

            {/* Quantity + Actions */}
            {(!user || user.role === 'user') && (
              <div className="pd-actions" style={{ '--delay': '0.5s' }}>

                {/* ── Pricing option pills (weight/piece with predefined options) ── */}
                {hasPricingOptions && (
                  <div style={{ marginBottom: 14 }}>
                    <span className="pd-qty-label">
                      {isWeightBased ? 'Select Weight' : 'Select Option'}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {product.pricingOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setSelectedOption(opt); setCustomWeight(''); }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: selectedOption?.label === opt.label && !customWeight ? '2px solid #B8960C' : '1.5px solid #E0D8CC',
                            background: selectedOption?.label === opt.label && !customWeight ? '#B8960C11' : 'transparent',
                            color: selectedOption?.label === opt.label && !customWeight ? '#B8960C' : '#1A1A1A',
                            fontFamily: 'Jost,sans-serif',
                            fontSize: 13,
                            cursor: 'pointer',
                            fontWeight: selectedOption?.label === opt.label && !customWeight ? 600 : 400,
                          }}
                        >
                          {opt.label} — ₹{opt.price.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Custom weight input — shown for ALL weight-based products ── */}
                {isWeightBased && (
                  <div style={{ marginBottom: 14 }}>
                    <span className="pd-qty-label">
                      {hasPricingOptions ? 'Or Enter Custom Weight' : 'Enter Weight'}
                    </span>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        className="pd-qty-input"
                        style={{ width: 100, textAlign: 'center' }}
                        placeholder={customUnit === 'kg' ? 'e.g. 0.5' : 'e.g. 500'}
                        value={customWeight}
                        onChange={e => { setCustomWeight(e.target.value); if (e.target.value) setSelectedOption(null); }}
                      />
                      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1.5px solid #E0D8CC' }}>
                        {['gram', 'kg'].map(u => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => { setCustomUnit(u); setCustomWeight(''); }}
                            style={{
                              padding: '6px 14px',
                              background: customUnit === u ? '#B8960C' : 'transparent',
                              color: customUnit === u ? '#fff' : '#1A1A1A',
                              border: 'none',
                              fontFamily: 'Jost,sans-serif',
                              fontSize: 13,
                              cursor: 'pointer',
                              fontWeight: customUnit === u ? 600 : 400,
                            }}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    {customWeight && customWeightInGrams > 0 && customWeightInGrams <= product.stock && (
                      <p style={{ fontFamily: 'Jost,sans-serif', fontSize: 12, color: '#B8960C', marginTop: 6 }}>
                        ₹{customPrice.toLocaleString('en-IN')} for {customUnit === 'kg' ? `${customWeight} kg` : `${customWeight} g`}
                      </p>
                    )}
                    {customWeight && customWeightInGrams > product.stock && (
                      <p style={{ fontFamily: 'Jost,sans-serif', fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                        Only {stockDisplay} available
                      </p>
                    )}
                  </div>
                )}

                {/* ── Quantity stepper — piece/count, or weight+option (how many packs) ── */}
                {!isWeightBased && (
                  <>
                    <span className="pd-qty-label">
                      {isPieceBased ? 'Quantity (pieces)' : 'Quantity'}
                    </span>
                    <div className="pd-qty-row">
                      <div className="pd-qty">
                        <button className="pd-qty-btn" onClick={() => changeQty(-1)} disabled={qty <= 1}>−</button>
                        <input type="number" className="pd-qty-input" value={qty} min={1} max={product.stock} onChange={handleQtyInput} onBlur={handleQtyBlur} aria-label="Quantity" />
                        <button className="pd-qty-btn" onClick={() => changeQty(1)} disabled={qty >= product.stock}>+</button>
                      </div>
                    </div>
                  </>
                )}
                {isWeightBased && hasPricingOptions && selectedOption && !customWeight && (
                  <>
                    <span className="pd-qty-label">Quantity</span>
                    <div className="pd-qty-row">
                      <div className="pd-qty">
                        <button className="pd-qty-btn" onClick={() => changeQty(-1)} disabled={qty <= 1}>−</button>
                        <input type="number" className="pd-qty-input" value={qty} min={1} max={product.stock} onChange={handleQtyInput} onBlur={handleQtyBlur} aria-label="Quantity" />
                        <button className="pd-qty-btn" onClick={() => changeQty(1)} disabled={qty >= product.stock}>+</button>
                      </div>
                    </div>
                  </>
                )}

                <div className="pd-btn-group">
                  <button className="pd-btn-buy-now" onClick={handleBuyNow} disabled={isOutOfStock}>
                    Buy Now
                  </button>
                  <button className="pd-btn-cart" onClick={handleAddToCart} disabled={isOutOfStock}>
                    Add to Cart
                  </button>
                  <button className="pd-btn-wishlist" onClick={handleWishlist}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="pd-desc-section">
              <span className="pd-desc-label">Description</span>
              <p className="pd-desc-text">
                {product.description} Our flowers are sourced fresh daily and arranged by expert florists to ensure maximum freshness and beauty upon delivery.
              </p>
            </div>

            {/* Meta */}
            <div className="pd-meta">
              <div className="pd-meta-row">
                <span className="pd-meta-label">SKU</span>
                <span className="pd-meta-value">{product._id?.slice(-8).toUpperCase()}</span>
              </div>
              <div className="pd-meta-row">
                <span className="pd-meta-label">Category</span>
                <span className="pd-meta-value">{product.category}</span>
              </div>
              <div className="pd-meta-row">
                <span className="pd-meta-label">Tags</span>
                <span className="pd-meta-value">
                  {tags.map(t => <span key={t} className="pd-tag">{t}</span>)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RELATED PRODUCTS ── */}
      {related.length > 0 && (
        <section className="pd-related">
          <div className="pd-related-header">
            <span className="pd-related-label">You May Also Like</span>
            <h2 className="pd-related-heading">Related Products</h2>
            <div className="pd-related-line" />
          </div>
          <div className="pd-related-grid">
            {related.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── RECENTLY VIEWED ── */}
      {recentlyViewed.filter(p => p._id !== id).length > 0 && (
        <section className="pd-related">
          <div className="pd-related-header">
            <span className="pd-related-label">Your History</span>
            <h2 className="pd-related-heading">Recently Viewed</h2>
            <div className="pd-related-line" />
          </div>
          <div className="pd-related-grid">
            {recentlyViewed.filter(p => p._id !== id).slice(0,4).map(p => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      <ReviewsSection productId={id} user={user} />

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out' }}
        >
          <img
            src={mainImg}
            alt={product.name}
            style={{ maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:8 }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            style={{ position:'absolute', top:20, right:24, background:'none', border:'none', color:'#fff', fontSize:28, cursor:'pointer', lineHeight:1 }}
          >×</button>
          {/* Thumbnail nav inside lightbox */}
          <div style={{ position:'absolute', bottom:20, display:'flex', gap:8 }}>
            {thumbnails.map((src, i) => (
              <img key={i} src={src} alt="" onClick={e => { e.stopPropagation(); setMainImg(src); setActiveThumb(i); }}
                style={{ width:56, height:56, objectFit:'cover', borderRadius:4, border: activeThumb===i ? '2px solid #B8960C' : '2px solid transparent', cursor:'pointer', opacity: activeThumb===i ? 1 : 0.6 }} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetail;
