import './App.css';
import React, { useContext, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import BackToTop from './components/BackToTop';
import ScrollProgress from './components/ScrollProgress';
import PageLoader from './components/PageLoader';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Cart from './pages/Cart';
import Contact from './pages/Contact';

// ── Lazy-loaded heavy pages ──────────────────────────────────────────────
const Checkout      = lazy(() => import('./pages/Checkout'));
const Orders        = lazy(() => import('./pages/Orders'));
const Wishlist      = lazy(() => import('./pages/Wishlist'));
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const OrderSuccess  = lazy(() => import('./pages/OrderSuccess'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));

const FullPageLoader = () => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F5F0E8', gap:'16px' }}>
    <div className="spinner" />
    <p style={{ fontFamily:"'Great Vibes',cursive", fontSize:'28px', color:'#1A1A1A', margin:0 }}>Buraq Flower Exports</p>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <FullPageLoader />;
  return user ? children : <Navigate to="/login" />;
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

// ── About page (inline — lightweight, no separate file needed) ───────────
const About = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', background: '#FAF7F2' }}>
    <div style={{ maxWidth: 640, textAlign: 'center' }}>
      <p style={{ fontFamily: 'Jost,sans-serif', letterSpacing: '0.15em', fontSize: 11, color: '#B8960C', textTransform: 'uppercase', marginBottom: 12 }}>About Us</p>
      <h1 style={{ fontFamily: "'Great Vibes',cursive", fontSize: 48, color: '#1A1A1A', marginBottom: 16 }}>Buraq Flower Exports</h1>
      <p style={{ fontFamily: 'Jost,sans-serif', color: '#4A4A4A', lineHeight: 1.8, marginBottom: 12 }}>
        Rooted in the vibrant soil of Hosur, Tamil Nadu, Buraq Flower Exports specialises in cultivating and exporting premium flowers and herbs to international markets with unmatched quality and dedication.
      </p>
      <p style={{ fontFamily: 'Jost,sans-serif', color: '#4A4A4A', lineHeight: 1.8, marginBottom: 24 }}>
        From passionate reds to delicate pastels — our roses, carnations, gerberas, and tulips are harvested at peak freshness and dispatched worldwide within hours.
      </p>
      <Link to="/" style={{ fontFamily: 'Jost,sans-serif', letterSpacing: '0.15em', fontSize: 12, color: '#1A1A1A', textDecoration: 'none', borderBottom: '1px solid #B8960C', paddingBottom: 2 }}>
        ← BACK TO HOME
      </Link>
    </div>
  </div>
);

const SiteFooter = () => {
  const location = useLocation();
  const noFooterPaths = ['/'];
  const isProductDetail = location.pathname.startsWith('/product/');
  if (noFooterPaths.includes(location.pathname) || isProductDetail) return null;

  return (
  <footer className="site-footer">
    <div className="sf-inner">
      <div className="sf-col">
        <h2 className="sf-logo">Buraq Flower Exports</h2>
        <p className="sf-tagline">Premium roses & blooms from Hosur to the world. Sustainably grown, expertly packed, delivered fresh.</p>
      </div>
      <div className="sf-col">
        <h4 className="sf-col-title">Working Hours</h4>
        <p className="sf-text">Mon – Sat: 9:00 AM – 6:30 PM</p>
        <p className="sf-text">Sunday: Closed</p>
      </div>
      <div className="sf-col">
        <h4 className="sf-col-title">Where to Find Us</h4>
        <p className="sf-text">Flat-138, Thotagari road</p>
        <p className="sf-text">Goldan City, Hosur</p>
        <p className="sf-text">Tamil Nadu – 635109</p>
        <p className="sf-text">+91 9092849130</p>
      </div>
      <div className="sf-col">
        <h4 className="sf-col-title">Quick Links</h4>
        <Link to="/" className="sf-link">Home</Link>
        <Link to="/" className="sf-link">Shop</Link>
        <Link to="/about" className="sf-link">About Us</Link>
        <Link to="/contact" className="sf-link">Contact</Link>
        <Link to="/wishlist" className="sf-link">Wishlist</Link>
        <Link to="/orders" className="sf-link">My Orders</Link>
      </div>
    </div>
    <div className="sf-bottom">
      <p>© {new Date().getFullYear()} Buraq Flower Exports. All Rights Reserved.</p>
    </div>
  </footer>
  );
};

const App = () => {
  const [showLoader] = useState(() => !sessionStorage.getItem('fh_loaded'));
  if (showLoader) sessionStorage.setItem('fh_loaded', '1');

  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <div className="flex flex-col min-h-screen font-sans">
                {showLoader && <PageLoader />}
                <ScrollProgress />
                <Toaster position="bottom-right" />
                <Navbar />
                <BackToTop />
                <main className="flex-grow">
                  <ErrorBoundary>
                  <Suspense fallback={<FullPageLoader />}>
                    <Routes>
                      <Route path="/"              element={<Home />} />
                      <Route path="/product/:id"   element={<ProductDetail />} />
                      <Route path="/login"         element={<Auth />} />
                      <Route path="/register"      element={<Auth />} />
                      <Route path="/cart"          element={<Cart />} />
                      <Route path="/wishlist"      element={<Wishlist />} />
                      <Route path="/contact"       element={<Contact />} />
                      <Route path="/about"         element={<About />} />
                      {/* /products redirects to home shop section */}
                      <Route path="/products"      element={<Navigate to="/" replace />} />
                      <Route path="/checkout"      element={<PrivateRoute><Checkout /></PrivateRoute>} />
                      <Route path="/orders"        element={<PrivateRoute><Orders /></PrivateRoute>} />
                      <Route path="/my-orders"     element={<Navigate to="/orders" replace />} />
                      <Route path="/order-success" element={<PrivateRoute><OrderSuccess /></PrivateRoute>} />
                      <Route path="/admin"         element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>} />
                      <Route path="/seller"        element={<RoleRoute allowedRoles={['seller']}><SellerDashboard /></RoleRoute>} />
                      <Route path="*"              element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                  </ErrorBoundary>
                </main>
                <SiteFooter />
              </div>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
};

export default App;
