import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import heroImg   from '../assets/Flower10.avif';
import aboutImg  from '../assets/Flower11.avif';
import f1 from '../assets/Flower3.jpg';
import f2 from '../assets/Flower7.jpg';
import f3 from '../assets/Flower1.jpg';
import f4 from '../assets/Flower5.jpg';
import f5 from '../assets/Flower9.jpg';
import f6 from '../assets/Flower2.jpg';
import f7 from '../assets/Flower8.jpg';
import f8 from '../assets/Flower4.jpg';
import f9 from '../assets/Flower6.jpg';
import f10 from '../assets/Flower12.jpg';
import './Home.css';

const SkeletonCard = () => <div className="skeleton-card" />;

/* ── Static reviews data from current project ── */
const REVIEWS = [
  {
    id: 1,
    name: 'Anjali Sharma',
    location: 'Hosur',
    rating: 5,
    text: 'Absolutely love the freshness! My roses lasted a full week. The packaging was perfect and delivery was right on time.',
    product: 'Premium Rose Bunch',
    avatar: 'AS',
  },
  {
    id: 2,
    name: 'Rahul Verma',
    location: 'Bangalore',
    rating: 5,
    text: 'Best quality flowers I have ever ordered. Sourced directly from Hosur farms — you can feel the difference in freshness.',
    product: 'Mixed Flower Bouquet',
    avatar: 'RV',
  },
  {
    id: 3,
    name: 'Meena Krishnan',
    location: 'Chennai',
    rating: 5,
    text: 'Tulsi smells divine! Authentic and perfectly packed. Buraq Flower Exports never disappoints with quality.',
    product: 'Tulsi & Herb Collection',
    avatar: 'MK',
  },
  {
    id: 4,
    name: 'Faisal Al-Rashid',
    location: 'Dubai',
    rating: 5,
    text: 'We import regularly from Buraq for our floral mart. Consistent quality, excellent packaging, and always on schedule.',
    product: 'Export Bulk Roses',
    avatar: 'FA',
  },
  {
    id: 5,
    name: 'Priya Nair',
    location: 'Coimbatore',
    rating: 5,
    text: 'Ordered carnations for our event — they were vibrant, fresh, and lasted the entire 3-day event. Highly recommend!',
    product: 'Carnation Arrangement',
    avatar: 'PN',
  },
  {
    id: 6,
    name: 'Sanjay Patel',
    location: 'Singapore',
    rating: 5,
    text: 'PetalExpress SG has been sourcing from Buraq for 2 years. The gerbera daisies are always top grade. Great partner.',
    product: 'Gerbera Daisy Export',
    avatar: 'SP',
  },
];

/* ── Star SVG ── */
const StarIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24"
    fill={filled ? '#B8960C' : 'none'}
    stroke="#B8960C" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

/* ── Reviews carousel section ── */
const ReviewsSection = () => {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const perPage = 3;
  const totalPages = Math.ceil(REVIEWS.length / perPage);

  const goTo = (idx) => {
    if (animating) return;
    setAnimating(true);
    setActive(idx);
    setTimeout(() => setAnimating(false), 500);
  };

  useEffect(() => {
    const t = setInterval(() => {
      setActive(prev => (prev + 1) % totalPages);
    }, 5000);
    return () => clearInterval(t);
  }, [totalPages]);

  const visible = REVIEWS.slice(active * perPage, active * perPage + perPage);

  return (
    <section id="reviews-section" className="ywa-reviews">
      <div className="ywa-reviews-header reveal">
        <p className="ywa-section-label">What Our Customers Say</p>
        <span className="ywa-section-flower">🌸</span>
        <div className="ywa-section-decorated">
          <h2 className="ywa-reviews-title">Trusted Worldwide</h2>
        </div>
        <div className="ywa-reviews-line" />
      </div>

      <div className="ywa-reviews-summary reveal">
        <div className="ywa-reviews-score">
          <span className="ywa-reviews-big-num">4.9</span>
          <div className="ywa-reviews-stars-row">
            {[1,2,3,4,5].map(i => <StarIcon key={i} filled={true} />)}
          </div>
          <span className="ywa-reviews-total">Based on 500+ reviews</span>
        </div>
        <div className="ywa-reviews-bars">
          {[['5 stars', 92], ['4 stars', 6], ['3 stars', 1], ['2 stars', 1], ['1 star', 0]].map(([label, pct]) => (
            <div key={label} className="ywa-rbar-row">
              <span className="ywa-rbar-label">{label}</span>
              <div className="ywa-rbar-track">
                <div className="ywa-rbar-fill" style={{ '--pct': `${pct}%` }} />
              </div>
              <span className="ywa-rbar-pct">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`ywa-reviews-grid ${animating ? 'animating' : ''}`}>
        {visible.map((r, i) => (
          <div key={r.id} className="ywa-review-card" style={{ '--i': i }}>
            <div className="ywa-review-top">
              <div className="ywa-review-avatar">{r.avatar}</div>
              <div>
                <p className="ywa-review-name">{r.name}</p>
                <p className="ywa-review-location">{r.location}</p>
              </div>
              <div className="ywa-review-stars">
                {[1,2,3,4,5].map(i => <StarIcon key={i} filled={i <= r.rating} />)}
              </div>
            </div>
            <p className="ywa-review-text">"{r.text}"</p>
            <p className="ywa-review-product">Purchased: {r.product}</p>
          </div>
        ))}
      </div>

      <div className="ywa-reviews-dots">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            className={`ywa-reviews-dot ${i === active ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Page ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

/* ── Newsletter section ── */
const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
    setEmail('');
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section className="ywa-newsletter">
      <div className="ywa-newsletter-inner reveal">
        <div className="ywa-newsletter-text">
          <p className="ywa-section-label" style={{ color: 'rgba(245,240,232,0.5)' }}>Stay Updated</p>
          <h2 className="ywa-newsletter-title">Get Exclusive Export Deals</h2>
          <p className="ywa-newsletter-sub">Subscribe for seasonal collections, fresh arrivals, and exclusive bulk offers.</p>
        </div>
        <form className="ywa-newsletter-form" onSubmit={handleSubmit}>
          {sent ? (
            <p className="ywa-newsletter-thanks">Thank you! We'll be in touch with our latest offers.</p>
          ) : (
            <>
              <input
                type="email"
                className="ywa-newsletter-input"
                placeholder="Your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="ywa-newsletter-btn">SUBSCRIBE</button>
            </>
          )}
        </form>
      </div>
    </section>
  );
};

const Home = () => {
  const [loading, setLoading]   = useState(true);
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();

  const filter = searchParams.get('category') || '';
  const search = searchParams.get('search')   || '';

  // Advanced filter state
  const [priceRange,  setPriceRange]  = useState([0, 5000]);
  const [sortBy,      setSortBy]      = useState('newest');
  const [minRating,   setMinRating]   = useState(0);
  const [unitFilter,  setUnitFilter]  = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/products');
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setAllProducts(data);
      } catch (err) {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Apply all filters client-side
  const products = (() => {
    let data = [...allProducts];
    if (filter) data = data.filter(p => p.type === filter || p.category === filter);
    if (search) data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    data = data.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (minRating > 0) data = data.filter(p => (p.averageRating || 0) >= minRating);
    if (unitFilter) data = data.filter(p => p.unitType === unitFilter || p.stockUnit === unitFilter);
    switch (sortBy) {
      case 'price_asc':  data.sort((a,b) => a.price - b.price); break;
      case 'price_desc': data.sort((a,b) => b.price - a.price); break;
      case 'rating':     data.sort((a,b) => (b.averageRating||0) - (a.averageRating||0)); break;
      case 'newest':     data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      default: break;
    }
    return data;
  })();

  const [showAll, setShowAll] = useState(false);
  const visibleProducts = showAll ? products : products.slice(0, 12);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [loading]);

  useEffect(() => {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        let start = 0;
        const step = Math.ceil(target / 40);
        const tick = () => {
          start = Math.min(start + step, target);
          el.textContent = start + suffix;
          if (start < target) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [loading]);

  return (
    <div className="ywa-home page-fade-in">

      {/* 1. HERO */}
      {!filter && !search && (
        <section className="hero-section">
          <div className="hero-petal hero-petal-1" />
          <div className="hero-petal hero-petal-2" />
          <div className="hero-petal hero-petal-3" />

          <div className="hero-content">
            <div className="hero-trust-row hero-stagger-1">
              <span className="hero-trust-dot" />
              <span className="hero-trust-text">Trusted by 40+ retailers across 12 countries</span>
            </div>

            <p className="hero-label hero-stagger-1" style={{marginTop:'4px'}}>PREMIUM EXPORT QUALITY</p>

            <h1 className="hero-heading">
              <span className="ywa-hero-script hero-stagger-2">Buraq</span>
              <span className="ywa-hero-script hero-stagger-3">Flower Exports</span>
            </h1>

            <div className="hero-accent-line hero-stagger-4" />

            <p className="hero-description hero-stagger-5">
              Premium roses & blooms from Hosur to the world.
              Sustainably grown, expertly packed, and delivered fresh to your door.
            </p>

            <div className="hero-stats hero-stagger-6">
              <div className="hero-stat">
                <span className="hero-stat-number" data-count="45" data-suffix="+">45+</span>
                <span className="hero-stat-label">Countries</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-number" data-count="120" data-suffix="+">120+</span>
                <span className="hero-stat-label">Varieties</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-number" data-count="40" data-suffix="+">40+</span>
                <span className="hero-stat-label">Retailers</span>
              </div>
            </div>

            <div className="hero-buttons hero-stagger-7">
              <a href="#collections" className="ywa-btn-dark ywa-btn-arrow-slide">
                <span className="btn-arrow-text">SHOP NOW</span>
                <span className="btn-arrow-icon">→</span>
              </a>
              <Link to="/about" className="ywa-btn-outline">ABOUT US</Link>
            </div>
          </div>

          <div className="hero-image-side">
            <div className="hero-circle-outer">
              <div className="hero-circle">
                <img
                  src={heroImg}
                  alt="Premium rose — Buraq Flower Exports"
                  className="hero-bouquet-img"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results bar */}
      {(filter || search) && (
        <div className="ywa-results-bar">
          <span>
            {filter && <>Category: <strong>{filter}</strong></>}
            {filter && search && ' · '}
            {search && <>Search: <strong>"{search}"</strong></>}
          </span>
          <a href="/" className="ywa-clear-link">Clear</a>
        </div>
      )}

      {/* 2. PRODUCTS */}
      <section className="ywa-collections" id="collections">
        {!filter && !search && (
          <div className="ywa-collections-header reveal">
            <p className="ywa-section-label">Our Flowers</p>
            <div className="ywa-section-decorated">
              <h2 className="ywa-collections-title">Collections</h2>
            </div>
            <div className="ywa-collections-line" />
          </div>
        )}

        {filter && (
          <div className="ywa-filter-label">
            <span>{filter}</span>
          </div>
        )}

        {/* Advanced Filter Bar */}
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:20, padding:'0 4px' }}>
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{ fontFamily:'Jost,sans-serif', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', background:'none', border:'1px solid #E0D8CC', padding:'8px 16px', cursor:'pointer', color:'#1A1A1A', borderRadius:4, display:'flex', alignItems:'center', gap:6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            {showFilters ? 'Hide Filters' : 'Filter & Sort'}
          </button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ fontFamily:'Jost,sans-serif', fontSize:12, border:'1px solid #E0D8CC', padding:'8px 12px', background:'#fff', color:'#1A1A1A', borderRadius:4, cursor:'pointer' }}>
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
          <span style={{ fontFamily:'Jost,sans-serif', fontSize:12, color:'#8A8A8A', marginLeft:'auto' }}>
            {products.length} product{products.length !== 1 ? 's' : ''}
          </span>
        </div>

        {showFilters && (
          <div style={{ background:'#fff', border:'1px solid #E0D8CC', borderRadius:8, padding:'20px 24px', marginBottom:20, display:'flex', gap:32, flexWrap:'wrap', alignItems:'flex-start' }}>
            {/* Price Range */}
            <div>
              <p style={{ fontFamily:'Jost,sans-serif', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#8A8A8A', marginBottom:10 }}>Price Range</p>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="number" min={0} max={priceRange[1]} value={priceRange[0]}
                  onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
                  style={{ width:70, fontFamily:'Jost,sans-serif', fontSize:12, border:'1px solid #E0D8CC', padding:'6px 8px', borderRadius:4 }} />
                <span style={{ color:'#8A8A8A' }}>—</span>
                <input type="number" min={priceRange[0]} max={10000} value={priceRange[1]}
                  onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                  style={{ width:70, fontFamily:'Jost,sans-serif', fontSize:12, border:'1px solid #E0D8CC', padding:'6px 8px', borderRadius:4 }} />
                <span style={{ fontFamily:'Jost,sans-serif', fontSize:12, color:'#B8960C' }}>₹</span>
              </div>
            </div>
            {/* Min Rating */}
            <div>
              <p style={{ fontFamily:'Jost,sans-serif', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#8A8A8A', marginBottom:10 }}>Min Rating</p>
              <div style={{ display:'flex', gap:6 }}>
                {[0,3,4,5].map(r => (
                  <button key={r} onClick={() => setMinRating(r)}
                    style={{ fontFamily:'Jost,sans-serif', fontSize:12, padding:'6px 12px', borderRadius:4, border:'1px solid', borderColor: minRating===r ? '#B8960C' : '#E0D8CC', background: minRating===r ? '#B8960C11' : '#fff', color: minRating===r ? '#B8960C' : '#4A4A4A', cursor:'pointer' }}>
                    {r === 0 ? 'All' : `${r}★+`}
                  </button>
                ))}
              </div>
            </div>
            {/* Unit Type */}
            <div>
              <p style={{ fontFamily:'Jost,sans-serif', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#8A8A8A', marginBottom:10 }}>Measurement</p>
              <div style={{ display:'flex', gap:6 }}>
                {[['','All'],['weight','Weight'],['piece','Piece'],['count','Count']].map(([val,label]) => (
                  <button key={val} onClick={() => setUnitFilter(val)}
                    style={{ fontFamily:'Jost,sans-serif', fontSize:12, padding:'6px 12px', borderRadius:4, border:'1px solid', borderColor: unitFilter===val ? '#B8960C' : '#E0D8CC', background: unitFilter===val ? '#B8960C11' : '#fff', color: unitFilter===val ? '#B8960C' : '#4A4A4A', cursor:'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Reset */}
            <button onClick={() => { setPriceRange([0,5000]); setSortBy('newest'); setMinRating(0); setUnitFilter(''); }}
              style={{ fontFamily:'Jost,sans-serif', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', background:'none', border:'none', color:'#8A8A8A', cursor:'pointer', alignSelf:'flex-end', paddingBottom:2, borderBottom:'1px solid #8A8A8A' }}>
              Reset All
            </button>
          </div>
        )}

        {loading ? (
          <div className="ywa-product-grid">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="ywa-product-grid" id="products">
              {visibleProducts.map((product, i) => (
                <ProductCard key={product._id} product={product} index={i} />
              ))}
            </div>
            {products.length > 12 && (
              <div className="ywa-show-more">
                <button className="ywa-btn-outline-dark" onClick={() => setShowAll(v => !v)}>
                  {showAll ? 'SHOW LESS' : 'SHOW MORE'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="ywa-empty">
            <h3 className="ywa-empty-title">No flowers found</h3>
            <p className="ywa-empty-sub">Try a different search or browse all categories.</p>
            <a href="/" className="ywa-btn-outline-dark">BROWSE ALL</a>
          </div>
        )}
      </section>

      {/* 3. ABOUT */}
      {!filter && !search && (
        <section id="about-section" className="ywa-about">
          <div className="ywa-about-text reveal">
            <p className="ywa-section-label">ABOUT BURAQ FLOWER EXPORTS</p>
            <h2 className="ywa-about-heading-1">Hosur's</h2>
            <h2 className="ywa-about-heading-2">Premier Flower Exporter</h2>
            <p className="ywa-about-body">
              Rooted in the vibrant soil of Hosur, Tamil Nadu, Buraq Flower Exports specialises in
              cultivating and exporting premium flowers and herbs to international markets with
              unmatched quality and dedication.
            </p>
            <p className="ywa-about-body">
              From passionate reds to delicate pastels — our roses, carnations, gerberas, and
              tulips are harvested at peak freshness and dispatched worldwide within hours.
            </p>
            <a href="#collections" className="ywa-btn-dark ywa-btn-arrow">EXPLORE COLLECTION <span className="btn-arrow">&#8594;</span></a>
          </div>
          <div className="ywa-about-img-wrap reveal">
            <img
              src={aboutImg}
              alt="Buraq Flower Exports — Hosur farms"
              className="ywa-about-img"
            />
          </div>
        </section>
      )}

      {/* 4. PHOTO GALLERY */}
      {!filter && !search && (
        <section className="ywa-gallery">
          <div className="ywa-gallery-header reveal">
            <p className="ywa-section-label">From Our Farms</p>
            <div className="ywa-section-decorated">
              <h2 className="ywa-gallery-title">Our Flowers</h2>
            </div>
            <div className="ywa-gallery-line" />
          </div>
          <div className="ywa-gallery-grid">
            {[f1, f2, f3, f4, f5, f6, f7, f8, f9, f10].map((img, i) => (
              <div key={i} className="ywa-gallery-item reveal" style={{ '--i': i }}>
                <img src={img} alt={`Buraq Flower Exports — flower ${i + 1}`} className="ywa-gallery-img" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4b. WHO WE ARE */}
      {!filter && !search && (
        <section className="ywa-who">
          <div className="ywa-who-left reveal">
            <h2 className="ywa-who-heading">Who We Are</h2>
          </div>
          <ul className="ywa-who-list">
            {[
              '120+ premium flower varieties from Hosur farms',
              'Exporting to 45+ countries worldwide',
              'APEDA Certified & ISO 9001:2015 Compliant',
              'Same-day dispatch with cold chain logistics',
            ].map((item, i) => (
              <li key={i} className="reveal">
                <svg className="who-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8960C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4b. HOW IT WORKS */}
      {!filter && !search && (
        <section className="ywa-process">
          <div className="ywa-process-header reveal">
            <p className="ywa-section-label">The Process</p>
            <span className="ywa-section-flower">✨</span>
            <div className="ywa-section-decorated">
              <h2 className="ywa-process-title">How It Works</h2>
            </div>
            <div className="ywa-process-line" />
          </div>
          <div className="ywa-process-steps">
            {[
              { n:'01', title:'Browse & Choose', desc:'Explore our range of fresh cut flowers and green leaves.' },
              { n:'02', title:'Place Your Order', desc:'Quick checkout with secure Razorpay or Cash on Delivery.' },
              { n:'03', title:'We Harvest & Pack', desc:'Flowers harvested at peak freshness and packed in eco-friendly boxes.' },
              { n:'04', title:'Fast Delivery', desc:'Dispatched via air cargo or local delivery — fresh to your door.' },
            ].map((s, i) => (
              <div key={s.n} className="ywa-process-step reveal" style={{'--i': i}}>
                <span className="ywa-process-bg-num">{s.n}</span>
                <span className="ywa-process-num">{s.n}</span>
                <h4 className="ywa-process-step-title">{s.title}</h4>
                <p className="ywa-process-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. FEATURES STRIP */}
      {!filter && !search && (
        <section className="ywa-features">
          <div className="ywa-features-grid">
            <div className="ywa-feature-item reveal">
              <div className="ywa-feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h4 className="ywa-feature-title">100% Fresh Guarantee</h4>
              <p className="ywa-feature-desc">Harvested and packed within hours of dispatch</p>
            </div>
            <div className="ywa-feature-item reveal">
              <div className="ywa-feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h4 className="ywa-feature-title">Same-Day Dispatch</h4>
              <p className="ywa-feature-desc">Order before 2 PM for same-day dispatch</p>
            </div>
            <div className="ywa-feature-item reveal">
              <div className="ywa-feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <h4 className="ywa-feature-title">Sustainably Grown</h4>
              <p className="ywa-feature-desc">Eco-friendly farming from Hosur's finest farms</p>
            </div>
            <div className="ywa-feature-item reveal">
              <div className="ywa-feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <h4 className="ywa-feature-title">Global Reach</h4>
              <p className="ywa-feature-desc">Exporting to Australia, Singapore, Malaysia & more</p>
            </div>
          </div>
        </section>
      )}

      {/* 6. BOTTOM CTA */}
      {!filter && !search && (
        <section className="ywa-cta">
          <p className="ywa-section-label reveal">START SHOPPING</p>
          <h2 className="ywa-cta-heading reveal">
            <em>Premium blooms, delivered worldwide</em>
          </h2>
          <div className="ywa-cta-line reveal" />
          <p className="ywa-cta-sub reveal">
            Export-quality flowers at honest prices — sourced from Hosur and delivered fresh across India and the globe.
          </p>
          <a href="#collections" className="ywa-btn-dark ywa-cta-btn reveal">EXPLORE COLLECTIONS</a>
        </section>
      )}

      {/* 6b. CUSTOMER REVIEWS */}
      {!filter && !search && <ReviewsSection />}

      {/* 6d. NEWSLETTER */}
      {!filter && !search && <NewsletterSection />}

      {/* 7. FOOTER */}
      {!filter && !search && (
        <footer id="contact-section" className="ywa-footer">
          <div className="ywa-footer-inner">

            <div className="ywa-footer-col">
              <h2 className="ywa-footer-logo">Buraq Flower Exports</h2>
              <p className="ywa-footer-tagline">
                Premium roses & blooms from Hosur to the world. Sustainably grown, expertly packed, delivered fresh.
              </p>
              {/* Social media links — coming soon
              <div className="ywa-footer-socials">
                <a href="/" className="ywa-footer-social">f</a>
                <a href="/" className="ywa-footer-social">t</a>
                <a href="/" className="ywa-footer-social">in</a>
                <a href="/" className="ywa-footer-social">ig</a>
              </div>
              */}
            </div>

            <div className="ywa-footer-col">
              <h4 className="ywa-footer-col-title">WORKING HOURS</h4>
              <p className="ywa-footer-text">Mon – Sat: 9:00 AM – 6:30 PM</p>
              <p className="ywa-footer-text">Sunday: Closed</p>
            </div>

            <div className="ywa-footer-col">
              <h4 className="ywa-footer-col-title">WHERE TO FIND US</h4>
              <p className="ywa-footer-text">Flat-138, Thotagari road</p>
              <p className="ywa-footer-text">Goldan City, Hosur</p>
              <p className="ywa-footer-text">Tamil Nadu – 635109</p>
              <p className="ywa-footer-text">+91 9092849130</p>
              <p className="ywa-footer-text">anees2785@gmail.com</p>
            </div>

            <div className="ywa-footer-col">
              <h4 className="ywa-footer-col-title">QUICK LINKS</h4>
              <Link to="/" className="ywa-footer-link">Home</Link>
              <Link to="/" className="ywa-footer-link">Shop</Link>
              <Link to="/about" className="ywa-footer-link">About Us</Link>
              <Link to="/contact" className="ywa-footer-link">Contact</Link>
              <Link to="/orders" className="ywa-footer-link">My Orders</Link>
            </div>

          </div>
          <div className="ywa-footer-bottom">
            <p>© {new Date().getFullYear()} Buraq Flower Exports. All Rights Reserved.</p>
            <button className="ywa-footer-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
              TOP
            </button>
          </div>
        </footer>
      )}

    </div>
  );
};

export default Home;
