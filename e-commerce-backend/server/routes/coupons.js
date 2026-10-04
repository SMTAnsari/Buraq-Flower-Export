const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const couponSchema = new mongoose.Schema({
  code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
  type:        { type: String, enum: ['percentage', 'fixed'], required: true },
  value:       { type: Number, required: true, min: 0 },
  minOrder:    { type: Number, default: 0 },
  maxUses:     { type: Number, default: null },
  usedCount:   { type: Number, default: 0 },
  expiresAt:   { type: Date, default: null },
  isActive:    { type: Boolean, default: true },
  description: { type: String, default: '' },
}, { timestamps: true });

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

// POST /api/coupons/validate
router.post('/validate', protect, async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code is required' });
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon || !coupon.isActive) return res.status(404).json({ message: 'Invalid or expired coupon code' });
    if (coupon.expiresAt && new Date() > coupon.expiresAt) return res.status(400).json({ message: 'This coupon has expired' });
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: 'Coupon usage limit reached' });
    if (orderTotal < coupon.minOrder) return res.status(400).json({ message: `Minimum order amount is ₹${coupon.minOrder}` });
    const discount = coupon.type === 'percentage'
      ? Math.round(orderTotal * coupon.value / 100)
      : Math.min(coupon.value, orderTotal);
    res.json({ valid: true, coupon: { code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description }, discount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/coupons — admin
router.get('/', protect, isAdmin, async (req, res) => {
  try { res.json(await Coupon.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/coupons — admin
router.post('/', protect, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase().trim() });
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Coupon code already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/coupons/:id — admin
router.put('/:id', protect, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/coupons/:id — admin
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try { await Coupon.findByIdAndDelete(req.params.id); res.json({ message: 'Coupon deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/coupons/:id/toggle — admin
router.patch('/:id/toggle', protect, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json(coupon);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
