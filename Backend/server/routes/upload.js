const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { protect } = require('../middleware/authMiddleware');

// ── Cloudinary (uses existing config from utils/cloudinary.js) ────────────
let cloudinary = null;
try {
  const c = require('../utils/cloudinary');
  cloudinary = c.cloudinary;
  if (!process.env.CLOUDINARY_CLOUD_NAME) cloudinary = null;
} catch { cloudinary = null; }

// ── Local storage fallback ────────────────────────────────────────────────
const uploadPath = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage    = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG, PNG, WebP allowed'), false);
};
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

// ── Process buffer → webp via sharp ──────────────────────────────────────
const toWebp = async (buffer) => {
  try {
    const sharp = require('sharp');
    return await sharp(buffer)
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return buffer; // sharp not installed — return original
  }
};

const saveLocal = async (buffer) => {
  const filename   = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const outputPath = path.join(uploadPath, filename);
  await fs.promises.writeFile(outputPath, buffer);
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}/uploads/products/${filename}`;
};

const saveCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'buraq-flowers', format: 'webp', transformation: [{ width: 800, height: 800, crop: 'limit', quality: 82 }] },
      (err, result) => err ? reject(err) : resolve(result.secure_url)
    );
    stream.end(buffer);
  });

// POST /api/upload/product — single image
router.post('/product', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    const buf = await toWebp(req.file.buffer);
    const imageUrl = cloudinary ? await saveCloudinary(buf) : await saveLocal(buf);
    res.json({ imageUrl });
  } catch (err) { res.status(500).json({ message: err.message || 'Upload failed' }); }
});

// POST /api/upload/products — multiple images (max 5)
router.post('/products', protect, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No images provided' });
    const urls = await Promise.all(
      req.files.map(async (file) => {
        const buf = await toWebp(file.buffer);
        return cloudinary ? saveCloudinary(buf) : saveLocal(buf);
      })
    );
    res.json({ imageUrls: urls });
  } catch (err) { res.status(500).json({ message: err.message || 'Upload failed' }); }
});

// POST /api/upload/review — review images (max 3)
router.post('/review', protect, upload.array('images', 3), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No images provided' });
    const urls = await Promise.all(
      req.files.map(async (file) => {
        const buf = await toWebp(file.buffer);
        return cloudinary ? saveCloudinary(buf) : saveLocal(buf);
      })
    );
    res.json({ imageUrls: urls });
  } catch (err) { res.status(500).json({ message: err.message || 'Upload failed' }); }
});

module.exports = router;
