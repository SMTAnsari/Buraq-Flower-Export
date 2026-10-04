import React, { useState } from 'react';
import './ProductDetailModal.css';

const ProductDetailModal = ({ product, onClose, onAddToCart, onBuyNow }) => {
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const handleIncrease = () => {
    if (quantity < product.stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        
        <div className="modal-image-side">
          <img 
            src={product.image} 
            alt={product.name} 
            onError={(e) => { 
              e.target.onerror = null; 
              e.target.src="https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=500&q=80"
            }} 
          />
        </div>

        <div className="modal-info-side">
          <div className="modal-header">
            <div className="modal-category">{product.category}</div>
            <h2 className="modal-title">{product.name}</h2>
          </div>
          
          <div className="modal-price-stock" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span className="modal-price" style={{ margin: 0 }}>₹{product.price}</span>
            <span style={{ fontWeight: '600', color: product.stock > 5 ? '#10B981' : product.stock > 0 ? '#F59E0B' : '#EF4444' }}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
            </span>
          </div>

          <div className="product-description-section" style={{ marginBottom: '1.5rem' }}>
            <p className="modal-description" style={{ margin: 0 }}>{product.description}</p>
          </div>

          {product.stock > 0 && (
            <div className="qty-selector">
              <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Quantity:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="qty-btn" onClick={handleDecrease} disabled={quantity <= 1}>-</button>
                <span style={{ fontSize: '1.25rem', fontWeight: '600', width: '20px', textAlign: 'center' }}>{quantity}</span>
                <button className="qty-btn" onClick={handleIncrease} disabled={quantity >= product.stock}>+</button>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <div className="modal-main-actions">
              <button 
                className="buy-now-btn" 
                onClick={() => onBuyNow(quantity)}
                disabled={product.stock === 0}
                style={{ opacity: product.stock === 0 ? 0.5 : 1, cursor: product.stock === 0 ? 'not-allowed' : 'pointer' }}
              >
                Buy Now
              </button>
              <button 
                className="buy-now-btn" 
                onClick={() => onAddToCart(quantity)}
                disabled={product.stock === 0}
                style={{ 
                  background: 'transparent', 
                  color: 'var(--text-main)', 
                  border: '2px solid var(--text-main)',
                  opacity: product.stock === 0 ? 0.5 : 1, 
                  cursor: product.stock === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Add to Cart
              </button>
            </div>
          </div>

          <div className="product-highlights" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🚚</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Free Shipping</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✨</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Freshness Guarantee</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
