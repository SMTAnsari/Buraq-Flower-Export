/**
 * Seed temp reviews for all products (4–5 stars only)
 * Run: node server/seed-reviews.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const Product  = require('./models/Product');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('[FATAL] MONGO_URI not set'); process.exit(1); }

const REVIEWER_NAMES = [
  'Priya Sharma', 'Rahul Mehta', 'Ananya Iyer', 'Karthik Nair', 'Divya Reddy',
  'Arjun Patel', 'Sneha Krishnan', 'Vikram Singh', 'Meera Joshi', 'Arun Kumar',
  'Lakshmi Devi', 'Suresh Babu', 'Pooja Gupta', 'Ravi Shankar', 'Nisha Thomas',
];

const REVIEW_TEMPLATES = [
  { title: 'Absolutely beautiful!', body: 'The flowers were fresh and fragrant. Delivered on time and well packed. Will definitely order again!' },
  { title: 'Exceeded expectations', body: 'I was amazed by the quality. The arrangement looked even better than the photos. Highly recommend!' },
  { title: 'Perfect gift', body: 'Ordered this as a gift and the recipient loved it. The flowers stayed fresh for over a week.' },
  { title: 'Great quality', body: 'Very fresh flowers, beautiful arrangement. The packaging was excellent and nothing was damaged.' },
  { title: 'Lovely flowers', body: 'Stunning quality and the fragrance is wonderful. Fast delivery and great customer service.' },
  { title: 'Worth every rupee', body: 'Premium quality flowers at a reasonable price. The arrangement was exactly as shown.' },
  { title: 'Highly recommended', body: 'Ordered multiple times and always satisfied. Fresh flowers, on-time delivery, beautiful presentation.' },
  { title: 'Beautiful arrangement', body: 'The flowers were vibrant and fresh. Perfect for the occasion. Will order again for sure.' },
  { title: 'Amazing freshness', body: 'Surprised by how fresh the flowers were upon delivery. Lasted much longer than expected.' },
  { title: 'Delightful purchase', body: 'Everything about this was perfect — the quality, the packaging, and the delivery speed.' },
];

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const reviewSchema = new mongoose.Schema({
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    title:    { type: String, default: '' },
    body:     { type: String, default: '' },
    images:   [{ type: String }],
    verified: { type: Boolean, default: true },
    hidden:   { type: Boolean, default: false },
  }, { timestamps: true });
  reviewSchema.index({ product: 1, user: 1 });
  const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

  const products = await Product.find({}).lean();
  console.log(`Found ${products.length} products`);

  let totalAdded = 0;

  for (const product of products) {
    // Check existing review count
    const existing = await Review.countDocuments({ product: product._id });
    if (existing >= 3) {
      console.log(`  Skipping ${product.name} — already has ${existing} reviews`);
      continue;
    }

    const toAdd = randomBetween(3, 5) - existing;
    const usedNames = new Set();

    for (let i = 0; i < toAdd; i++) {
      let name;
      do { name = randomFrom(REVIEWER_NAMES); } while (usedNames.has(name));
      usedNames.add(name);

      const template = randomFrom(REVIEW_TEMPLATES);
      const rating   = randomBetween(4, 5);

      // Use a fake ObjectId so unique index (product+user) doesn't conflict
      const fakeUserId = new mongoose.Types.ObjectId();

      await Review.create({
        product:  product._id,
        user:     fakeUserId,
        userName: name,
        rating,
        title:    template.title,
        body:     template.body,
        images:   [],
        verified: true,
        hidden:   false,
      });
      totalAdded++;
    }

    // Update product averageRating and reviewCount
    const allReviews = await Review.find({ product: product._id, hidden: false });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(product._id, {
      averageRating: Math.round(avg * 10) / 10,
      reviewCount: allReviews.length,
    });

    console.log(`  ✅ ${product.name} — added ${toAdd} reviews (avg: ${avg.toFixed(1)})`);
  }

  console.log(`\n✅ Done — ${totalAdded} reviews added across ${products.length} products`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
