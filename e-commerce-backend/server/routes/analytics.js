const express  = require('express');
const router   = express.Router();
const Order    = require('../models/Order');
const User     = require('../models/User');
const Product  = require('../models/Product');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.use(protect, isAdmin);

// GET /api/analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [orders, users, products] = await Promise.all([
      Order.find({ createdAt: { $gte: twelveMonthsAgo } }).lean(),
      User.find({ role: 'user', createdAt: { $gte: twelveMonthsAgo } }).lean(),
      Product.find().lean(),
    ]);

    const monthlyMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = { month: key, revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += o.totalPrice || o.totalAmount || 0;
        monthlyMap[key].orders  += 1;
      }
    });

    const statusMap = {};
    orders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    const productFreq = {};
    orders.forEach(o => o.orderItems?.forEach(item => {
      const id = item.product?.toString();
      if (id) productFreq[id] = (productFreq[id] || 0) + (item.quantity || item.qty || 1);
    }));
    const topProductIds = Object.entries(productFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
    const topProducts = topProductIds.map(id => {
      const p = products.find(p => p._id.toString() === id);
      return p ? { name: p.name, qty: productFreq[id], category: p.category || p.type } : null;
    }).filter(Boolean);

    const userMonthMap = {};
    Object.keys(monthlyMap).forEach(k => { userMonthMap[k] = { month: k, newUsers: 0 }; });
    users.forEach(u => {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (userMonthMap[key]) userMonthMap[key].newUsers += 1;
    });

    const catMap = {};
    products.forEach(p => { const c = p.category || p.type || 'Other'; catMap[c] = (catMap[c] || 0) + 1; });
    const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    res.json({ monthlyData: Object.values(monthlyMap), ordersByStatus, topProducts, userGrowth: Object.values(userMonthMap), categoryData });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/export/orders
router.get('/export/orders', async (req, res) => {
  try {
    const { from, to, format = 'csv' } = req.query;
    const filter = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59));
    }
    const orders = await Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).lean();
    const rows = orders.map(o => ({
      'Order ID':  o._id.toString().slice(-8).toUpperCase(),
      'Customer':  o.user?.name || o.shippingAddress?.fullName || '—',
      'Email':     o.user?.email || '—',
      'Date':      new Date(o.createdAt).toLocaleDateString('en-IN'),
      'Items':     o.orderItems?.length || 0,
      'Total (₹)': o.totalPrice || o.totalAmount || 0,
      'Payment':   o.paymentMethod || 'COD',
      'Paid':      o.isPaid ? 'Yes' : 'No',
      'Status':    o.status,
    }));

    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buf);
    }

    const { Parser } = require('json2csv');
    const csv = new Parser({ fields: Object.keys(rows[0] || {}) }).parse(rows);
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/export/users
router.get('/export/users', async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 }).lean();
    const rows = users.map(u => ({
      'Name':     u.name,
      'Email':    u.email,
      'Role':     u.role,
      'Joined':   new Date(u.createdAt).toLocaleDateString('en-IN'),
      'Approved': u.isApproved ? 'Yes' : 'No',
    }));

    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buf);
    }

    const { Parser } = require('json2csv');
    const csv = new Parser({ fields: Object.keys(rows[0] || {}) }).parse(rows);
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
