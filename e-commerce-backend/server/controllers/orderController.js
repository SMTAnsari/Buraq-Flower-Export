const Order   = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { calcDeductGrams } = require('../utils/stockUtils');

// ── Shared helper: restore stock + decrement coupon when order is cancelled ──
const restoreStockAndCoupon = async (order) => {
  // Fetch all products at once — eliminates N+1 queries
  const productIds = order.orderItems.map(i => i.product);
  const products   = await Product.find({ _id: { $in: productIds } });
  const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

  for (const item of order.orderItems) {
    const product = productMap[item.product?.toString()];
    if (!product) continue;
    const qty   = item.quantity || item.qty || 1;
    const grams = calcDeductGrams(product, item.selectedOption, qty);
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: grams !== null ? grams : qty } });
  }

  if (order.couponCode) {
    const Coupon = mongoose.models.Coupon;
    if (Coupon) {
      await Coupon.findOneAndUpdate(
        { code: order.couponCode.toUpperCase().trim(), usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      );
    }
  }
};

const CANCELLED_STATUSES = ['cancelled', 'Cancelled'];

// GET /api/orders/my-orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id || req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const userId = req.user._id?.toString() || req.user.id;
    if (req.user.role !== 'admin' && order.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching order', error: err.message });
  }
};

// GET /api/orders — Admin only
exports.getAllOrders = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find().populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(),
    ]);
    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all orders' });
  }
};

// PUT /api/orders/:id/status — Admin only
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { status } = req.body;
    const wasAlreadyCancelled = CANCELLED_STATUSES.includes(order.status);
    const isNowCancelled      = CANCELLED_STATUSES.includes(status);

    // Restore stock + coupon only when transitioning INTO cancelled (not already cancelled)
    if (isNowCancelled && !wasAlreadyCancelled) {
      await restoreStockAndCoupon(order);
    }

    order.status = status;
    if (['delivered', 'Delivered'].includes(status)) order.isPaid = true;

    await order.save();

    // Notify user
    const User = require('../models/User');
    const user = await User.findById(order.user);
    if (user) {
      user.notifications.push({
        title: `Order ${status}`,
        message: `Your order #${order._id.toString().substring(0, 8)} is now ${status}.`,
        type: 'order',
      });
      await user.save();
    }

    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order', error: err.message });
  }
};

// Export helper for use in other routes
exports.restoreStockAndCoupon = restoreStockAndCoupon;
