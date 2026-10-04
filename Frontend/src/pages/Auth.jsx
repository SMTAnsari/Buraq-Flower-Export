import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const Auth = () => {
  const { login, register, googleLogin, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsLogin(location.pathname !== '/register');
  }, [location.pathname]);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!isLogin && password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back!');
        navigate('/');
      } else {
        await register(name, email, password, role, businessName, businessAddress);
        if (role === 'seller') {
          toast.success('Registration successful! Please wait for admin approval before logging in.');
          setIsLogin(true);
          setLoading(false);
          return;
        }
        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (err) {
      // Backend returns error in err.response.data.message (axios error shape)
      const msg = err.response?.data?.message || err.message || 'Authentication failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await googleLogin();
      toast.success('Successfully logged in with Google!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* Left: floral image panel */}
      <div className="auth-image-panel">
        <span className="auth-panel-brand">Buraq Flower Exports</span>
        <p className="auth-panel-tagline">Premium Export Quality Blooms</p>
        <p className="auth-panel-quote">
          Every bloom tells a story. Let us help you tell yours.
        </p>
      </div>

      {/* Right: form */}
      <div className="auth-card-wrapper">
        <div className="auth-card">

          {/* Logo */}
          <span className="auth-logo">Buraq Flower Exports</span>

          {/* Heading */}
          <h2 className="auth-title">
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in to your account' : 'Join the Buraq Flower Exports family'}
          </p>

          {/* Toggle */}
          <div className="auth-toggle-row">
            <button
              type="button"
              className={`auth-toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>

            {!isLogin && (
              <div className="auth-field">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="auth-input"
                  placeholder="e.g. John Doe"
                />
              </div>
            )}

            <div className="auth-field">
              <label>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="auth-input"
                placeholder="you@example.com"
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="auth-input"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="auth-field">
                <label>Join As</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="auth-input"
                >
                  <option value="user">Customer</option>
                  <option value="seller">Seller (Requires Approval)</option>
                </select>
              </div>
            )}

            {!isLogin && role === 'seller' && (
              <>
                <div className="auth-field">
                  <label>Business Name</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    className="auth-input"
                    placeholder="e.g. Bloom and Petal"
                  />
                </div>
                <div className="auth-field">
                  <label>Business Address</label>
                  <textarea
                    required
                    value={businessAddress}
                    onChange={e => setBusinessAddress(e.target.value)}
                    className="auth-input"
                    placeholder="Full shop address..."
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? 'Processing...' : (isLogin ? 'SIGN IN' : 'CREATE ACCOUNT')}
            </button>



          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
