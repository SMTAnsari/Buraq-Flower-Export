import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { WishlistContext } from '../context/WishlistContext';
import NotificationBell from './NotificationBell';
import useDebounce from '../hooks/useDebounce';
import api from '../services/api';
import logoImg from '../assets/logo.png';
import './Navbar.css';

const CATEGORIES = [
  { label: 'Home', value: '' },
];

const Navbar = () => {
  const { user, logout }   = useContext(AuthContext);
  const { cart }           = useContext(CartContext);
  const { wishlist }       = useContext(WishlistContext);
  const navigate           = useNavigate();
  const location           = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading,  setSugLoading]  = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [cartBounce,  setCartBounce]  = useState(false);
  const [visible,     setVisible]     = useState(true);
  const [lastY,       setLastY]       = useState(0);
  const [scrolled,    setScrolled]    = useState(false);
  const prevCartLen  = useRef(cart.length);
  const searchRef    = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 280);

  /* scroll hide/show + blur */
  useEffect(() => {
    const fn = () => {
      const y = window.scrollY;
      setVisible(y <= 60 || y < lastY);
      setScrolled(y > 60);
      setLastY(y);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [lastY]);

  /* cart bounce */
  useEffect(() => {
    const newLen = cart.reduce((t, i) => t + i.qty, 0);
    if (newLen > prevCartLen.current) {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 600);
    }
    prevCartLen.current = newLen;
  }, [cart]);

  const fetchSuggestions = useCallback(async (q) => {
    setSugLoading(true);
    try {
      const res = await api.get(`/products?search=${encodeURIComponent(q)}&limit=6`);
      setSuggestions(res.data.products || res.data || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSugLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedSearch.trim().length >= 2) fetchSuggestions(debouncedSearch);
    else setSuggestions([]);
  }, [debouncedSearch, fetchSuggestions]);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/?search=${searchQuery}`);
    setSearchQuery('');
    setSuggestions([]);
    setSearchOpen(false);
    setMenuOpen(false);
  };

  const handleSuggestionClick = (name) => {
    navigate(`/?search=${encodeURIComponent(name)}`);
    setSearchQuery('');
    setSuggestions([]);
    setSearchOpen(false);
  };

  const totalItems    = cart.reduce((t, i) => t + i.qty, 0);
  const totalWishlist = wishlist ? wishlist.length : 0;

  const searchParams = new URLSearchParams(location.search);
  const activeCategory = searchParams.get('category') || '';

  const handleCategory = (value) => {
    navigate(value ? `/?category=${value}` : '/');
    setMenuOpen(false);
  };

  return (
    <>
      <header
        className={`ywa-header${scrolled ? ' ywa-header--scrolled' : ''}`}
        style={{
          transform:  visible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="ywa-row1">
          <div className="ywa-row1-inner">

            {/* Logo */}
            <Link to="/" className="ywa-logo">
              <img src={logoImg} alt="Buraq Flower Exports" className="ywa-logo-img" />
            </Link>

            {/* Center nav — category filters */}
            <nav className="ywa-nav">
              {CATEGORIES.map(({ label, value }) => (
                <button
                  key={value}
                  className={`ywa-nav-cat${activeCategory === value ? ' active' : ''}`}
                  onClick={() => handleCategory(value)}
                >
                  {label.toUpperCase()}
                </button>
              ))}
              <button
                className="ywa-nav-cat"
                onClick={() => {
                  setMenuOpen(false);
                  if (location.pathname === '/') {
                    document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    navigate('/#about-section');
                  }
                }}
              >
                ABOUT
              </button>
              <button
                className="ywa-nav-cat"
                onClick={() => {
                  if (location.pathname === '/') {
                    document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    navigate('/');
                    setTimeout(() => document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' }), 300);
                  }
                }}
              >
                PRODUCT
              </button>
              <button
                className="ywa-nav-cat"
                onClick={() => {
                  if (location.pathname === '/') {
                    document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    navigate('/contact');
                  }
                }}
              >
                CONTACT
              </button>
              <button
                className="ywa-nav-cat"
                onClick={() => {
                  if (location.pathname === '/') {
                    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    navigate('/');
                    setTimeout(() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' }), 300);
                  }
                }}
              >
                REVIEW
              </button>
            </nav>

            {/* Right actions */}
            <div className="ywa-right">
              {user && <span className="ywa-greeting">Hello, {user.name}</span>}

              {!user ? (
                <>
                  <Link to="/login"    className="ywa-text-link">SIGN IN</Link>
                  <Link to="/register" className="ywa-contact-btn">REGISTER</Link>
                </>
              ) : (
                <>
                  {user.role === 'admin'  && <Link to="/admin"  className="ywa-text-link">ADMIN</Link>}
                  {user.role === 'seller' && <Link to="/seller" className="ywa-text-link">SELLER</Link>}
                  <NotificationBell />
                  <button onClick={handleLogout} className="ywa-text-link">SIGN OUT</button>
                </>
              )}

              <button className="ywa-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>

              {(!user || user.role === 'user') && (
                <>
                  <Link to="/wishlist" className="ywa-icon-btn ywa-icon-rel">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {totalWishlist > 0 && <span className="ywa-badge">{totalWishlist}</span>}
                  </Link>

                  <Link to="/orders" className="ywa-icon-btn ywa-orders-btn" aria-label="My Orders">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                      <rect x="9" y="3" width="6" height="4" rx="1"/>
                      <line x1="9" y1="12" x2="15" y2="12"/>
                      <line x1="9" y1="16" x2="13" y2="16"/>
                    </svg>
                    <span className="ywa-orders-label">MY ORDERS</span>
                  </Link>

                  <Link to="/cart" className={`ywa-icon-btn ywa-icon-rel ${cartBounce ? 'ywa-cart-bounce' : ''}`}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    {totalItems > 0 && <span className="ywa-badge">{totalItems}</span>}
                  </Link>
                </>
              )}

              <button className="ywa-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
                <span className={`ywa-ham ${menuOpen ? 'open' : ''}`}/>
                <span className={`ywa-ham ${menuOpen ? 'open' : ''}`}/>
                <span className={`ywa-ham ${menuOpen ? 'open' : ''}`}/>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="ywa-mobile-menu">
            <form className="ywa-mobile-search" onSubmit={handleSearch}>
              <input type="text" placeholder="Search flowers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="ywa-mobile-input" />
              <button type="submit" className="ywa-mobile-search-btn">GO</button>
            </form>

            {CATEGORIES.map(({ label, value }) => (
              <button
                key={value}
                className={`ywa-mobile-link${activeCategory === value ? ' active' : ''}`}
                onClick={() => handleCategory(value)}
              >
                {label.toUpperCase()}
              </button>
            ))}
            <button
              className="ywa-mobile-link"
              onClick={() => {
                setMenuOpen(false);
                if (location.pathname === '/') {
                  document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/#about-section');
                }
              }}
            >
              ABOUT
            </button>
            <button
              className="ywa-mobile-link"
              onClick={() => { setMenuOpen(false); navigate('/contact'); }}
            >
              CONTACT
            </button>

            {(!user || user.role === 'user') && (
              <>
                <Link to="/wishlist" className="ywa-mobile-link" onClick={() => setMenuOpen(false)}>
                  WISHLIST {totalWishlist > 0 && `(${totalWishlist})`}
                </Link>
                <Link to="/orders" className="ywa-mobile-link" onClick={() => setMenuOpen(false)}>
                  MY ORDERS
                </Link>
                <Link to="/cart" className="ywa-mobile-link" onClick={() => setMenuOpen(false)}>
                  CART {totalItems > 0 && `(${totalItems})`}
                </Link>
              </>
            )}

            {!user ? (
              <>
                <Link to="/login"    className="ywa-mobile-link" onClick={() => setMenuOpen(false)}>SIGN IN</Link>
                <Link to="/register" className="ywa-mobile-link" onClick={() => setMenuOpen(false)}>REGISTER</Link>
              </>
            ) : (
              <button className="ywa-mobile-link ywa-mobile-logout" onClick={() => { handleLogout(); setMenuOpen(false); }}>
                SIGN OUT
              </button>
            )}
          </div>
        )}
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div className="ywa-search-overlay" onClick={() => { setSearchOpen(false); setSuggestions([]); }}>
          <div className="ywa-search-box" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearch}>
              <input
                ref={searchRef}
                type="text"
                className="ywa-search-input"
                placeholder="Search flowers, bouquets, plants..."
                value={searchQuery}
                onChange={handleSearchChange}
                autoComplete="off"
              />
              <button type="submit" className="ywa-search-btn">SEARCH</button>
            </form>

            {/* Autocomplete suggestions */}
            {(suggestions.length > 0 || sugLoading) && (
              <div className="ywa-suggestions">
                {sugLoading && <div className="ywa-sug-loading">Searching…</div>}
                {suggestions.map(s => (
                  <button
                    key={s._id}
                    className="ywa-sug-item"
                    onClick={() => handleSuggestionClick(s.name)}
                    type="button"
                  >
                    <img
                      src={s.image}
                      alt={s.name}
                      className="ywa-sug-img"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div className="ywa-sug-info">
                      <span className="ywa-sug-name">{s.name}</span>
                      <span className="ywa-sug-cat">{s.category}</span>
                    </div>
                    <span className="ywa-sug-price">₹{s.price?.toLocaleString('en-IN')}</span>
                  </button>
                ))}
              </div>
            )}

            <button className="ywa-search-close" onClick={() => { setSearchOpen(false); setSuggestions([]); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
