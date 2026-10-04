import React, { useContext, useState } from 'react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { WishlistContext } from '../context/WishlistContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './ProductCard.css';

/* ── Category-aware fallback images ── */
const FALLBACKS = {
  Bouquets:     'https://images.unsplash.com/photo-1561128290-006b27af0571?w=500&q=80',
  Arrangements: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=500&q=80',
  Pots:         'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=500&q=80',
  Gifts:        'https://images.unsplash.com/photo-1487530811015-780de33a5f8e?w=500&q=80',
  Specials:     'https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?w=500&q=80',
  default:      'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=500&q=80',
};

const getFallback = (category) =>
  FALLBACKS[category] || FALLBACKS.default;

const ProductCard = ({ product, index = 0 }) => {
  const { addToCart }                    = useContext(CartContext);
  const { user }                         = useContext(AuthContext);
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const navigate = useNavigate();

  const handleWishlist = (e) => {
    e.stopPropagation();
    if (!user) { toast.error('Please login to manage wishlist'); navigate('/login'); return; }
    toggleWishlist(product);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!user) { toast.error('Please login to add items to cart'); navigate('/login'); return; }
    addToCart(product, 1);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    if (!user) { toast.error('Please login to buy products'); navigate('/login'); return; }
    navigate('/checkout', { state: { buyNowProduct: product } });
  };

  const isOutOfStock = product.stock === 0;
  const isLowStock   = product.stock > 0 && product.stock < 5;
  const inWishlist   = isInWishlist(product._id);

  /* Mark as NEW if created within last 14 days */
  const isNew = product.createdAt
    ? (Date.now() - new Date(product.createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000
    : false;

  /* Use fallback if image is missing or clearly broken */
  const imgSrc = product.image && product.image.startsWith('http')
    ? product.image
    : getFallback(product.category);

  return (
    <div
      className="pc-card"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => navigate(`/product/${product._id}`)}
    >
      <div className="pc-img-wrap">
        <img
          src={imgSrc}
          alt={product.name || 'Flower product'}
          className="pc-img"
          onError={e => {
            e.target.onerror = null;
            e.target.src = getFallback(product.category);
          }}
        />

        {isNew && !isOutOfStock && <span className="pc-new-badge">NEW</span>}
        {isOutOfStock && <span className="pc-stock-badge sold">SOLD</span>}
        {!isOutOfStock && isLowStock && <span className="pc-stock-badge low">LOW</span>}

        {/* Gradient overlay with product name */}
        <div className="pc-img-name-overlay">
          <span>{product.name}</span>
        </div>

        <div className="pc-overlay" onClick={e => e.stopPropagation()}>
          <button
            className="pc-btn-buy-now"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
          >
            BUY NOW
          </button>
          <button
            className={`pc-btn-cart ${addedFeedback ? 'added' : ''}`}
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            {addedFeedback ? 'ADDED' : 'ADD TO CART'}
          </button>
        </div>
      </div>

      <div className="pc-content">
        <p className="pc-cat-label">{product.category}</p>
        <h3 className="pc-name">{product.name}</h3>
        {product.averageRating > 0 && (
          <div className="pc-rating-row">
            <span className="pc-stars">
              {[1,2,3,4,5].map(n => (
                <svg key={n} width="11" height="11" viewBox="0 0 24 24"
                  fill={n <= Math.round(product.averageRating) ? '#B8960C' : 'none'}
                  stroke="#B8960C" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
            </span>
            <span className="pc-rating-val">{product.averageRating.toFixed(1)}</span>
            {product.reviewCount > 0 && (
              <span className="pc-review-cnt">({product.reviewCount})</span>
            )}
          </div>
        )}
        <div className="pc-bottom-row">
          <p className="pc-price">&#8377;{product.price.toLocaleString('en-IN')}</p>
          <button
            className={`pc-wish-btn ${inWishlist ? 'active' : ''}`}
            onClick={handleWishlist}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24"
              fill={inWishlist ? '#C4856A' : 'none'}
              stroke={inWishlist ? '#C4856A' : '#8A8A8A'}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
