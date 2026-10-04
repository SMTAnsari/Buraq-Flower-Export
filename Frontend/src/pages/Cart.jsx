import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import './Cart.css';

const Cart = () => {
  const { cart, updateQty, removeFromCart, getCartTotal } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/checkout');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="shop-page">
        <div className="empty-message">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E0D8CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '24px', display: 'block', margin: '0 auto 24px' }}>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <h2 className="empty-title">Your Cart is Empty</h2>
          <p className="empty-text">Looks like you haven't added any beautiful flowers yet.</p>
          <Link to="/" className="btn-primary-link">Start Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <div className="shop-container">
        <h1 className="shop-header">Shopping Cart</h1>
        <span className="shop-header-sub">Review your selections</span>
        
        <div className="shop-layout">
          {/* Cart Items */}
          <div className="shop-main">
            <div className="shop-card">
              <ul className="item-list">
                {cart.map((item) => (
                  <li key={item.cartKey || item.product} className="cart-item">
                    <img src={item.image} alt={item.name} className="item-image" />
                    <div className="item-details">
                      <h3 className="item-name">{item.name}</h3>
                      {item.selectedOption && (
                        <p className="item-price" style={{ fontSize: 12, color: '#B8960C' }}>{item.selectedOption.label}</p>
                      )}
                      <p className="item-price">₹{item.price}</p>
                      <p className="item-stock">Available Stock: {item.stock}</p>
                    </div>
                    
                    <div className="item-qty-controls">
                      <button
                        onClick={() => updateQty(item.cartKey || item.product, item.qty - 1)}
                        className="btn-icon"
                        disabled={item.qty <= 1}
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                      </button>
                      <input
                        type="number"
                        className="item-qty"
                        value={item.qty}
                        min={1}
                        max={item.stock}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= item.stock)
                            updateQty(item.cartKey || item.product, val);
                        }}
                        style={{ width: 40, textAlign: 'center', border: 'none', background: 'transparent', fontFamily: 'Jost,sans-serif', fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}
                      />
                      <button
                        onClick={() => updateQty(item.cartKey || item.product, item.qty + 1)}
                        className="btn-icon"
                        disabled={item.qty >= item.stock}
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>
                    
                    <div className="item-total">
                      <p className="item-total-price">₹{item.price * item.qty}</p>
                      <button 
                        onClick={() => removeFromCart(item.cartKey || item.product)}
                        className="btn-remove"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Order Summary */}
          <div className="shop-sidebar">
            <div className="shop-card flex-col" style={{position: 'sticky', top: '6rem'}}>
              <div className="shop-card-content">
                <h2 className="shop-card-header">Order Summary</h2>
                <div className="summary-row">
                  <span>Subtotal ({cart.reduce((a,c) => a+c.qty, 0)} items)</span>
                  <span>₹{getCartTotal()}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  <span className="text-free">Free</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span className="text-total-price">₹{getCartTotal()}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="btn-primary-large"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
