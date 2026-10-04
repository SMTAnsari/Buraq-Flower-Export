const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const Order    = require('../models/Order');
const Product  = require('../models/Product');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const reviewSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  rating:   { type: Number, required: true, min: 1, max: 5 },
  title:    { type: String, trim: true, maxlength: 100, default: '' },
  body:     { type: String, trim: true, maxlength: 1000, default: '' },
  images:   [{ type: String }],
  verified: { type: Boolean, default: false },
  hidden:   { type: Boolean, default: false },
}, { timestamps: true });

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

// GET /api/reviews/:productId
router.get('/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId, hidden: false }).sort({ createdAt: -1 }).select('-hidden');
    const total = reviews.length;
    const avg   = total ? Number((reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)) : 0;

    // Rating breakdown (5→1)
    const breakdown = [5,4,3,2,1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length,
      pct:   total ? Math.round(reviews.filter(r => r.rating === star).length / total * 100) : 0,
    }));

    // Keep product averageRating in sync
    if (total > 0) {
      await Product.findByIdAndUpdate(req.params.productId, { averageRating: avg, reviewCount: total });
    }

    res.json({ reviews, averageRating: avg, totalReviews: total, breakdown });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/reviews/:productId
router.post('/:productId', protect, async (req, res) => {
  try {
    const { rating, title, body: reviewBody } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1–5' });
    const productId = req.params.productId;

    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'orderItems.product': productId,
      status: { $in: ['delivered', 'Delivered'] },
    });

    const existing = await Review.findOne({ product: productId, user: req.user._id });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this product' });

    const review = await Review.create({
      product: productId, user: req.user._id,
      userName: req.user.name || 'Customer',
      rating: Number(rating), title: title || '', body: reviewBody || '',
      images: Array.isArray(req.body.images) ? req.body.images.slice(0, 3) : [],
      verified: !!hasPurchased,
    });

    const all = await Review.find({ product: productId, hidden: false });
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    await Product.findByIdAndUpdate(productId, { averageRating: avg, reviewCount: all.length });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'You have already reviewed this product' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reviews/:id — admin
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ message: 'Review deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/reviews/:id/hide — admin
router.patch('/:id/hide', protect, isAdmin, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { hidden: true }, { new: true });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ message: 'Review hidden', review });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
