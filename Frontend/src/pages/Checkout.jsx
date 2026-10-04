import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './Checkout.css';

/* ── Load Razorpay SDK dynamically ── */
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const EMPTY_FORM = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India' };

const Checkout = () => {
  const { cart, getCartTotal, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const buyNowProduct = location.state?.buyNowProduct ?? null;
  const isBuyNow = buyNowProduct !== null;
  const orderItems = isBuyNow
    ? [{ product: buyNowProduct._id, name: buyNowProduct.name, price: buyNowProduct.price, image: buyNowProduct.image, qty: buyNowProduct.qty || 1, selectedOption: buyNowProduct.selectedOption || null }]
    : cart;

  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM, fullName: user?.name || '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await api.get('/addresses');
      const list = Array.isArray(res.data) ? res.data : [];
      setAddresses(list);
      const def = list.find(a => a.isDefault) || list[0];
      if (def) setSelectedAddressId(def._id);
    } catch {
      setAddresses([]);
    } finally {
      setAddrLoading(false);
    }
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);
  useEffect(() => { if (!isBuyNow && cart.length === 0) navigate('/cart'); }, [cart, navigate, isBuyNow]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/addresses/${editingId}`, formData);
        toast.success('Address updated');
      } else {
        await api.post('/addresses', formData);
        toast.success('Address saved');
      }
      await fetchAddresses();
      setIsEditing(false);
      setEditingId(null);
      setFormData({ ...EMPTY_FORM, fullName: user?.name || '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    }
  };

  const handleEditAddress = (addr) => {
    setFormData({
      fullName: addr.fullName, phone: addr.phone,
      addressLine1: addr.addressLine1, addressLine2: addr.addressLine2 || '',
      city: addr.city, state: addr.state || '', postalCode: addr.postalCode, country: addr.country || 'India',
    });
    setEditingId(addr._id);
    setIsEditing(true);
  };

  const handleDeleteAddress = async (id) => {
    try {
      await api.delete(`/addresses/${id}`);
      toast.success('Address removed');
      await fetchAddresses();
    } catch {
      toast.error('Failed to remove address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.patch(`/addresses/${id}/default`);
      await fetchAddresses();
    } catch {
      toast.error('Failed to set default');
    }
  };

  // Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post('/coupons/validate', { code: couponCode, orderTotal: subtotal });
      setCouponData(res.data);
      toast.success(`Coupon applied! You save ₹${res.data.discount}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
      setCouponData(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal > 499 ? 0 : 49;
  const tax = Math.round(subtotal * 0.05);
  const discount = couponData?.discount || 0;
  const grandTotal = Math.max(0, subtotal + shipping + tax - discount);

  const selectedAddr = addresses.find(a => a._id === selectedAddressId);

  const buildOrderPayload = (addr) => ({
    orderItems: orderItems.map(item => ({
      product: item.product,
      name: item.name,
      price: item.price,
      quantity: item.qty,
      ...(item.selectedOption && { selectedOption: item.selectedOption }),
    })),
    shippingAddress: {
      fullName: addr.fullName, address: addr.addressLine1 + (addr.addressLine2 ? ', ' + addr.addressLine2 : ''),
      city: addr.city, postalCode: addr.postalCode, phone: addr.phone,
    },
    totalPrice: grandTotal,
    paymentMethod,
    couponCode: couponData?.coupon?.code || null,
    deliveryDate: deliveryDate || null,
  });

  const placeCODOrder = async (addr) => {
    const res = await api.post('/orders', buildOrderPayload(addr));
    if (!isBuyNow) clearCart();
    toast.success('Order placed successfully!');
    navigate('/order-success', { state: { orderData: { ...res.data, shippingAddress: buildOrderPayload(addr).shippingAddress, paymentMethod, totalPrice: grandTotal } } });
  };

  const placeRazorpayOrder = async (addr) => {
    const sdkLoaded = await loadRazorpay();
    if (!sdkLoaded) { toast.error('Payment gateway failed to load.'); return; }
    const rzpRes = await api.post('/payments/create-order', { amount: grandTotal, currency: 'INR', receipt: `receipt_${Date.now()}` });
    const rzpOrder = rzpRes.data;
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: rzpOrder.amount, currency: rzpOrder.currency,
      name: 'Buraq Flower Exports', description: 'Order Payment', order_id: rzpOrder.id,
      handler: async (response) => {
        try {
          const orderRes = await api.post('/orders', buildOrderPayload(addr));
          await api.post('/payments/verify', { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, orderId: orderRes.data._id });
          if (!isBuyNow) clearCart();
          toast.success('Payment successful! Order placed.');
          navigate('/order-success', { state: { orderData: { ...orderRes.data, shippingAddress: buildOrderPayload(addr).shippingAddress, paymentMethod, totalPrice: grandTotal } } });
        } catch { toast.error('Payment verified but order save failed. Contact support.'); }
      },
      prefill: { name: addr.fullName, contact: addr.phone },
      theme: { color: '#1A1A1A' },
      modal: { ondismiss: () => { setLoading(false); toast.error('Payment cancelled.'); } },
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (r) => { setLoading(false); toast.error(`Payment failed: ${r.error.description}`); });
    rzp.open();
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddr) { toast.error('Please add and select a shipping address.'); return; }
    setLoading(true);
    try {
      if (paymentMethod === 'razorpay') await placeRazorpayOrder(selectedAddr);
      else await placeCODOrder(selectedAddr);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order.');
    } finally {
      if (paymentMethod !== 'razorpay') setLoading(false);
    }
  };

  if (addrLoading) return <div className="ord-loading"><div className="ord-spinner" /><p>Loading checkout…</p></div>;

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1 className="checkout-title">Checkout</h1>

        {/* Progress stepper */}
        <div className="co-stepper">
          <div className={`co-step ${addresses.length > 0 ? 'done' : 'active'}`}>
            <div className="co-step-circle">{addresses.length > 0 ? '✓' : '1'}</div>
            <span className="co-step-label">Address</span>
          </div>
          <div className={`co-step-line ${addresses.length > 0 ? 'done' : ''}`} />
          <div className={`co-step ${addresses.length > 0 ? 'active' : ''}`}>
            <div className="co-step-circle">2</div>
            <span className="co-step-label">Payment</span>
          </div>
          <div className="co-step-line" />
          <div className="co-step">
            <div className="co-step-circle">3</div>
            <span className="co-step-label">Confirm</span>
          </div>
        </div>

        <div className="checkout-layout">
          {/* ── Left column ── */}
          <div className="checkout-left">

            {/* 1. Delivery Address */}
            <div className="co-card">
              <h2 className="co-section-title">1. Delivery Address</h2>

              {addresses.length > 0 && !isEditing ? (
                <>
                  <div className="co-address-list">
                    {addresses.map((addr) => (
                      <div
                        key={addr._id}
                        className={`co-address-item ${selectedAddressId === addr._id ? 'selected' : ''}`}
                        onClick={() => setSelectedAddressId(addr._id)}
                      >
                        <div>
                          <p className="co-address-name">
                            {addr.fullName}
                            {addr.isDefault && <span style={{ marginLeft: 8, fontSize: 10, background: '#B8960C22', color: '#B8960C', padding: '2px 6px', borderRadius: 4 }}>Default</span>}
                          </p>
                          <p className="co-address-line">{addr.addressLine1}{addr.addressLine2 ? ', ' + addr.addressLine2 : ''}, {addr.city} — {addr.postalCode}</p>
                          <p className="co-address-line">Phone: {addr.phone}</p>
                        </div>
                        <div className="co-address-actions">
                          <button className="co-btn-edit" onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }}>Edit</button>
                          {!addr.isDefault && (
                            <button className="co-btn-edit" style={{ color: '#B8960C' }} onClick={(e) => { e.stopPropagation(); handleSetDefault(addr._id); }}>Set Default</button>
                          )}
                          <button className="co-btn-delete" onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr._id); }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="co-btn-add-address" onClick={() => { setIsEditing(true); setEditingId(null); setFormData({ ...EMPTY_FORM, fullName: user?.name || '' }); }}>+ Add New Address</button>
                </>
              ) : (
                <form className="co-form" onSubmit={handleSaveAddress}>
                  <div className="co-form-group">
                    <label className="co-label">Full Name</label>
                    <input required type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="co-input" />
                  </div>
                  <div className="co-form-group">
                    <label className="co-label">Phone</label>
                    <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className="co-input" />
                  </div>
                  <div className="co-form-group">
                    <label className="co-label">Address Line 1</label>
                    <input required type="text" name="addressLine1" value={formData.addressLine1} onChange={handleChange} className="co-input" />
                  </div>
                  <div className="co-form-group">
                    <label className="co-label">Address Line 2 (optional)</label>
                    <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleChange} className="co-input" />
                  </div>
                  <div className="co-form-row">
                    <div className="co-form-group">
                      <label className="co-label">City</label>
                      <input required type="text" name="city" value={formData.city} onChange={handleChange} className="co-input" />
                    </div>
                    <div className="co-form-group">
                      <label className="co-label">State</label>
                      <input type="text" name="state" value={formData.state} onChange={handleChange} className="co-input" />
                    </div>
                  </div>
                  <div className="co-form-row">
                    <div className="co-form-group">
                      <label className="co-label">Postal Code</label>
                      <input required type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} className="co-input" />
                    </div>
                    <div className="co-form-group">
                      <label className="co-label">Country</label>
                      <input type="text" name="country" value={formData.country} onChange={handleChange} className="co-input" />
                    </div>
                  </div>
                  <div className="co-form-actions">
                    <button type="submit" className="co-btn-save">{editingId ? 'Update Address' : 'Save Address'}</button>
                    {addresses.length > 0 && (
                      <button type="button" className="co-btn-cancel" onClick={() => { setIsEditing(false); setEditingId(null); }}>Cancel</button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* 2. Payment Method */}
            <div className="co-card co-payment-section" style={{ marginTop: '16px' }}>
              <h2 className="co-section-title">2. Payment Method</h2>
              <label className="co-label">Select payment option</label>
              <select className="co-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash on Delivery (COD)</option>
                <option value="razorpay">Pay Online (Razorpay)</option>
              </select>
            </div>

            {/* 3. Scheduled Delivery */}
            <div className="co-card" style={{ marginTop: '16px' }}>
              <h2 className="co-section-title">3. Preferred Delivery Date <span style={{ fontSize:11, color:'#8A8A8A', fontWeight:400 }}>(optional)</span></h2>
              <label className="co-label">Choose a date for delivery</label>
              <input
                type="date"
                className="co-input"
                value={deliveryDate}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                onChange={e => setDeliveryDate(e.target.value)}
                style={{ maxWidth: 220 }}
              />
              {deliveryDate && (
                <p style={{ fontFamily:'Jost,sans-serif', fontSize:12, color:'#B8960C', marginTop:6 }}>
                  📅 Scheduled for {new Date(deliveryDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
                </p>
              )}
            </div>
          </div>

          {/* ── Right column: Order Summary ── */}
          <div className="co-summary-col">
            <div className="co-card">
              <h2 className="co-section-title">Order Summary</h2>

              <div className="co-summary-items">
                {orderItems.map((item) => (
                  <div key={item.cartKey || item.product} className="co-summary-item">
                    <div className="co-summary-item-left">
                      <img src={item.image} alt={item.name} className="co-summary-img" onError={e => { e.target.style.display = 'none'; }} />
                      <div>
                        <p className="co-summary-item-name">{item.name}</p>
                        <p className="co-summary-item-qty">
                          {item.selectedOption ? `${item.selectedOption.label} × ${item.qty}` : `Qty: ${item.qty}`}
                        </p>
                      </div>
                    </div>
                    <span className="co-summary-item-price">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
                <input
                  type="text"
                  className="co-input"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button
                  type="button"
                  className="co-btn-save"
                  style={{ whiteSpace: 'nowrap', padding: '0 14px' }}
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                >
                  {couponLoading ? '…' : 'Apply'}
                </button>
              </div>
              {couponData && (
                <p style={{ fontSize: 12, color: '#10B981', marginBottom: 8 }}>
                  ✓ {couponData.coupon.code} — saving ₹{couponData.discount}
                  <button type="button" onClick={() => { setCouponData(null); setCouponCode(''); }} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                </p>
              )}

              <div className="co-totals">
                <div className="co-total-row"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                <div className="co-total-row">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'free' : ''}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                <div className="co-total-row"><span>Tax (5%)</span><span>₹{tax.toLocaleString('en-IN')}</span></div>
                {discount > 0 && (
                  <div className="co-total-row" style={{ color: '#10B981' }}>
                    <span>Discount</span><span>−₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="co-total-row grand"><span>Order Total</span><span>₹{grandTotal.toLocaleString('en-IN')}</span></div>
              </div>

              <button
                className="co-place-order-btn"
                onClick={handlePlaceOrder}
                disabled={loading || isEditing || addresses.length === 0}
              >
                {loading
                  ? 'Processing...'
                  : paymentMethod === 'razorpay'
                    ? `Pay ₹${grandTotal.toLocaleString('en-IN')} Online`
                    : `Place Order — COD`
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
