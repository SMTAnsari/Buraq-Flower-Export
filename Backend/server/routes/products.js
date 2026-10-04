const express = require('express');
const router  = express.Router();
const Product = require('../models/Product');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// ── Redis cache (optional — graceful fallback) ────────────────────────────
let redisClient = null;
const CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL || '300');
(async () => {
  try {
    const { createClient } = require('redis');
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', () => { redisClient = null; });
    await client.connect();
    redisClient = client;
    console.log('Redis connected — product caching enabled');
  } catch {
    console.log('Redis unavailable — falling back to DB');
  }
})();

const PRODUCTS_CACHE_KEY = 'products:all';
const invalidateCache = async () => {
  if (!redisClient) return;
  try { const keys = await redisClient.keys('products:*'); if (keys.length) await redisClient.del(keys); } catch {}
};

// isSeller middleware — allow seller or admin
const isSeller = (req, res, next) => {
  if (req.user?.role === 'seller' || req.user?.role === 'admin') return next();
  res.status(403).json({ message: 'Seller or admin access required' });
};

// GET /api/products/search-suggestions?q=
router.get('/search-suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const products = await Product.find(
      { name: { $regex: escaped, $options: 'i' } },
      { name: 1, category: 1, type: 1, image: 1, price: 1 }
    ).limit(6).lean();
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    if (redisClient && !category && !search && page === 1) {
      try {
        const cached = await redisClient.get(PRODUCTS_CACHE_KEY);
        if (cached) return res.json(JSON.parse(cached));
      } catch {}
    }

    const query = {};
    if (category) query.$or = [{ category }, { type: category }];
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: escaped, $options: 'i' };
    }

    const [products, total] = await Promise.all([
      Product.find(query).populate('sellerId', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(query),
    ]);

    if (redisClient && !category && !search && page === 1) {
      try { await redisClient.setEx(PRODUCTS_CACHE_KEY, CACHE_TTL, JSON.stringify({ success: true, count: total, data: products })); } catch {}
    }

    res.json({ success: true, count: total, page, pages: Math.ceil(total / limit), data: products });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId', 'name');
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/products — seller or admin
router.post('/', protect, isSeller, async (req, res) => {
  try {
    const { name, price, stock, category, type, description, image, images, unitType, stockUnit, pricingOptions } = req.body;
    if (!name || !price || !image) {
      return res.status(400).json({ success: false, error: 'Name, price, and image are required' });
    }
    const resolvedStockUnit = stockUnit || 'count';
    const resolvedUnitType  = unitType  || (
      ['gram','kg'].includes(resolvedStockUnit) ? 'weight' :
      resolvedStockUnit === 'piece'             ? 'piece'  : 'count'
    );
    const product = await Product.create({
      name, price: parseFloat(price), stock: parseInt(stock) || 0,
      category: category || type || 'Bouquets', type: type || category || '',
      description: description || '', image,
      images: Array.isArray(images) ? images : [],
      sellerId: req.user._id,
      unitType: resolvedUnitType,
      stockUnit: resolvedStockUnit,
      pricingOptions: Array.isArray(pricingOptions) ? pricingOptions : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    });
    await invalidateCache();
    res.status(201).json({ success: true, data: product });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT /api/products/:id — seller (own) or admin
router.put('/:id', protect, isSeller, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (req.user.role === 'seller' && product.sellerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this product' });
    }
    const { name, price, stock, category, type, description, image, images, unitType, stockUnit, pricingOptions } = req.body;
    if (name)                    product.name        = name;
    if (price)                   product.price       = parseFloat(price);
    if (stock !== undefined)     product.stock       = parseInt(stock);
    if (category)                product.category    = category;
    if (type)                    product.type        = type;
    if (description !== undefined) product.description = description;
    if (image)                   product.image       = image;
    if (Array.isArray(images))   product.images      = images;
    // Auto-derive unitType from stockUnit when not explicitly provided
    const resolvedStockUnit = stockUnit || product.stockUnit;
    const resolvedUnitType  = unitType  || (
      ['gram','kg'].includes(resolvedStockUnit) ? 'weight' :
      resolvedStockUnit === 'piece'             ? 'piece'  : 'count'
    );
    product.stockUnit      = resolvedStockUnit;
    product.unitType       = resolvedUnitType;
    if (Array.isArray(pricingOptions)) product.pricingOptions = pricingOptions;
    if (Array.isArray(req.body.tags))   product.tags = req.body.tags;
    await product.save();
    await invalidateCache();
    res.json({ success: true, data: product });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/products/:id — seller (own) or admin
router.delete('/:id', protect, isSeller, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (req.user.role === 'seller' && product.sellerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }
    await product.deleteOne();
    await invalidateCache();
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
