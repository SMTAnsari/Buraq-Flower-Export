const mongoose = require('mongoose');

const trackingStageSchema = new mongoose.Schema({
  stage:     { type: String, required: true },
  completed: { type: Boolean, default: false },
  timestamp: { type: Date, default: null },
}, { _id: false });

const TRACKING_STAGES = [
  'Order Placed', 'Order Confirmed', 'Being Prepared', 'Out for Delivery', 'Delivered'
];

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  orderItems: [{
    name:     String,
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    qty:      Number,
    price:    Number,
    seller:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    selectedOption: {
      label: String,
      value: Number,
      unit:  String,
      price: Number,
    },
  }],

  // Structured shipping address (new) + flat address string (legacy)
  shippingAddress: {
    fullName:   String,
    address:    String,
    city:       String,
    postalCode: String,
    phone:      String,
  },
  address: { type: String, default: '' },

  paymentMethod: { type: String, default: 'Cash On Delivery (COD)' },
  isPaid:        { type: Boolean, default: false },

  // totalPrice (new) + totalAmount (legacy) — both stored
  totalPrice:  Number,
  totalAmount: Number,

  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'out for delivery', 'delivered', 'cancelled',
           'Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },

  trackingStages: {
    type: [trackingStageSchema],
    default: () => TRACKING_STAGES.map((stage, i) => ({
      stage,
      completed: i === 0,
      timestamp: i === 0 ? new Date() : null,
    })),
  },

  couponCode: { type: String, default: null },
  deliveryDate: { type: Date, default: null },
  loyaltyPointsEarned: { type: Number, default: 0 },
  invoicePath: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
module.exports.TRACKING_STAGES = TRACKING_STAGES;
