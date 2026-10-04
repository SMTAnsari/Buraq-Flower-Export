const mongoose = require('mongoose');

const UNITS = ['gram', 'kg', 'piece', 'dozen', 'bundle', 'pack', 'count'];

const pricingOptionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  unit:  { type: String, required: true, enum: UNITS },
  price: { type: Number, required: true },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  description:   { type: String, default: '' },
  price:         { type: Number, required: true },
  image:         { type: String, required: true },
  images:        [{ type: String }],
  category:      { type: String, default: 'Bouquets' },
  type:          { type: String, default: '' },
  stock:         { type: Number, default: 0 },
  unitType:      { type: String, enum: ['weight', 'piece', 'count'], default: 'count' },
  stockUnit:     { type: String, enum: UNITS, default: 'count' },
  pricingOptions: { type: [pricingOptionSchema], default: [] },
  tags:          [{ type: String, trim: true }],
  sellerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  averageRating: { type: Number, default: 0 },
  reviewCount:   { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
