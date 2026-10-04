import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import './OrderSuccess.css';

const OrderSuccess = () => {
  const location = useLocation();
  const orderData = location.state?.orderData;

  if (!orderData) return <Navigate to="/" />;

  return (
    <div className="os-page">
      <div className="os-card">

        {/* Check icon */}
        <div className="os-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="#1A7A4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <p className="os-label">Order Confirmed</p>
        <h1 className="os-title">Thank You for Your Order</h1>
        <div className="os-gold-line" />
        <p className="os-sub">
          Your flowers are being prepared with care. We'll have them delivered fresh to your door.
        </p>

        {/* Shipping details */}
        <div className="os-details">
          <h3 className="os-details-title">Shipping Details</h3>
          <div className="os-details-grid">
            <div className="os-detail-row">
              <span className="os-detail-label">Name</span>
              <span className="os-detail-value">{orderData.shippingAddress.fullName}</span>
            </div>
            <div className="os-detail-row">
              <span className="os-detail-label">Address</span>
              <span className="os-detail-value">{orderData.shippingAddress.address}</span>
            </div>
            <div className="os-detail-row">
              <span className="os-detail-label">City</span>
              <span className="os-detail-value">{orderData.shippingAddress.city} — {orderData.shippingAddress.postalCode}</span>
            </div>
            <div className="os-detail-row">
              <span className="os-detail-label">Phone</span>
              <span className="os-detail-value">{orderData.shippingAddress.phone}</span>
            </div>
            <div className="os-detail-row">
              <span className="os-detail-label">Payment</span>
              <span className="os-detail-value">{orderData.paymentMethod}</span>
            </div>
            <div className="os-detail-row os-total-row">
              <span className="os-detail-label">Order Total</span>
              <span className="os-total-price">₹{orderData.totalPrice?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="os-actions">
          <Link to="/orders" className="os-btn-dark">View My Orders</Link>
          <Link to="/" className="os-btn-outline">Continue Shopping</Link>
          <button
            className="os-btn-whatsapp"
            onClick={() => {
              const orderId = orderData._id?.slice(-8).toUpperCase() || 'ORDER';
              const msg = `🌸 Order Confirmed! #${orderId}%0ATotal: ₹${orderData.totalPrice?.toLocaleString('en-IN')}%0AShipping to: ${orderData.shippingAddress?.fullName}, ${orderData.shippingAddress?.city}%0ATrack your order at: ${window.location.origin}/orders`;
              window.open(`https://wa.me/?text=${msg}`, '_blank');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share on WhatsApp
          </button>
        </div>

      </div>
    </div>
  );
};

export default OrderSuccess;
