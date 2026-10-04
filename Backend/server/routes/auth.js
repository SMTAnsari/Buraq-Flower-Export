const express = require('express');
const { register, login, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// GET /api/auth/profile — restore session on page refresh
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/wishlist
router.get('/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist').select('wishlist');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.wishlist || []);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/auth/wishlist
router.post('/wishlist', protect, async (req, res) => {
  try {
    const { wishlist } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { wishlist: Array.isArray(wishlist) ? wishlist : [] },
      { new: true }
    ).populate('wishlist').select('wishlist');
    res.json(user.wishlist || []);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/auth/loyalty — get loyalty points balance
router.get('/loyalty', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('loyaltyPoints').lean();
    res.json({ points: user?.loyaltyPoints || 0 });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/auth/analytics — customer purchase history analytics
router.get('/analytics', protect, async (req, res) => {
  try {
    const Order = require('../models/Order');
    const orders = await Order.find({ user: req.user._id }).lean();
    const delivered = orders.filter(o => ['delivered','Delivered'].includes(o.status));
    const totalSpent = delivered.reduce((s, o) => s + (o.totalPrice || o.totalAmount || 0), 0);
    // Most ordered product
    const freq = {};
    orders.forEach(o => o.orderItems?.forEach(i => {
      const key = i.name;
      freq[key] = (freq[key] || 0) + (i.quantity || i.qty || 1);
    }));
    const topProduct = Object.entries(freq).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
    // Category breakdown
    const catFreq = {};
    orders.forEach(o => o.orderItems?.forEach(i => {
      if (i.category) catFreq[i.category] = (catFreq[i.category] || 0) + 1;
    }));
    const favouriteCategory = Object.entries(catFreq).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
    // Monthly spend (last 6 months)
    const now = new Date();
    const monthlySpend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const monthOrders = delivered.filter(o => {
        const ok = new Date(o.createdAt);
        return ok.getFullYear() === d.getFullYear() && ok.getMonth() === d.getMonth();
      });
      monthlySpend.push({ month: key, spent: monthOrders.reduce((s,o) => s+(o.totalPrice||o.totalAmount||0),0) });
    }
    res.json({ totalOrders: orders.length, totalSpent, topProduct, favouriteCategory, monthlySpend });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
