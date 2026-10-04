const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  password:        { type: String, required: true },
  role:            { type: String, enum: ['user', 'admin', 'seller'], default: 'user' },
  isApproved:      { type: Boolean, default: function () { return this.role !== 'seller'; } },
  businessName:    { type: String, default: '' },
  businessAddress: { type: String, default: '' },
  resetToken:      String,
  resetTokenExpiry: Date,

  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String, price: Number, image: String,
    qty: { type: Number, default: 1 }, stock: Number,
    selectedOption: {
      label: String, value: Number, unit: String, price: Number,
    },
  }],

  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  addresses: [{
    fullName:     { type: String, required: true },
    phone:        { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city:         { type: String, required: true },
    state:        { type: String, default: '' },
    postalCode:   { type: String, required: true },
    country:      { type: String, default: 'India' },
    isDefault:    { type: Boolean, default: false },
  }],

  adminNotes: [{ message: String, sentAt: Date }],

  loyaltyPoints: { type: Number, default: 0 },

  notifications: [{
    title:     { type: String, required: true },
    message:   { type: String, required: true },
    type:      { type: String, enum: ['order', 'system', 'offer', 'alert', 'success'], default: 'system' },
    isRead:    { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
