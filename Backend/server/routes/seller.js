const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');
const Product = require('../models/Product');
const User    = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { restoreStockAndCoupon } = require('../controllers/orderController');

const isSeller = (req, res, next) => {
  if (req.user?.role === 'seller' || req.user?.role === 'admin') return next();
  res.status(403).json({ message: 'Seller access required' });
};

router.use(protect, isSeller);

// GET /api/seller/products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/seller/stats
router.get('/stats', async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user._id });
    const productIds = products.map(p => p._id);
    const orders = await Order.find({ 'orderItems.product': { $in: productIds } });
    const totalRevenue = orders
      .filter(o => ['delivered', 'Delivered'].includes(o.status))
      .reduce((sum, o) => sum + (o.totalPrice || o.totalAmount || 0), 0);
    const lowStock = products.filter(p => p.stock < 5);
    res.json({
      totalProducts: products.length, totalOrders: orders.length,
      totalRevenue, lowStockCount: lowStock.length,
      lowStockProducts: lowStock.map(p => ({ _id: p._id, name: p.name, stock: p.stock })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/seller/analytics
router.get('/analytics', async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).lean();
    const productIds = products.map(p => p._id);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const orders = await Order.find({ 'orderItems.product': { $in: productIds }, createdAt: { $gte: sixMonthsAgo } }).lean();

    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = { month: key, revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) return;
      const sellerItems = o.orderItems.filter(item => productIds.some(id => id.toString() === item.product?.toString()));
      const rev = sellerItems.reduce((s, item) => s + item.price * (item.quantity || item.qty || 1), 0);
      if (['delivered', 'Delivered'].includes(o.status)) monthlyMap[key].revenue += rev;
      monthlyMap[key].orders += 1;
    });

    const statusMap = {};
    orders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    const productFreq = {};
    orders.forEach(o => o.orderItems.forEach(item => {
      const id = item.product?.toString();
      if (id && productIds.some(pid => pid.toString() === id)) {
        productFreq[id] = (productFreq[id] || 0) + (item.quantity || item.qty || 1);
      }
    }));
    const topProducts = Object.entries(productFreq).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, qty]) => { const p = products.find(p => p._id.toString() === id); return p ? { name: p.name, qty, category: p.category || p.type } : null; })
      .filter(Boolean);

    res.json({ monthlyData: Object.values(monthlyMap), ordersByStatus, topProducts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/seller/products/:id/restock
router.patch('/products/:id/restock', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ message: 'Quantity must be at least 1' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.sellerId?.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    product.stock += Number(quantity);
    await product.save();
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/seller/orders
router.get('/orders', async (req, res) => {
  try {
    const sellerProducts = await Product.find({ sellerId: req.user._id });
    const productIds = sellerProducts.map(p => p._id);
    const orders = await Order.find({ 'orderItems.product': { $in: productIds } })
      .populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/seller/orders/:id/status
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const wasAlreadyCancelled = ['cancelled', 'Cancelled'].includes(order.status);
    const isNowCancelled      = ['cancelled', 'Cancelled'].includes(status);

    if (isNowCancelled && !wasAlreadyCancelled) {
      await restoreStockAndCoupon(order);
    }

    order.status = status;
    await order.save();

    const user = await User.findById(order.user);
    if (user) {
      user.notifications.push({ title: `Order ${status}`, message: `Your order #${order._id.toString().substring(0, 8)} is now ${status}.`, type: 'order' });
      await user.save();
    }
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
