/**
 * Migration: backfill unitType, stockUnit, pricingOptions on all existing products
 * Run once: node server/migrate-units.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('[FATAL] MONGO_URI not set in .env'); process.exit(1); }

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const result = await mongoose.connection.collection('products').updateMany(
    {
      $or: [
        { unitType:       { $exists: false } },
        { stockUnit:      { $exists: false } },
        { pricingOptions: { $exists: false } },
      ]
    },
    {
      $set: {
        unitType:       'count',
        stockUnit:      'count',
        pricingOptions: [],
      }
    }
  );

  console.log(`✅ Migration complete — ${result.modifiedCount} product(s) updated`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
