import React, { useState, useEffect, useContext, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import ImageUploader from '../components/ImageUploader';
import '../components/ImageUploader.css';
import './Dashboard.css';

/* ── tiny helpers ── */
const CATEGORIES = ['Bouquets', 'Arrangements', 'Pots', 'Gifts', 'Specials'];
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const stockColor = (n) => {
  if (n === 0)  return '#C62828';
  if (n < 5)   return '#E65100';
  if (n <= 10) return '#B8960C';
  return '#2E7D32';
};

/* ── Restock inline widget ── */
const RestockWidget = ({ product, onDone }) => {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async () => {
    if (qty < 1) return;
    setBusy(true);
    try {
      await api.patch(`/seller/products/${product._id}/restock`, { quantity: qty });
      setMsg('Stock updated successfully!');
      setTimeout(() => { setMsg(''); onDone(); }, 1200);
    } catch (err) {
      setMsg('Error: ' + (err.response?.data?.message || 'Restock failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="restock-widget">
      <input
        type="number" min="1" value={qty}
        onChange={e => setQty(Number(e.target.value))}
        className="restock-input"
      />
      <button onClick={submit} disabled={busy} className="restock-confirm-btn">
        {busy ? '...' : 'Confirm'}
      </button>
      <button onClick={onDone} className="restock-cancel-btn">Cancel</button>
      {msg && <span className={`restock-msg ${msg.startsWith('Stock') ? 'ok' : 'err'}`}>{msg}</span>}
    </div>
  );
};

/* ══════════════════════════════════════════════════════ */
const SellerDashboard = () => {
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab]   = useState('overview');
  const [products,  setProducts]    = useState([]);
  const [orders,    setOrders]      = useState([]);
  const [stats,     setStats]       = useState(null);
  const [loading,   setLoading]     = useState(true);

  const [prodSearch,   setProdSearch]   = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [restockId, setRestockId] = useState(null);
  const [orderFilter, setOrderFilter] = useState('All');

  const [formData, setFormData] = useState({
    name: '', description: '', price: '', image: '', images: [], category: 'Bouquets', stock: '',
    unitType: 'count', stockUnit: 'count', pricingOptions: [], tags: '',
  });
  const [editingId,  setEditingId]  = useState(null);
  const [formMsg,    setFormMsg]    = useState('');
  const [formErr,    setFormErr]    = useState('');
  const [analytics,  setAnalytics]  = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, ordRes, statRes, analyticsRes] = await Promise.all([
        api.get('/seller/products'),
        api.get('/seller/orders'),
        api.get('/seller/stats'),
        api.get('/seller/analytics'),
      ]);
      setProducts(prodRes.data);
      setOrders(ordRes.data);
      setStats(statRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── product form ── */
  const handleInput = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMsg(''); setFormErr('');

    if (!formData.image || !formData.image.trim()) {
      setFormErr('Product image is required. Please upload an image.');
      return;
    }

    // Use first gallery image as primary if image field is empty
    const primaryImage = formData.image || (formData.images && formData.images[0]) || '';
    if (!primaryImage) {
      setFormErr('Product image is required. Please upload an image.');
      return;
    }

    const payload = {
      ...formData,
      image: primaryImage,
      images: formData.images || [],
      price: Number(formData.price),
      stock: formData.stockUnit === 'kg' ? Number(formData.stock) * 1000 : Number(formData.stock),
      unitType: formData.unitType || 'count',
      stockUnit: formData.stockUnit || 'count',
      pricingOptions: (formData.pricingOptions || []).filter(o => o.label && o.label.trim() && Number(o.value) > 0 && o.unit && Number(o.price) > 0),
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    try {
      if (editingId) {
        const res = await api.put(`/products/${editingId}`, payload);
        setFormMsg(`"${res.data.name}" updated successfully!`);
      } else {
        const res = await api.post('/products', payload);
        setFormMsg(`"${res.data.name}" added successfully! It is now live in the shop.`);
      }
      setFormData({ name: '', description: '', price: '', image: '', images: [], category: 'Bouquets', stock: '', unitType: 'count', stockUnit: 'count', pricingOptions: [] });
      setEditingId(null);
      fetchAll();
      setTimeout(() => { setFormMsg(''); setActiveTab('products'); }, 2000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Error saving product';
      setFormErr(msg);
    }
  };

  const handleEdit = (p) => {
    setFormData({
      name: p.name, description: p.description, price: p.price, image: p.image,
      images: p.images || [], category: p.category, stock: p.stock,
      unitType: p.unitType || 'count', stockUnit: p.stockUnit || 'count',
      pricingOptions: p.pricingOptions || [],
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
    });
    setEditingId(p._id);
    setFormMsg(''); setFormErr('');
    setActiveTab('add');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchAll();
    } catch { toast.error('Failed to delete product'); }
  };

  /* ── order status ── */
  const handleStatusChange = async (orderId, status) => {
    try {
      await api.put(`/seller/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
    } catch { toast.error('Failed to update order status'); }
  };

  /* ── derived lists ── */
  const filteredProducts = products.filter(p => {
    const matchName = p.name.toLowerCase().includes(prodSearch.toLowerCase());
    const matchCat  = prodCategory ? p.category === prodCategory : true;
    return matchName && matchCat;
  });

  const filteredOrders = orderFilter === 'All'
    ? orders
    : orders.filter(o => o.status === orderFilter);

  const lowStockProducts = products.filter(p => p.stock < 5);

  if (loading) return (
    <div className="sd-loading">
      <div className="spinner" />
      <p>Loading dashboard...</p>
    </div>
  );

  /* ══════════════════════════════════════════════════════ */
  return (
    <div className="sd-shell">

      {/* ── Sidebar ── */}
      <aside className="sd-sidebar">
        <div className="sd-sidebar-brand">Buraq Flower Exports</div>
        {[
          { key: 'overview',   label: 'Dashboard'   },
          { key: 'products',   label: 'My Products'  },
          { key: 'add',        label: editingId ? 'Edit Product' : 'Add Product' },
          { key: 'orders',     label: 'Orders'       },
          { key: 'analytics',  label: 'Analytics'    },
          { key: 'profile',    label: 'Profile'      },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`sd-nav-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <span>{label}</span>
            {key === 'orders' && orders.filter(o => o.status === 'Pending').length > 0 && (
              <span className="sd-nav-badge">
                {orders.filter(o => o.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </aside>

      {/* ── Main ── */}
      <main className="sd-main">

        {/* Low-stock alert banner */}
        {lowStockProducts.length > 0 && (
          <div className="sd-alert-banner">
            <div>
              <strong>Low Stock Alert:</strong>{' '}
              {lowStockProducts.map((p, i) => (
                <span key={p._id}>
                  {p.name} <span className="sd-alert-count">(
                    {p.stockUnit === 'kg'
                      ? `${(p.stock / 1000).toLocaleString('en-IN')}kg left`
                      : p.stockUnit && p.stockUnit !== 'count'
                        ? `${p.stock} ${p.stockUnit} left`
                        : `${p.stock} left`
                    }
                  )</span>
                  {i < lowStockProducts.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
            <button className="sd-alert-restock-btn" onClick={() => setActiveTab('products')}>
              Restock Now
            </button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <section className="page-fade-in">
            <h2 className="sd-page-title">Dashboard Overview</h2>
            <p className="sd-page-sub">Welcome back, {user?.name}</p>
            <div className="sd-stat-grid">
              <div className="sd-stat-card he-stat-1">
                <span className="sd-stat-label">TOTAL PRODUCTS</span>
                <span className="sd-stat-value">{stats?.totalProducts ?? 0}</span>
                <div className="sd-stat-accent he-accent-gold" />
              </div>
              <div className="sd-stat-card he-stat-2">
                <span className="sd-stat-label">TOTAL ORDERS</span>
                <span className="sd-stat-value">{stats?.totalOrders ?? 0}</span>
                <div className="sd-stat-accent he-accent-dark" />
              </div>
              <div className="sd-stat-card he-stat-3">
                <span className="sd-stat-label">REVENUE DELIVERED</span>
                <span className="sd-stat-value">&#8377;{(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}</span>
                <div className="sd-stat-accent he-accent-gold" />
              </div>
              <div className="sd-stat-card he-stat-4">
                <span className="sd-stat-label">LOW STOCK ITEMS</span>
                <span className="sd-stat-value">{stats?.lowStockCount ?? 0}</span>
                <div className="sd-stat-accent he-accent-rose" />
              </div>
            </div>

            {/* Recent orders preview */}
            <div className="sd-card" style={{ marginTop: 24 }}>
              <h3 className="sd-card-title">Recent Orders</h3>
              {orders.slice(0, 5).map(o => (
                <div key={o._id} className="sd-recent-row">
                  <span className="sd-recent-id">#{o._id.substring(0, 8)}</span>
                  <span className="sd-recent-name">{o.shippingAddress?.fullName}</span>
                  <span className="sd-recent-price">&#8377;{o.totalPrice}</span>
                  <span className={`status-badge ${o.status.toLowerCase()}`}>{o.status}</span>
                </div>
              ))}
              {orders.length === 0 && <p className="sd-empty">No orders yet.</p>}
            </div>
          </section>
        )}

        {/* ── PRODUCTS ── */}
        {activeTab === 'products' && (
          <section className="page-fade-in">
            <div className="sd-section-header">
              <h2 className="sd-page-title">My Products</h2>
              <button className="sd-add-btn" onClick={() => { setEditingId(null); setFormData({ name:'',description:'',price:'',image:'',images:[],category:'Bouquets',stock:'',unitType:'count',stockUnit:'count',pricingOptions:[] }); setActiveTab('add'); }}>
                + Add Product
              </button>
            </div>

            <div className="sd-filters">
              <input
                className="sd-search"
                placeholder="Search products..."
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
              />
              <select className="sd-filter-select" value={prodCategory} onChange={e => setProdCategory(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="sd-card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price / Options</th>
                      <th>Stock</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => (
                      <React.Fragment key={p._id}>
                        <tr>
                          <td>
                            <img src={p.image} alt={p.name}
                              className="sd-prod-thumb"
                              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=80'; }}
                            />
                          </td>
                          <td className="td-text-dark">{p.name}</td>
                          <td className="td-text">{p.category}</td>
                          <td className="td-text">
                            {p.pricingOptions && p.pricingOptions.length > 0
                              ? p.pricingOptions.map(o => `${o.label}: ₹${o.price}`).join(' | ')
                              : `₹${p.price}`
                            }
                          </td>
                          <td>
                            <span className="sd-stock-badge" style={{ color: stockColor(p.stock), borderColor: stockColor(p.stock) }}>
                              {p.stockUnit === 'kg'
                                ? `${(p.stock / 1000).toLocaleString('en-IN')} kg`
                                : p.stockUnit && p.stockUnit !== 'count'
                                  ? `${p.stock} ${p.stockUnit}`
                                  : p.stock
                              }
                            </span>
                          </td>
                          <td className="td-text" style={{ textTransform: 'capitalize' }}>
                            {p.unitType || 'count'}
                          </td>
                          <td>
                            <span className={`status-badge ${p.stock === 0 ? 'cancelled' : p.stock < 5 ? 'pending' : 'delivered'}`}>
                              {p.stock === 0 ? 'Out of Stock' : p.stock < 5 ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="sd-actions-cell">
                            <button onClick={() => handleEdit(p)} className="action-btn-primary">Edit</button>
                            <button onClick={() => setRestockId(restockId === p._id ? null : p._id)} className="action-btn-restock">
                              Restock
                            </button>
                            <button onClick={() => handleDelete(p._id)} className="action-btn-danger">Delete</button>
                          </td>
                        </tr>
                        {restockId === p._id && (
                          <tr className="restock-row">
                            <td colSpan={8}>
                              <RestockWidget product={p} onDone={() => { setRestockId(null); fetchAll(); }} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && <p className="sd-empty">No products match your filters.</p>}
              </div>
            </div>
          </section>
        )}

        {/* ── ADD / EDIT PRODUCT ── */}
        {activeTab === 'add' && (
          <section className="page-fade-in">
            <h2 className="sd-page-title">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
            <div className="sd-form-card">
              {formMsg && <div className="sd-form-success">{formMsg}</div>}
              {formErr && <div className="sd-form-error">{formErr}</div>}

              <form onSubmit={handleSubmit} className="dashboard-form">
                <div className="form-group">
                  <label>Product Name</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleInput} className="form-control" placeholder="e.g. Red Rose Bouquet" />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea required name="description" value={formData.description} onChange={handleInput} className="form-control" rows={3} placeholder="Describe the product..." />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Price (&#8377;)</label>
                    <input required type="number" min="1" name="price" value={formData.price} onChange={handleInput} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Stock Quantity {formData.stockUnit !== 'count' ? `(in ${formData.stockUnit})` : ''}</label>
                    <input required type="number" min="0" name="stock" value={formData.stock} onChange={handleInput} className="form-control"
                      placeholder={formData.stockUnit === 'kg' ? 'e.g. 25 (= 25kg)' : formData.stockUnit === 'gram' ? 'e.g. 5000 (grams)' : ''} />
                    {formData.stockUnit === 'kg' && formData.stock && (
                      <span style={{ fontFamily: 'Jost,sans-serif', fontSize: 11, color: '#B8960C', marginTop: 4, display: 'block' }}>= {Number(formData.stock) * 1000}g stored internally</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select name="category" value={formData.category} onChange={handleInput} className="form-control">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Tags <span style={{ fontFamily:'Jost,sans-serif', fontSize:11, color:'#8A8A8A', fontWeight:400 }}>(comma separated, e.g. rose, fresh, gift)</span></label>
                  <input type="text" name="tags" value={formData.tags} onChange={handleInput} className="form-control" placeholder="rose, fresh, wedding, gift" />
                </div>

                {/* ── Unit System ── */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Measurement Type</label>
                    <select name="unitType" value={formData.unitType} onChange={handleInput} className="form-control">
                      <option value="count">Count-Based (default)</option>
                      <option value="weight">Weight-Based (gram/kg)</option>
                      <option value="piece">Piece-Based</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Stock Unit</label>
                    <select name="stockUnit" value={formData.stockUnit} onChange={handleInput} className="form-control">
                      <option value="count">Count</option>
                      <option value="gram">Gram</option>
                      <option value="kg">Kilogram</option>
                      <option value="piece">Piece</option>
                      <option value="dozen">Dozen</option>
                      <option value="bundle">Bundle</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                </div>

                {/* Pricing Options (shown for weight/piece types) */}
                {formData.unitType !== 'count' && (
                  <div className="form-group">
                    <label>Pricing Options</label>
                    {formData.pricingOptions.map((opt, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <input
                          placeholder="Label (e.g. 250g)" value={opt.label}
                          onChange={e => {
                            const opts = [...formData.pricingOptions];
                            opts[i] = { ...opts[i], label: e.target.value };
                            setFormData(p => ({ ...p, pricingOptions: opts }));
                          }}
                          className="form-control" style={{ flex: 2 }}
                        />
                        <input
                          type="number" placeholder="Value" value={opt.value}
                          onChange={e => {
                            const opts = [...formData.pricingOptions];
                            opts[i] = { ...opts[i], value: Number(e.target.value) };
                            setFormData(p => ({ ...p, pricingOptions: opts }));
                          }}
                          className="form-control" style={{ flex: 1 }}
                        />
                        <select
                          value={opt.unit}
                          onChange={e => {
                            const opts = [...formData.pricingOptions];
                            opts[i] = { ...opts[i], unit: e.target.value };
                            setFormData(p => ({ ...p, pricingOptions: opts }));
                          }}
                          className="form-control" style={{ flex: 1 }}
                        >
                          <option value="gram">gram</option>
                          <option value="kg">kg</option>
                          <option value="piece">piece</option>
                          <option value="dozen">dozen</option>
                          <option value="bundle">bundle</option>
                          <option value="pack">pack</option>
                        </select>
                        <input
                          type="number" placeholder="Price (₹)" value={opt.price}
                          onChange={e => {
                            const opts = [...formData.pricingOptions];
                            opts[i] = { ...opts[i], price: Number(e.target.value) };
                            setFormData(p => ({ ...p, pricingOptions: opts }));
                          }}
                          className="form-control" style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, pricingOptions: p.pricingOptions.filter((_, j) => j !== i) }))}
                          style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                        >×</button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, pricingOptions: [...p.pricingOptions, { label: '', value: 0, unit: formData.unitType === 'weight' ? 'gram' : 'piece', price: 0 }] }))}
                      style={{ fontFamily: 'Jost,sans-serif', fontSize: 13, color: '#B8960C', background: 'none', border: '1px dashed #B8960C', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', marginTop: 4 }}
                    >
                      + Add Option
                    </button>
                    <p style={{ fontFamily: 'Jost,sans-serif', fontSize: 11, color: '#8A8A8A', marginTop: 6 }}>
                      Label: display name (e.g. "250g"). Value: numeric amount. Unit: measurement unit. Price: price for this option.
                    </p>
                  </div>
                )}

                <div className="form-group">
                  <label>Product Images <span style={{color:'#C62828'}}>*</span></label>
                  <ImageUploader
                    multi
                    currentImages={formData.images && formData.images.length ? formData.images : (formData.image ? [formData.image] : [])}
                    onUpload={(urls) => setFormData(prev => ({ ...prev, images: urls, image: urls[0] || '' }))}
                    maxImages={5}
                  />
                  <p style={{ fontFamily: 'Jost,sans-serif', fontSize: 11, color: '#8A8A8A', marginTop: 6 }}>First image is the primary. Max 5 images.</p>
                </div>

                <div className="sd-form-actions">
                  <button type="submit" className="btn-submit">{editingId ? 'Update Product' : 'Add Product'}</button>
                  {editingId && (
                    <button type="button" className="sd-cancel-btn" onClick={() => { setEditingId(null); setFormData({ name:'',description:'',price:'',image:'',images:[],category:'Bouquets',stock:'',unitType:'count',stockUnit:'count',pricingOptions:[] }); setActiveTab('products'); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ── ORDERS ── */}
        {activeTab === 'orders' && (
          <section className="page-fade-in">
            <h2 className="sd-page-title">Orders</h2>

            <div className="sd-order-filters">
              {['All', ...ORDER_STATUSES].map(s => (
                <button
                  key={s}
                  className={`sd-filter-pill ${orderFilter === s ? 'active' : ''}`}
                  onClick={() => setOrderFilter(s)}
                >
                  {s}
                  {s !== 'All' && (
                    <span className="sd-pill-count">{orders.filter(o => o.status === s).length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="sd-card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o._id}>
                        <td className="td-text-dark">#{o._id.substring(0, 8)}</td>
                        <td className="td-text">{o.user?.name || o.shippingAddress?.fullName || '—'}</td>
                        <td className="td-text">{o.orderItems.map(i => i.selectedOption ? `${i.name} (${i.selectedOption.label})` : i.name).join(', ')}</td>
                        <td className="td-bold-gold">&#8377;{o.totalPrice}</td>
                        <td className="td-text">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>
                          <span className={`status-badge ${o.status.toLowerCase()}`}>{o.status}</span>
                        </td>
                        <td>
                          <select
                            value={o.status}
                            onChange={e => handleStatusChange(o._id, e.target.value)}
                            className="table-select"
                          >
                            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && <p className="sd-empty">No orders for this filter.</p>}
              </div>
            </div>
          </section>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <section className="page-fade-in">
            <h2 className="sd-page-title">Analytics</h2>
            <p className="sd-page-sub">Your sales performance over the last 6 months</p>
            {!analytics ? (
              <p className="sd-empty">Loading analytics…</p>
            ) : (
              <>
                {/* Monthly Revenue */}
                <div className="sd-card" style={{ marginBottom: 24 }}>
                  <h3 className="sd-card-title">Monthly Revenue (Delivered Orders)</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={analytics.monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0D8CC" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Jost,sans-serif' }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="#B8960C" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                  {/* Orders by Status */}
                  <div className="sd-card">
                    <h3 className="sd-card-title">Orders by Status</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={analytics.ordersByStatus} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0D8CC" />
                        <XAxis dataKey="status" tick={{ fontSize: 10, fontFamily: 'Jost,sans-serif' }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1A1A1A" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Products */}
                  <div className="sd-card">
                    <h3 className="sd-card-title">Top Selling Products</h3>
                    {analytics.topProducts.length === 0 ? (
                      <p className="sd-empty">No sales data yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analytics.topProducts} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E0D8CC" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontFamily: 'Jost,sans-serif' }} width={80} />
                          <Tooltip />
                          <Bar dataKey="qty" fill="#B8960C" radius={[0,3,3,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── PROFILE ── */}
        {activeTab === 'profile' && (
          <section className="page-fade-in">
            <h2 className="sd-page-title">Seller Profile</h2>
            <div className="sd-profile-card">
              <div className="sd-profile-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="sd-profile-info">
                <h3 className="sd-profile-name">{user?.name}</h3>
                <p className="sd-profile-email">{user?.email}</p>
                <p className="sd-profile-role">Role: <strong>{user?.role}</strong></p>
              </div>
              <div className="sd-profile-stats">
                <div className="sd-profile-stat">
                  <span className="sd-profile-stat-val">{stats?.totalProducts ?? 0}</span>
                  <span className="sd-profile-stat-lbl">Products Listed</span>
                </div>
                <div className="sd-profile-stat">
                  <span className="sd-profile-stat-val">{stats?.totalOrders ?? 0}</span>
                  <span className="sd-profile-stat-lbl">Total Orders</span>
                </div>
                <div className="sd-profile-stat">
                  <span className="sd-profile-stat-val">&#8377;{(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}</span>
                  <span className="sd-profile-stat-lbl">Revenue</span>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

export default SellerDashboard;
