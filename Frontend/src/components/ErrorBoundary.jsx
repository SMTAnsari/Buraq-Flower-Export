import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production, send to error tracking (e.g. Sentry)
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Jost, sans-serif', padding: '40px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 11, letterSpacing: '0.15em', color: '#B8960C', textTransform: 'uppercase', marginBottom: 12 }}>
            Something went wrong
          </p>
          <h2 style={{ fontSize: 24, color: '#1A1A1A', marginBottom: 12 }}>
            Oops! An unexpected error occurred.
          </h2>
          <p style={{ color: '#8A8A8A', marginBottom: 24, maxWidth: 400 }}>
            Please refresh the page or go back to continue shopping.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: '#1A1A1A', color: '#fff', border: 'none',
              padding: '12px 28px', fontFamily: 'Jost, sans-serif',
              fontSize: 12, letterSpacing: '0.15em', cursor: 'pointer',
            }}
          >
            GO TO HOME
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
