const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { getAdminStats, exportOrdersCSV } = require('../controllers/adminController');
const {
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/adminController');
const { cloudinary, storage } = require('../utils/cloudinary');

const extractPublicId = (url) => {
  if (!url) return null;
  if (url.includes('res.cloudinary.com')) {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex !== -1) {
      return parts.slice(uploadIndex + 1).join('/').split('.')[0];
    }
  }
  return path.basename(url).split('.')[0];
};

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// parse pricingOptions whether it arrives as array or JSON string (multipart)
const parsePricingOptions = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return [];
};

// parse images field (array or JSON string)
const parseImages = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return [];
};

// Stats
router.get('/stats', protect, isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, orders] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.find().lean(),
    ]);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || o.totalAmount || 0), 0);
    res.json({ totalUsers, totalProducts, totalOrders, totalRevenue });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reviews
router.get('/reviews', protect, isAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Review = mongoose.models.Review;
    if (!Review) return res.json([]);
    const reviews = await Review.find().populate('product', 'name').sort({ createdAt: -1 }).lean();
    res.json(reviews.map(r => ({ ...r, productName: r.product?.name || '—' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Orders
router.get('/orders', protect, isAdmin, getAllOrders);
router.patch('/orders/:id', protect, isAdmin, updateOrderStatus);
router.put('/orders/:id/status', protect, isAdmin, updateOrderStatus);
router.get('/orders/export', protect, isAdmin, exportOrdersCSV);

// Users
router.get('/users', protect, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/users/:id', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Pending Sellers
router.get('/pending-sellers', protect, isAdmin, async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller', isApproved: false }).select('-password').sort({ createdAt: -1 }).lean();
    res.json(sellers);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// All Sellers
router.get('/all-sellers', protect, isAdmin, async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller' }).select('-password').sort({ createdAt: -1 }).lean();
    const orders  = await Order.find({ isPaid: true }).lean();
    const revenueMap = {};
    for (const order of orders) {
      for (const item of order.orderItems) {
        // Use item.seller (set at order time) for accurate per-seller revenue
        const sellerId = item.seller?.toString();
        if (sellerId) revenueMap[sellerId] = (revenueMap[sellerId] || 0) + (item.price * (item.quantity || item.qty || 1));
      }
    }
    res.json(sellers.map(s => ({ ...s, revenue: revenueMap[s._id.toString()] || 0 })));
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Approve / Reject Seller
router.post('/approve-seller/:id', protect, isAdmin, async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    seller.isApproved = true;
    await seller.save();
    res.json({ message: 'Seller approved successfully', seller });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/reject-seller/:id', protect, isAdmin, async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    seller.isApproved = false;
    await seller.save();
    res.json({ message: 'Seller approval revoked', seller });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/sellers/:id', protect, isAdmin, async (req, res) => {
  try {
    const seller = await User.findByIdAndDelete(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json({ message: 'Seller deleted successfully' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/sellers/:id/query', protect, isAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });
    const seller = await User.findById(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    if (!seller.adminNotes) seller.adminNotes = [];
    seller.adminNotes.push({ message, sentAt: new Date() });
    await seller.save();
    res.json({ message: 'Message sent to seller' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Products — list
router.get('/products', protect, isAdmin, async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: products.length, data: products });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Products — create
router.post('/products', protect, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, price, stock, type, category, description, unitType, stockUnit, pricingOptions } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }
    const imageUrl = req.file ? req.file.path : req.body.image;
    if (!imageUrl) return res.status(400).json({ success: false, error: 'Image is required' });

    const resolvedStockUnit = stockUnit || 'count';
    const resolvedUnitType  = unitType  || (
      ['gram','kg'].includes(resolvedStockUnit) ? 'weight' :
      resolvedStockUnit === 'piece'             ? 'piece'  : 'count'
    );
    const product = new Product({
      name,
      price: parseFloat(price),
      stock: stock ? parseInt(stock) : 0,
      type: type || category || '',
      category: category || type || 'Bouquets',
      description: description || '',
      image: imageUrl,
      unitType: resolvedUnitType,
      stockUnit: resolvedStockUnit,
      pricingOptions: parsePricingOptions(pricingOptions),
    });
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(err.errors).map(v => v.message).join(', ') });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Products — update
router.put('/products/:id', protect, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, price, stock, type, category, description, unitType, stockUnit, pricingOptions, images } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    if (name)                product.name        = name;
    if (price)               product.price       = parseFloat(price);
    if (stock !== undefined) product.stock       = parseInt(stock);
    if (type)                product.type        = type;
    if (category)            product.category    = category;
    if (description !== undefined) product.description = description;
    const resolvedStockUnit = stockUnit || product.stockUnit;
    const resolvedUnitType  = unitType  || (
      ['gram','kg'].includes(resolvedStockUnit) ? 'weight' :
      resolvedStockUnit === 'piece'             ? 'piece'  : 'count'
    );
    product.stockUnit      = resolvedStockUnit;
    product.unitType       = resolvedUnitType;
    if (pricingOptions !== undefined) product.pricingOptions = parsePricingOptions(pricingOptions);
    if (images !== undefined) product.images = parseImages(images);

    if (req.file) {
      if (product.image) {
        try {
          const publicId = extractPublicId(product.image);
          if (publicId) await cloudinary.uploader.destroy(publicId);
        } catch (e) { console.error('Error deleting old image:', e); }
      }
      product.image = req.file.path;
    }

    await product.save();
    res.json({ success: true, data: product });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(err.errors).map(v => v.message).join(', ') });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Products — delete
router.delete('/products/:id', protect, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.image) {
      try {
        const publicId = extractPublicId(product.image);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      } catch (e) { console.error('Error deleting image:', e); }
    }
    await product.deleteOne();
    res.json({ success: true, data: {} });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
