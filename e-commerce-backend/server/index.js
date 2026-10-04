require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');
const fs         = require('fs');
const rateLimit  = require('express-rate-limit');

// ── Startup validation ────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) { console.error('[FATAL] JWT_SECRET not set'); process.exit(1); }
if (!process.env.MONGO_URI)  { console.error('[FATAL] MONGO_URI not set');  process.exit(1); }

const app  = express();
const PORT = process.env.PORT || 5001;

// ── Security middleware ───────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Sanitize user input — prevent NoSQL injection & XSS (Express 5 compatible)
// xss-clean and express-mongo-sanitize both assign req.query which is read-only in Express 5
const { clean: xssClean } = require('xss-clean/lib/xss');
const sanitize = (v) => {
  if (!v || typeof v !== 'object') return;
  for (const key of Object.keys(v)) {
    if (key.startsWith('$') || key.includes('.')) { delete v[key]; continue; }
    if (typeof v[key] === 'string') v[key] = xssClean(v[key]);
    else sanitize(v[key]);
  }
};
app.use((req, _res, next) => {
  if (req.body)   sanitize(req.body);
  if (req.params) sanitize(req.params);
  next();
});

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175').split(',');
app.use(cors({ origin: allowedOrigins, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));

// ── Rate limiters ─────────────────────────────────────────────────────────
const authLimiter    = rateLimit({ windowMs: 15*60*1000, max: 20, message: { message: 'Too many requests, try again later.' } });
const contactLimiter = rateLimit({ windowMs: 60*60*1000, max: 10, message: { message: 'Too many contact submissions.' } });
const generalLimiter = rateLimit({ windowMs: 15*60*1000, max: 300 });
app.use(generalLimiter);

// ── Static uploads ────────────────────────────────────────────────────────
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
const productsUploadPath = path.join(uploadPath, 'products');
if (!fs.existsSync(productsUploadPath)) fs.mkdirSync(productsUploadPath, { recursive: true });

app.use('/uploads', express.static(uploadPath));
app.use('/uploads/products', express.static(productsUploadPath));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'Buraq Flower Exports API 🌸', status: 'ok' }));
app.get('/api/health', async (req, res) => {
  try { await mongoose.connection.db.admin().ping(); res.json({ status: 'ok', db: 'connected' }); }
  catch { res.status(500).json({ status: 'error', db: 'disconnected' }); }
});

// ── Rate limit sensitive routes ───────────────────────────────────────────
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/contact',       contactLimiter);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/seller',        require('./routes/seller'));
app.use('/api/upload',        require('./routes/upload'));
app.use('/api/addresses',     require('./routes/addresses'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/coupons',       require('./routes/coupons'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/contact',       require('./routes/contactRoutes'));
app.use('/api/wishlist',      require('./routes/wishlistRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);
  res.status(status).json({ success: false, message: err.message || 'Server error' });
});

// ── MongoDB connection ────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    // Ensure indexes
    const Product = require('./models/Product');
    const Order   = require('./models/Order');
    await Product.collection.createIndex({ category: 1 });
    await Product.collection.createIndex({ createdAt: -1 });
    await Order.collection.createIndex({ user: 1 });
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ createdAt: -1 });
    console.log('Indexes ensured');
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });

// ── Start server ──────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🌐 Server running on http://localhost:${PORT}`));
