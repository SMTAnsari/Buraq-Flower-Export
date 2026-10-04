import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';
import ImageUploader from '../components/ImageUploader';
import '../components/ImageUploader.css';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, totalOrders: 0, totalRevenue: 0 });
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', stock: '', category: '', image: '', images: [], unitType: 'count', stockUnit: 'count', pricingOptions: [] });
  const [pendingSellers, setPendingSellers] = useState([]);
  const [allSellers, setAllSellers] = useState([]);
  const [queryModal, setQueryModal] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [sendingQuery, setSendingQuery] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', type: 'percentage', value: '', minOrder: 0, maxUses: '', expiresAt: '', description: '' });
  const [couponFormOpen, setCouponFormOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, ordersRes, pendingRes, sellersRes, productsRes, contactsRes, analyticsRes, couponsRes, reviewsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/orders'),
        api.get('/admin/pending-sellers'),
        api.get('/admin/all-sellers'),
        api.get('/admin/products'),
        api.get('/contact'),
        api.get('/analytics/overview'),
        api.get('/coupons'),
        api.get('/admin/reviews'),
      ]);
      if (statsRes.status === 'fulfilled')     setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled')     setUsers(Array.isArray(usersRes.value.data) ? usersRes.value.data : []);
      if (ordersRes.status === 'fulfilled')    setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []);
      if (pendingRes.status === 'fulfilled')   setPendingSellers(Array.isArray(pendingRes.value.data) ? pendingRes.value.data : []);
      if (sellersRes.status === 'fulfilled')   setAllSellers(Array.isArray(sellersRes.value.data) ? sellersRes.value.data : []);
      if (productsRes.status === 'fulfilled') {
        const pd = productsRes.value.data;
        setProducts(Array.isArray(pd) ? pd : (Array.isArray(pd?.data) ? pd.data : []));
      }
      if (contactsRes.status === 'fulfilled')  setContacts(Array.isArray(contactsRes.value.data) ? contactsRes.value.data : []);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (couponsRes.status === 'fulfilled')   setCoupons(Array.isArray(couponsRes.value.data) ? couponsRes.value.data : []);
      if (reviewsRes.status === 'fulfilled')   setReviews(Array.isArray(reviewsRes.value.data) ? reviewsRes.value.data : []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApproveSeller = async (id) => {
    try { await api.post(`/admin/approve-seller/${id}`); toast.success('Seller approved!'); fetchAll(); }
    catch { toast.error('Approval failed'); }
  };

  const handleRejectSeller = async (id) => {
    try { await api.post(`/admin/reject-seller/${id}`); toast.success('Seller approval revoked'); fetchAll(); }
    catch { toast.error('Revoke failed'); }
  };

  const handleDeleteSeller = async (id) => {
    if (!window.confirm('Delete this seller account permanently?')) return;
    try { await api.delete(`/admin/sellers/${id}`); toast.success('Seller deleted'); fetchAll(); }
    catch { toast.error('Delete failed'); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try { await api.delete(`/admin/users/${id}`); toast.success('User deleted'); fetchAll(); }
    catch { toast.error('Delete failed'); }
  };

  const handleEditProduct = (p) => {
    setAddingProduct(false);
    setEditingProduct(p._id);
    // Display stock in its stockUnit (reverse-convert from grams if needed)
    const displayStock = p.stockUnit === 'kg' ? p.stock / 1000 : p.stock;
    setProductForm({
      name: p.name, description: p.description, price: p.price,
      stock: displayStock, category: p.category,
      image: p.image, images: p.images && p.images.length ? p.images : (p.image ? [p.image] : []),
      unitType: p.unitType || 'count', stockUnit: p.stockUnit || 'count',
      pricingOptions: p.pricingOptions || [],
    });
    setActiveTab('products');
  };

  const handleProductFormChange = (e) => setProductForm({ ...productForm, [e.target.name]: e.target.value });

  const resetProductForm = () => setProductForm({ name: '', description: '', price: '', stock: '', category: '', image: '', images: [], unitType: 'count', stockUnit: 'count', pricingOptions: [] });

  // Convert stock to grams for storage when stockUnit is kg
  const toStorageStock = (stock, stockUnit) => {
    const n = Number(stock);
    if (stockUnit === 'kg') return n * 1000;
    return n;
  };

  const handleProductSave = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/products/${editingProduct}`, {
        ...productForm,
        price: Number(productForm.price),
        stock: toStorageStock(productForm.stock, productForm.stockUnit),
        unitType: productForm.unitType,
        stockUnit: productForm.stockUnit,
        pricingOptions: (productForm.pricingOptions || []).filter(o => o.label && o.label.trim() && Number(o.value) > 0 && o.unit && Number(o.price) > 0),
      });
      toast.success('Product updated!');
      setEditingProduct(null);
      resetProductForm();
      fetchAll();
    } catch { toast.error('Failed to update product'); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products', {
        ...productForm,
        price: Number(productForm.price),
        stock: toStorageStock(productForm.stock, productForm.stockUnit),
        unitType: productForm.unitType,
        stockUnit: productForm.stockUnit,
        pricingOptions: (productForm.pricingOptions || []).filter(o => o.label && o.label.trim() && Number(o.value) > 0 && o.unit && Number(o.price) > 0),
      });
      toast.success('Product added!');
      setAddingProduct(false);
      resetProductForm();
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add product'); }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/coupons', { ...couponForm, value: Number(couponForm.value), minOrder: Number(couponForm.minOrder), maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : null, expiresAt: couponForm.expiresAt || null });
      toast.success('Coupon created!');
      setCouponForm({ code: '', type: 'percentage', value: '', minOrder: 0, maxUses: '', expiresAt: '', description: '' });
      setCouponFormOpen(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create coupon'); }
  };

  const handleToggleCoupon = async (id) => {
    try { await api.patch(`/coupons/${id}/toggle`); fetchAll(); }
    catch { toast.error('Failed to toggle coupon'); }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try { await api.delete(`/coupons/${id}`); toast.success('Coupon deleted'); fetchAll(); }
    catch { toast.error('Failed to delete coupon'); }
  };

  const handleExport = async (type, format) => {
    try {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${baseURL}/analytics/export/${type}?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${type}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try { await api.delete(`/admin/products/${id}`); toast.success('Product deleted'); fetchAll(); }
    catch { toast.error('Failed to delete product'); }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try { await api.delete(`/reviews/${id}`); toast.success('Review deleted'); fetchAll(); }
    catch { toast.error('Failed to delete review'); }
  };

  const handleHideReview = async (id) => {
    try { await api.patch(`/reviews/${id}/hide`); toast.success('Review hidden'); fetchAll(); }
    catch { toast.error('Failed to hide review'); }
  };

  const handleOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success('Order status updated');
      fetchAll();
    } catch { toast.error('Status update failed'); }
  };

  const openQueryModal = (seller) => { setQueryModal(seller); setQueryText(''); };

  const handleSendQuery = async () => {
    if (!queryText.trim()) return;
    setSendingQuery(true);
    try {
      await api.post(`/admin/sellers/${queryModal._id}/query`, { message: queryText });
      toast.success('Query sent to seller!');
      setQueryModal(null);
      setQueryText('');
    } catch { toast.error('Failed to send query'); }
    finally { setSendingQuery(false); }
  };

  const statusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered')        return '#10B981';
    if (s === 'cancelled')        return '#EF4444';
    if (s === 'out for delivery') return '#F97316';
    if (s === 'shipped')          return '#3B82F6';
    if (s === 'processing')       return '#F59E0B';
    return '#6B7280';
  };

  if (loading) return (
    <div className="adm-loading">
      <div className="adm-spinner"></div>
      <p>Loading Admin Dashboard...</p>
    </div>
  );

  return (
    <div className="adm-page">

      {/* HEADER */}
      <div className="adm-header">
        <div className="adm-header-inner">
          <div>
            <h1 className="adm-title">🌸 Admin Control Panel</h1>
            <p className="adm-subtitle">Manage your flower shop platform from one place</p>
          </div>
          <button className="adm-refresh-btn" onClick={fetchAll} title="Refresh data">↻ Refresh</button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card adm-stat-rose">
          <div className="adm-stat-icon">👥</div>
          <div className="adm-stat-num">{stats.totalUsers}</div>
          <div className="adm-stat-label">Total Users</div>
        </div>
        <div className="adm-stat-card adm-stat-green">
          <div className="adm-stat-icon">🌼</div>
          <div className="adm-stat-num">{stats.totalProducts}</div>
          <div className="adm-stat-label">Total Products</div>
        </div>
        <div className="adm-stat-card adm-stat-blue">
          <div className="adm-stat-icon">📦</div>
          <div className="adm-stat-num">{stats.totalOrders}</div>
          <div className="adm-stat-label">Total Orders</div>
        </div>
        <div className="adm-stat-card adm-stat-purple">
          <div className="adm-stat-icon">💰</div>
          <div className="adm-stat-num">₹{stats.totalRevenue?.toLocaleString()}</div>
          <div className="adm-stat-label">Total Revenue</div>
        </div>
        <div className="adm-stat-card adm-stat-amber">
          <div className="adm-stat-icon">⏳</div>
          <div className="adm-stat-num">{pendingSellers.length}</div>
          <div className="adm-stat-label">Pending Sellers</div>
        </div>
      </div>

      {/* TABS */}
      <div className="adm-tabs">
        {[
          { key: 'overview', label: '🏠 Overview' },
          { key: 'analytics',label: '📊 Analytics' },
          { key: 'pending',  label: `⏳ Pending (${pendingSellers.length})` },
          { key: 'sellers',  label: '🏪 All Sellers' },
          { key: 'users',    label: '👥 Users' },
          { key: 'orders',   label: '📦 Orders' },
          { key: 'products', label: `🌸 Products (${products.length})` },
          { key: 'reviews',  label: `⭐ Reviews (${reviews.length})` },
          { key: 'coupons',  label: `🎟 Coupons (${coupons.length})` },
          { key: 'contacts', label: `📬 Messages (${contacts.length})` },
        ].map(t => (
          <button
            key={t.key}
            className={`adm-tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="adm-content">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="adm-overview-grid">
            <div className="adm-card">
              <h2 className="adm-card-title">Recent Orders</h2>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => (
                      <tr key={o._id}>
                        <td className="adm-mono">#{o._id.slice(-6)}</td>
                        <td>{o.user?.name || o.shippingAddress?.fullName || '—'}</td>
                        <td className="adm-bold-pink">₹{o.totalPrice ?? o.totalAmount}</td>
                        <td>
                          <span className="adm-badge" style={{ background: statusColor(o.status) + '22', color: statusColor(o.status) }}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan="4" className="adm-empty-cell">No orders yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="adm-card">
              <h2 className="adm-card-title">Pending Seller Applications</h2>
              {pendingSellers.length === 0 ? (
                <div className="adm-empty">✅ No pending applications</div>
              ) : (
                <div className="adm-pending-list">
                  {pendingSellers.slice(0, 4).map(s => (
                    <div key={s._id} className="adm-pending-item">
                      <div>
                        <div className="adm-seller-name">{s.businessName || s.name}</div>
                        <div className="adm-seller-email">{s.email}</div>
                      </div>
                      <div className="adm-action-btns">
                        <button className="adm-btn adm-btn-green" onClick={() => handleApproveSeller(s._id)}>Approve</button>
                        <button className="adm-btn adm-btn-red" onClick={() => handleRejectSeller(s._id)}>Reject</button>
                      </div>
                    </div>
                  ))}
                  {pendingSellers.length > 4 && (
                    <button className="adm-view-all" onClick={() => setActiveTab('pending')}>View all {pendingSellers.length} →</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PENDING SELLERS */}
        {activeTab === 'pending' && (
          <div className="adm-card">
            <h2 className="adm-card-title">⏳ Pending Seller Applications</h2>
            {pendingSellers.length === 0 ? (
              <div className="adm-empty">✅ No pending seller applications right now.</div>
            ) : (
              <div className="adm-seller-cards">
                {pendingSellers.map(s => (
                  <div key={s._id} className="adm-seller-card">
                    <div className="adm-seller-avatar">{(s.businessName || s.name || '?')[0].toUpperCase()}</div>
                    <div className="adm-seller-body">
                      <h3>{s.businessName || s.name}</h3>
                      <p className="adm-seller-email">📧 {s.email}</p>
                      {s.businessAddress && <p className="adm-seller-addr">📍 {s.businessAddress}</p>}
                      <p className="adm-seller-date">Applied: {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="adm-seller-actions">
                      <button className="adm-btn adm-btn-green" onClick={() => handleApproveSeller(s._id)}>✓ Approve</button>
                      <button className="adm-btn adm-btn-red" onClick={() => handleRejectSeller(s._id)}>✗ Reject</button>
                      <button className="adm-btn adm-btn-outline" onClick={() => openQueryModal(s)}>💬 Message</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ALL SELLERS */}
        {activeTab === 'sellers' && (
          <div className="adm-card">
            <h2 className="adm-card-title">🏪 All Sellers & Revenue</h2>
            {allSellers.length === 0 ? (
              <div className="adm-empty">No sellers registered yet.</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Seller</th><th>Email</th><th>Business</th>
                      <th>Status</th><th>Revenue</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSellers.map(s => (
                      <tr key={s._id}>
                        <td className="adm-td-name">{s.name}</td>
                        <td className="adm-td-muted">{s.email}</td>
                        <td>{s.businessName || '—'}</td>
                        <td>
                          <span className="adm-badge" style={{
                            background: s.isApproved ? '#10B98122' : '#F59E0B22',
                            color: s.isApproved ? '#10B981' : '#F59E0B'
                          }}>
                            {s.isApproved ? '✓ Approved' : '⏳ Pending'}
                          </span>
                        </td>
                        <td className="adm-bold-pink">₹{s.revenue?.toLocaleString() || 0}</td>
                        <td>
                          <div className="adm-action-btns">
                            {s.isApproved
                              ? <button className="adm-btn adm-btn-red adm-btn-sm" onClick={() => handleRejectSeller(s._id)}>Revoke</button>
                              : <button className="adm-btn adm-btn-green adm-btn-sm" onClick={() => handleApproveSeller(s._id)}>Approve</button>
                            }
                            <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={() => openQueryModal(s)}>💬</button>
                            <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => handleDeleteSeller(s._id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div className="adm-card">
            <h2 className="adm-card-title">👥 Registered Users</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u._id}>
                      <td className="adm-td-muted">{i + 1}</td>
                      <td className="adm-td-name">{u.name}</td>
                      <td className="adm-td-muted">{u.email}</td>
                      <td>
                        <span className="adm-badge" style={{
                          background: u.role === 'seller' ? '#8B5CF622' : '#6B728022',
                          color: u.role === 'seller' ? '#8B5CF6' : '#6B7280'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="adm-td-muted">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => handleDeleteUser(u._id)}>🗑 Delete</button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan="6" className="adm-empty-cell">No users found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <div className="adm-card">
            <h2 className="adm-card-title">📦 All Orders</h2>

            {/* Date filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8A8A8A' }}>From</label>
                <input type="date" className="adm-select" value={orderDateFrom} onChange={e => setOrderDateFrom(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8A8A8A' }}>To</label>
                <input type="date" className="adm-select" value={orderDateTo} onChange={e => setOrderDateTo(e.target.value)} />
              </div>
              {(orderDateFrom || orderDateTo) && (
                <button className="adm-btn adm-btn-outline adm-btn-sm" style={{ alignSelf: 'flex-end' }}
                  onClick={() => { setOrderDateFrom(''); setOrderDateTo(''); }}>
                  Clear
                </button>
              )}
              <span style={{ alignSelf: 'flex-end', fontFamily: 'Jost,sans-serif', fontSize: 12, color: '#8A8A8A' }}>
                {orders.filter(o => {
                  if (orderDateFrom && new Date(o.createdAt) < new Date(orderDateFrom)) return false;
                  if (orderDateTo && new Date(o.createdAt) > new Date(orderDateTo + 'T23:59:59')) return false;
                  return true;
                }).length} order(s)
              </span>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Order ID</th><th>Customer</th><th>Date</th>
                    <th>Items</th><th>Total</th><th>Payment</th><th>Paid</th><th>Status</th><th>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(o => {
                    if (orderDateFrom && new Date(o.createdAt) < new Date(orderDateFrom)) return false;
                    if (orderDateTo && new Date(o.createdAt) > new Date(orderDateTo + 'T23:59:59')) return false;
                    return true;
                  }).map(o => (
                    <tr key={o._id}>
                      <td className="adm-mono">#{o._id.slice(-8)}</td>
                      <td>{o.user?.name || o.shippingAddress?.fullName || '—'}</td>
                      <td className="adm-td-muted">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="adm-td-muted">{o.orderItems?.length || 0} item(s)</td>
                      <td className="adm-bold-pink">₹{o.totalPrice ?? o.totalAmount}</td>
                      <td className="adm-td-muted">{o.paymentMethod || 'COD'}</td>
                      <td>
                        <span className="adm-badge" style={{
                          background: o.isPaid ? '#10B98122' : '#F59E0B22',
                          color:      o.isPaid ? '#10B981'   : '#F59E0B'
                        }}>
                          {o.isPaid ? '✓ Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td>
                        <span className="adm-badge" style={{ background: statusColor(o.status) + '22', color: statusColor(o.status) }}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        <select
                          className="adm-select"
                          value={o.status || 'pending'}
                          onChange={(e) => handleOrderStatus(o._id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="out for delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan="9" className="adm-empty-cell">No orders placed yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        {activeTab === 'products' && (
          <div className="adm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="adm-card-title" style={{ margin: 0 }}>🌸 All Products</h2>
              <button className="adm-btn adm-btn-green" onClick={() => { setAddingProduct(v => !v); setEditingProduct(null); resetProductForm(); }}>+ Add Product</button>
            </div>

            {addingProduct && (
              <form onSubmit={handleAddProduct} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontFamily: 'Jost,sans-serif', color: '#141414' }}>New Product</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Name</label>
                    <input name="name" value={productForm.name} onChange={handleProductFormChange} required
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Price (₹) — Base/Fallback</label>
                    <input name="price" value={productForm.price} onChange={handleProductFormChange} required type="number" min="0"
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Measurement Type</label>
                    <select name="unitType" value={productForm.unitType} onChange={handleProductFormChange}
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }}>
                      <option value="count">Count-Based (default)</option>
                      <option value="weight">Weight-Based (gram/kg)</option>
                      <option value="piece">Piece-Based</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Stock Unit</label>
                    <select name="stockUnit" value={productForm.stockUnit} onChange={handleProductFormChange}
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }}>
                      <option value="count">Count</option>
                      <option value="gram">Gram</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="piece">Piece</option>
                      <option value="dozen">Dozen</option>
                      <option value="bundle">Bundle</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>
                      Stock Quantity {productForm.stockUnit !== 'count' ? `(in ${productForm.stockUnit})` : ''}
                    </label>
                    <input name="stock" value={productForm.stock} onChange={handleProductFormChange} required type="number" min="0"
                      placeholder={productForm.stockUnit === 'kg' ? 'e.g. 25 (= 25kg)' : productForm.stockUnit === 'gram' ? 'e.g. 5000 (grams)' : ''}
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                    {productForm.stockUnit === 'kg' && productForm.stock && (
                      <span style={{ fontSize: 11, color: '#B8960C', marginTop: 2 }}>= {Number(productForm.stock) * 1000}g stored internally</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Category</label>
                    <select name="category" value={productForm.category} onChange={handleProductFormChange} required
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }}>
                      <option value="">Select category</option>
                      {['Bouquets','Arrangements','Pots','Gifts','Specials'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Description</label>
                    <textarea name="description" value={productForm.description} onChange={handleProductFormChange} rows={2} required
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif', resize: 'vertical' }} />
                  </div>
                  {/* Pricing Options */}
                  {productForm.unitType !== 'count' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1/-1' }}>
                      <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Pricing Options</label>
                      {productForm.pricingOptions.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input placeholder="Label (e.g. 250g)" value={opt.label}
                            onChange={e => { const o = [...productForm.pricingOptions]; o[i] = { ...o[i], label: e.target.value }; setProductForm(p => ({ ...p, pricingOptions: o })); }}
                            style={{ flex: 2, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                          <input type="number" placeholder="Value" value={opt.value}
                            onChange={e => { const o = [...productForm.pricingOptions]; o[i] = { ...o[i], value: Number(e.target.value) }; setProductForm(p => ({ ...p, pricingOptions: o })); }}
                            style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                          <select value={opt.unit}
                            onChange={e => { const o = [...productForm.pricingOptions]; o[i] = { ...o[i], unit: e.target.value }; setProductForm(p => ({ ...p, pricingOptions: o })); }}
                            style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }}>
                            <option value="gram">gram</option>
                            <option value="kg">kg</option>
                            <option value="piece">piece</option>
                            <option value="dozen">dozen</option>
                            <option value="bundle">bundle</option>
                            <option value="pack">pack</option>
                          </select>
                          <input type="number" placeholder="Price (₹)" value={opt.price}
                            onChange={e => { const o = [...productForm.pricingOptions]; o[i] = { ...o[i], price: Number(e.target.value) }; setProductForm(p => ({ ...p, pricingOptions: o })); }}
                            style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                          <button type="button" onClick={() => setProductForm(p => ({ ...p, pricingOptions: p.pricingOptions.filter((_, j) => j !== i) }))}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setProductForm(p => ({ ...p, pricingOptions: [...p.pricingOptions, { label: '', value: 0, unit: productForm.unitType === 'weight' ? 'gram' : 'piece', price: 0 }] }))}
                        style={{ alignSelf: 'flex-start', fontSize: 12, color: '#B8960C', background: 'none', border: '1px dashed #B8960C', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                        + Add Option
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Product Images (max 5)</label>
                    <ImageUploader multi currentImages={productForm.images} onUpload={(urls) => setProductForm(prev => ({ ...prev, images: urls, image: urls[0] || '' }))} maxImages={5} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="adm-btn adm-btn-green">Add Product</button>
                  <button type="button" className="adm-btn adm-btn-outline" onClick={() => { setAddingProduct(false); resetProductForm(); }}>Cancel</button>
                </div>
              </form>
            )}

            {editingProduct && (
              <form onSubmit={handleProductSave} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontFamily: 'Jost,sans-serif', color: '#141414' }}>Edit Product</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Name</label>
                    <input name="name" value={productForm.name} onChange={handleProductFormChange} required
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Price (₹) — Base/Fallback</label>
                    <input name="price" value={productForm.price} onChange={handleProductFormChange} required type="number" min="0"
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Measurement Type</label>
                    <select name="unitType" value={productForm.unitType} onChange={handleProductFormChange}
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }}>
                      <option value="count">Count-Based (default)</option>
                      <option value="weight">Weight-Based (gram/kg)</option>
                      <option value="piece">Piece-Based</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Stock Unit</label>
                    <select name="stockUnit" value={productForm.stockUnit} onChange={handleProductFormChange}
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }}>
                      <option value="count">Count</option>
                      <option value="gram">Gram</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="piece">Piece</option>
                      <option value="dozen">Dozen</option>
                      <option value="bundle">Bundle</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>
                      Stock Quantity {productForm.stockUnit !== 'count' ? `(in ${productForm.stockUnit})` : ''}
                    </label>
                    <input name="stock" value={productForm.stock} onChange={handleProductFormChange} required type="number" min="0"
                      placeholder={productForm.stockUnit === 'kg' ? 'e.g. 25 (= 25kg)' : productForm.stockUnit === 'gram' ? 'e.g. 5000 (grams)' : ''}
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                    {productForm.stockUnit === 'kg' && productForm.stock && (
                      <span style={{ fontSize: 11, color: '#B8960C', marginTop: 2 }}>= {Number(productForm.stock) * 1000}g stored internally</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Category</label>
                    <select name="category" value={productForm.category} onChange={handleProductFormChange} required
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }}>
                      <option value="">Select category</option>
                      {['Bouquets','Arrangements','Pots','Gifts','Specials'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Description</label>
                    <textarea name="description" value={productForm.description} onChange={handleProductFormChange} rows={2} required
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif', resize: 'vertical' }} />
                  </div>
                  {/* Pricing Options */}
                  {productForm.unitType !== 'count' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1/-1' }}>
                      <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Pricing Options</label>
                      {productForm.pricingOptions.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input placeholder="Label (e.g. 250g)" value={opt.label}
                            onChange={e => { const o = [...productForm.pricingOptions]; o[i] = { ...o[i], label: e.target.value }; setProductForm(p => ({ ...p, pricingOptions: o })); }}
                            style={{ flex: 2, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                          <input type="number" placeholder="Value" value={opt.value}
                            onChange={e => { const o = [...productForm.pricingOptions]; o[i] = { ...o[i], value: Number(e.target.value) }; setProductForm(p => ({ ...p, pricingOptions: o })); }}
                            style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                          <select value={opt.unit}
                            onChange={e => { const o = [...productForm.pricingOptions]; o[i] = { ...o[i], unit: e.target.value }; setProductForm(p => ({ ...p, pricingOptions: o })); }}
                            style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }}>
                            <option value="gram">gram</option>
                            <option value="kg">kg</option>
                            <option value="piece">piece</option>
                            <option value="dozen">dozen</option>
                            <option value="bundle">bundle</option>
                            <option value="pack">pack</option>
                          </select>
                          <input type="number" placeholder="Price (₹)" value={opt.price}
                            onChange={e => { const o = [...productForm.pricingOptions]; o[i] = { ...o[i], price: Number(e.target.value) }; setProductForm(p => ({ ...p, pricingOptions: o })); }}
                            style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                          <button type="button" onClick={() => setProductForm(p => ({ ...p, pricingOptions: p.pricingOptions.filter((_, j) => j !== i) }))}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setProductForm(p => ({ ...p, pricingOptions: [...p.pricingOptions, { label: '', value: 0, unit: productForm.unitType === 'weight' ? 'gram' : 'piece', price: 0 }] }))}
                        style={{ alignSelf: 'flex-start', fontSize: 12, color: '#B8960C', background: 'none', border: '1px dashed #B8960C', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                        + Add Option
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Product Images (max 5)</label>
                    <ImageUploader multi currentImages={productForm.images} onUpload={(urls) => setProductForm(prev => ({ ...prev, images: urls, image: urls[0] || '' }))} maxImages={5} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="adm-btn adm-btn-green">Save Changes</button>
                  <button type="button" className="adm-btn adm-btn-outline"
                    onClick={() => { setEditingProduct(null); resetProductForm(); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Image</th><th>Name</th><th>Category</th>
                    <th>Price / Options</th><th>Stock</th><th>Unit</th><th>Seller</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p._id}>
                      <td>
                        <img src={p.image} alt={p.name}
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }}
                          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=80'; }} />
                      </td>
                      <td className="adm-td-name">{p.name}</td>
                      <td className="adm-td-muted">{p.category || p.type}</td>
                      <td className="adm-bold-pink">
                        {p.pricingOptions && p.pricingOptions.length > 0
                          ? p.pricingOptions.map(o => `${o.label}: ₹${o.price}`).join(' | ')
                          : `₹${p.price?.toLocaleString()}`
                        }
                      </td>
                      <td>
                        <span className="adm-badge" style={{
                          background: p.stock === 0 ? '#EF444422' : '#10B98122',
                          color:      p.stock === 0 ? '#EF4444'   : '#10B981'
                        }}>
                          {p.stock === 0
                            ? 'Out of Stock'
                            : p.stockUnit === 'kg'
                              ? `${(p.stock / 1000).toLocaleString('en-IN')} kg`
                              : p.stockUnit && p.stockUnit !== 'count'
                                ? `${p.stock} ${p.stockUnit}`
                                : p.stock
                          }
                        </span>
                      </td>
                      <td className="adm-td-muted" style={{ textTransform: 'capitalize' }}>
                        {p.unitType || 'count'}
                      </td>
                      <td className="adm-td-muted">{p.sellerId?.name || '—'}</td>
                      <td>
                        <div className="adm-action-btns">
                          <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={() => handleEditProduct(p)}>Edit</button>
                          <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => handleDeleteProduct(p._id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan="8" className="adm-empty-cell">No products found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div>
            {!analytics ? (
              <div className="adm-empty">Loading analytics…</div>
            ) : (
              <>
                {/* Export buttons */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  <button className="adm-btn adm-btn-outline" onClick={() => handleExport('orders', 'csv')}>⬇ Orders CSV</button>
                  <button className="adm-btn adm-btn-outline" onClick={() => handleExport('orders', 'xlsx')}>⬇ Orders Excel</button>
                  <button className="adm-btn adm-btn-outline" onClick={() => handleExport('users', 'csv')}>⬇ Users CSV</button>
                  <button className="adm-btn adm-btn-outline" onClick={() => handleExport('users', 'xlsx')}>⬇ Users Excel</button>
                </div>

                {/* Monthly Revenue */}
                <div className="adm-card" style={{ marginBottom: 20 }}>
                  <h2 className="adm-card-title">📈 Monthly Revenue (Last 12 Months)</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={analytics.monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Jost,sans-serif' }} />
                      <YAxis tick={{ fontSize: 11, fontFamily: 'Jost,sans-serif' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="#B8960C" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  {/* Orders by Status */}
                  <div className="adm-card">
                    <h2 className="adm-card-title">📦 Orders by Status</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.ordersByStatus} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" />
                        <XAxis dataKey="status" tick={{ fontSize: 10, fontFamily: 'Jost,sans-serif' }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1A1A1A" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Distribution */}
                  <div className="adm-card">
                    <h2 className="adm-card-title">🌸 Products by Category</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={analytics.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                          {analytics.categoryData.map((_, i) => (
                            <Cell key={i} fill={['#B8960C','#1A1A1A','#10B981','#3B82F6','#F59E0B'][i % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Products */}
                <div className="adm-card" style={{ marginBottom: 20 }}>
                  <h2 className="adm-card-title">🏆 Top Selling Products</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.topProducts} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontFamily: 'Jost,sans-serif' }} width={80} />
                      <Tooltip />
                      <Bar dataKey="qty" fill="#B8960C" radius={[0,3,3,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* User Growth */}
                <div className="adm-card">
                  <h2 className="adm-card-title">👥 New Users per Month</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.userGrowth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Jost,sans-serif' }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="newUsers" fill="#1A1A1A" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* COUPONS */}
        {activeTab === 'coupons' && (
          <div className="adm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="adm-card-title" style={{ margin: 0 }}>🎟 Coupon Management</h2>
              <button className="adm-btn adm-btn-green" onClick={() => setCouponFormOpen(v => !v)}>+ New Coupon</button>
            </div>

            {couponFormOpen && (
              <form onSubmit={handleCouponSubmit} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[['code','Code'],['value','Value'],['minOrder','Min Order (₹)'],['maxUses','Max Uses'],['expiresAt','Expires At'],['description','Description']].map(([f, l]) => (
                    <div key={f} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>{l}</label>
                      <input name={f} value={couponForm[f]} type={f === 'expiresAt' ? 'date' : 'text'}
                        onChange={e => setCouponForm(p => ({ ...p, [f]: e.target.value }))}
                        style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7280' }}>Type</label>
                    <select value={couponForm.type} onChange={e => setCouponForm(p => ({ ...p, type: e.target.value }))}
                      style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontFamily: 'Jost,sans-serif' }}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (₹)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="adm-btn adm-btn-green">Create Coupon</button>
                  <button type="button" className="adm-btn adm-btn-outline" onClick={() => setCouponFormOpen(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Used/Max</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c._id}>
                      <td className="adm-mono" style={{ fontWeight: 600 }}>{c.code}</td>
                      <td className="adm-td-muted">{c.type}</td>
                      <td className="adm-bold-pink">{c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</td>
                      <td className="adm-td-muted">₹{c.minOrder}</td>
                      <td className="adm-td-muted">{c.usedCount}/{c.maxUses ?? '∞'}</td>
                      <td className="adm-td-muted">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        <span className="adm-badge" style={{ background: c.isActive ? '#10B98122' : '#EF444422', color: c.isActive ? '#10B981' : '#EF4444' }}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="adm-action-btns">
                          <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={() => handleToggleCoupon(c._id)}>{c.isActive ? 'Disable' : 'Enable'}</button>
                          <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => handleDeleteCoupon(c._id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && <tr><td colSpan="8" className="adm-empty-cell">No coupons yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="adm-card">
            <h2 className="adm-card-title">⭐ Customer Reviews</h2>
            {reviews.length === 0 ? (
              <div className="adm-empty">No reviews yet.</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr><th>Product</th><th>Customer</th><th>Rating</th><th>Title</th><th>Review</th><th>Verified</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {reviews.map(r => (
                      <tr key={r._id}>
                        <td className="adm-td-muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.productName || r.product?.name || r.product?.toString?.().slice(-6) || '—'}</td>
                        <td className="adm-td-name">{r.userName}</td>
                        <td>
                          <span style={{ color: '#B8960C', fontSize: 14, letterSpacing: 1 }}>
                            {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                          </span>
                        </td>
                        <td className="adm-td-muted">{r.title || '—'}</td>
                        <td style={{ maxWidth: 200, fontSize: 12, color: '#4A4A4A', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.body || '—'}</td>
                        <td>
                          <span className="adm-badge" style={{ background: r.verified ? '#10B98122' : '#6B728022', color: r.verified ? '#10B981' : '#6B7280' }}>
                            {r.verified ? '✓ Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td className="adm-td-muted">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>
                          <div className="adm-action-btns">
                            <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={() => handleHideReview(r._id)}>Hide</button>
                            <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => handleDeleteReview(r._id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="adm-card">
            <h2 className="adm-card-title">📬 Contact Messages</h2>
            {contacts.length === 0 ? (
              <div className="adm-empty">No contact messages yet.</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Message</th>
                      <th>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c, i) => (
                      <tr key={c._id}>
                        <td className="adm-td-muted">{i + 1}</td>
                        <td className="adm-td-name">{c.name}</td>
                        <td className="adm-td-muted">{c.email}</td>
                        <td style={{ maxWidth: 360, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, color: '#4A4A4A', padding: '12px 16px' }}>
                          {c.message}
                        </td>
                        <td className="adm-td-muted">
                          {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          <br />
                          <span style={{ fontSize: 11, color: '#B8960C' }}>
                            {new Date(c.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* QUERY MODAL */}
      {queryModal && (
        <div className="adm-modal-overlay" onClick={() => setQueryModal(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3>💬 Send Message to Seller</h3>
              <button className="adm-modal-close" onClick={() => setQueryModal(null)}>×</button>
            </div>
            <div className="adm-modal-body">
              <p className="adm-modal-to">To: <strong>{queryModal.businessName || queryModal.name}</strong> ({queryModal.email})</p>
              <textarea
                className="adm-textarea"
                rows={5}
                placeholder="Type your message, query resolution, or instructions for the seller..."
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
              />
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-outline" onClick={() => setQueryModal(null)}>Cancel</button>
              <button className="adm-btn adm-btn-green" onClick={handleSendQuery} disabled={sendingQuery || !queryText.trim()}>
                {sendingQuery ? 'Sending...' : '📨 Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
