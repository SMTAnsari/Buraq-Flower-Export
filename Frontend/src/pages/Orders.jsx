import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import './Orders.css';

const STATUS_COLORS = {
  pending:            { bg: '#FAF7F2', color: '#8A8A8A',  border: '#E0D8CC' },
  processing:         { bg: '#FAF7F2', color: '#B8960C',  border: '#E0D8CC' },
  shipped:            { bg: '#F0F7FF', color: '#1A5A9A',  border: '#C8DDF5' },
  'out for delivery': { bg: '#FFF4E6', color: '#C05A00',  border: '#FFD8A8' },
  delivered:          { bg: '#F0FAF4', color: '#1A7A4A',  border: '#B8E0C8' },
  cancelled:          { bg: '#FDF2F2', color: '#C0392B',  border: '#F5C8C8' },
  default:            { bg: '#FAF7F2', color: '#8A8A8A',  border: '#E0D8CC' },
};

const DEFAULT_STAGES = [
  { stage: 'Order Placed',     completed: false, timestamp: null },
  { stage: 'Order Confirmed',  completed: false, timestamp: null },
  { stage: 'Being Prepared',   completed: false, timestamp: null },
  { stage: 'Out for Delivery', completed: false, timestamp: null },
  { stage: 'Delivered',        completed: false, timestamp: null },
];

const StageIcon = ({ stage }) => {
  const icons = {
    'Order Placed':     <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
    'Order Confirmed':  <path d="M5 13l4 4L19 7" />,
    'Being Prepared':   <><path d="M12 6V12L16 14" /><circle cx="12" cy="12" r="9" /></>,
    'Out for Delivery': <><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
    'Delivered':        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#C0B8B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[stage] || <circle cx="12" cy="12" r="9" />}
    </svg>
  );
};

// Stage indices: 0=Order Placed, 1=Order Confirmed, 2=Being Prepared, 3=Out for Delivery, 4=Delivered
function inferCompleted(status, idx) {
  const s = (status || '').toLowerCase().trim();
  const map = {
    'pending':            0,
    'processing':         1,
    'confirmed':          1,
    'being prepared':     2,
    'prepared':           2,
    'shipped':            3,
    'out for delivery':   3,
    'delivered':          4,
    'cancelled':          -1,
  };
  const stageIdx = map[s] ?? 0;
  if (stageIdx === -1) return false;
  return idx <= stageIdx;
}

const OrderTracker = ({ order }) => {
  // Always infer from status — DB trackingStages are not reliably updated
  const stages = DEFAULT_STAGES.map((s, i) => ({
    ...s,
    completed: inferCompleted(order.status, i),
    timestamp: i === 0 ? order.createdAt : null,
  }));

  const lastCompletedIdx = stages.reduce((last, s, i) => s.completed ? i : last, -1);
  const isFullyDelivered = lastCompletedIdx === stages.length - 1;

  return (
    <div className="ord-tracker">
      <div className="ord-tracker-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8960C" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span className="ord-tracker-title">Track Order</span>
      </div>

      <div className="ord-tracker-bar">
        {stages.map((s, i) => {
          const isCompleted = s.completed;
          const isCurrent   = !isFullyDelivered && i === lastCompletedIdx;
          const isLast      = i === stages.length - 1;

          return (
            <React.Fragment key={s.stage}>
              <div className="ord-tracker-step">
                <div className={`ord-tracker-circle ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                  {isCompleted
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    : <StageIcon stage={s.stage} />
                  }
                </div>
                {isCurrent && <span className="ord-tracker-pulse" />}
                <span className={`ord-tracker-label ${isCompleted ? 'done' : ''} ${isCurrent ? 'active' : ''}`}>
                  {s.stage}
                </span>
                {s.timestamp && (
                  <span className="ord-tracker-time">
                    {new Date(s.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              {!isLast && (
                <div className={`ord-tracker-line ${isCompleted ? 'done' : ''}`}>
                  <div className="ord-tracker-line-fill" style={isCompleted ? { animationDelay: `${0.1 + i * 0.15}s` } : {}} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loyalty, setLoyalty]   = useState(0);
  const location = useLocation();

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      const [ordersRes, analyticsRes, loyaltyRes] = await Promise.allSettled([
        api.get('/orders/my-orders'),
        api.get('/auth/analytics'),
        api.get('/auth/loyalty'),
      ]);
      if (ordersRes.status === 'fulfilled') {
        const data = ordersRes.value.data;
        setOrders(Array.isArray(data) ? data : (data.orders || []));
      }
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (loyaltyRes.status === 'fulfilled') setLoyalty(loyaltyRes.value.data.points || 0);
    } catch (err) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleCancel = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(orderId);
    try {
      await api.put(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(null);
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    setDownloading(orderId);
    try {
      const token   = localStorage.getItem('token');
      const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001/api';
      const res = await fetch(
        `${baseURL}/orders/${orderId}/invoice`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to download invoice');
      }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `invoice-${orderId.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded!');
    } catch (err) {
      toast.error(err.message || 'Failed to download invoice');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return (
    <div className="ord-loading">
      <div className="ord-spinner" />
      <p>Loading your orders…</p>
    </div>
  );

  return (
    <div className="ord-page">
      <div className="ord-container">

        <div className="ord-page-header">
          <p className="ord-label">Account</p>
          <h1 className="ord-title">My Orders</h1>
          <div className="ord-title-line" />
        </div>

        {/* Loyalty Points + Analytics */}
        {(loyalty > 0 || analytics) && (
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:24 }}>
            {loyalty > 0 && (
              <div style={{ background:'linear-gradient(135deg,#1A1A1A,#2C2C2C)', borderRadius:10, padding:'16px 24px', color:'#fff', minWidth:160 }}>
                <p style={{ fontFamily:'Jost,sans-serif', fontSize:10, letterSpacing:'0.15em', color:'#B8960C', textTransform:'uppercase', margin:'0 0 4px' }}>Loyalty Points</p>
                <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:32, fontWeight:600, margin:0, color:'#B8960C' }}>{loyalty.toLocaleString('en-IN')}</p>
                <p style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'rgba(255,255,255,0.5)', margin:'4px 0 0' }}>1 pt = ₹1 discount</p>
              </div>
            )}
            {analytics && (
              <>
                <div style={{ background:'#fff', border:'1px solid #E0D8CC', borderRadius:10, padding:'16px 24px', minWidth:140 }}>
                  <p style={{ fontFamily:'Jost,sans-serif', fontSize:10, letterSpacing:'0.15em', color:'#8A8A8A', textTransform:'uppercase', margin:'0 0 4px' }}>Total Spent</p>
                  <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24, fontWeight:600, color:'#B8960C', margin:0 }}>₹{analytics.totalSpent?.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ background:'#fff', border:'1px solid #E0D8CC', borderRadius:10, padding:'16px 24px', minWidth:140 }}>
                  <p style={{ fontFamily:'Jost,sans-serif', fontSize:10, letterSpacing:'0.15em', color:'#8A8A8A', textTransform:'uppercase', margin:'0 0 4px' }}>Total Orders</p>
                  <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24, fontWeight:600, color:'#1A1A1A', margin:0 }}>{analytics.totalOrders}</p>
                </div>
                {analytics.topProduct && (
                  <div style={{ background:'#fff', border:'1px solid #E0D8CC', borderRadius:10, padding:'16px 24px', minWidth:160 }}>
                    <p style={{ fontFamily:'Jost,sans-serif', fontSize:10, letterSpacing:'0.15em', color:'#8A8A8A', textTransform:'uppercase', margin:'0 0 4px' }}>Favourite Product</p>
                    <p style={{ fontFamily:'Jost,sans-serif', fontSize:13, fontWeight:600, color:'#1A1A1A', margin:0 }}>{analytics.topProduct}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {location.state?.message && (
          <div className="ord-success-banner">{location.state.message}</div>
        )}

        {orders.length === 0 ? (
          <div className="ord-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E0D8CC" strokeWidth="1.2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <h3 className="ord-empty-title">No orders yet</h3>
            <p className="ord-empty-sub">When you place an order, it will appear here.</p>
            <Link to="/" className="ord-shop-btn">Start Shopping</Link>
          </div>
        ) : (
          <div className="ord-list">
            {orders.map((order) => {
              const statusKey = (order.status || 'processing').toLowerCase();
              const style     = STATUS_COLORS[statusKey] || STATUS_COLORS.default;
              const isOpen    = expanded === order._id;
              const isPending   = ['pending', 'processing', 'shipped'].includes(statusKey);
              const isDelivered = statusKey === 'delivered';
              const isCOD = (order.paymentMethod || '').toLowerCase().includes('cash') || (order.paymentMethod || '').toLowerCase() === 'cod';
              const canDownloadInvoice = isDelivered && (isCOD || order.isPaid);

              return (
                <div key={order._id} className="ord-card">
                  <button
                    className="ord-card-header"
                    onClick={() => setExpanded(isOpen ? null : order._id)}
                    aria-expanded={isOpen}
                  >
                    <div className="ord-card-meta">
                      <div className="ord-card-id">
                        <span className="ord-meta-label">Order</span>
                        <span className="ord-meta-value">#{order._id.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="ord-card-date">
                        <span className="ord-meta-label">Placed</span>
                        <span className="ord-meta-value">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="ord-card-items">
                        <span className="ord-meta-label">Items</span>
                        <span className="ord-meta-value">{order.orderItems.length}</span>
                      </div>
                      <div className="ord-card-total">
                        <span className="ord-meta-label">Total</span>
                        <span className="ord-meta-value ord-price">
                          ₹{(order.totalAmount ?? order.totalPrice)?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <div className="ord-card-right">
                      <span className="ord-status-badge"
                        style={{ background: style.bg, color: style.color, borderColor: style.border }}>
                        {order.status || 'Processing'}
                      </span>
                      <svg className={`ord-chevron ${isOpen ? 'open' : ''}`}
                        width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="1.8">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="ord-card-body">

                      {/* Items */}
                      <div className="ord-items">
                        {order.orderItems.map((item, idx) => (
                          <div key={idx} className="ord-item">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="ord-item-img"
                                onError={e => { e.target.style.display = 'none'; }} />
                            )}
                            <div className="ord-item-info">
                              <p className="ord-item-name">{item.name}</p>
                              <p className="ord-item-qty">
                                {item.selectedOption
                                  ? `${item.selectedOption.label} × ${item.quantity ?? item.qty}`
                                  : `Qty: ${item.quantity ?? item.qty}`
                                }
                              </p>
                            </div>
                            <p className="ord-item-price">
                              ₹{(item.price * (item.quantity ?? item.qty)).toLocaleString('en-IN')}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Tracker — hide for cancelled */}
                      {(order.status || '').toLowerCase() !== 'cancelled' && (
                        <OrderTracker order={order} />
                      )}

                      {/* Footer */}
                      <div className="ord-card-footer">
                        <div className="ord-shipping-info">
                          <span className="ord-meta-label">Shipping to</span>
                          <p className="ord-shipping-addr">
                            {order.address ||
                              `${order.shippingAddress?.fullName} — ${order.shippingAddress?.address}, ${order.shippingAddress?.city}`}
                          </p>
                          <p className="ord-shipping-phone">{order.shippingAddress?.phone}</p>
                        </div>
                        <div className="ord-payment-info">
                          <span className="ord-meta-label">Payment</span>
                          <p className="ord-payment-method">{order.paymentMethod || 'COD'}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="ord-actions">
                          {isPending && (
                            <button
                              className="ord-btn-cancel"
                              onClick={() => handleCancel(order._id)}
                              disabled={cancelling === order._id}
                            >
                              {cancelling === order._id ? 'Cancelling…' : 'Cancel Order'}
                            </button>
                          )}

                          {/* Download Invoice — only for delivered + paid */}
                          {canDownloadInvoice && (
                            <button
                              className="ord-btn-invoice"
                              onClick={() => handleDownloadInvoice(order._id)}
                              disabled={downloading === order._id}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              {downloading === order._id ? 'Downloading…' : 'Download Invoice'}
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
