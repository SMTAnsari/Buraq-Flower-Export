const razorpay = require('../utils/razorpayInstance');
const crypto = require('crypto');
const Order = require('../models/Order');

// Create Razorpay order
// exports.createRazorpayOrder = async (req, res) => {
//   const { amount, currency = 'INR', receipt } = req.body;

//   const options = {
//     amount: amount * 100, // Amount in paise
//     currency,
//     receipt
//   };

//   try {
//     const order = await razorpay.orders.create(options);
//     res.json(order);
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to create Razorpay order', error: error.message });
//   }
// };

// Verify Razorpay signature
exports.verifyRazorpayPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    // Update order in DB
    const order = await Order.findById(orderId);
    if (order) {
      order.isPaid = true;
      await order.save();
    }
    res.json({ success: true, message: 'Payment verified' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid signature' });
  }
};


exports.createRazorpayOrder = async (req, res) => {
  const { amount, currency = 'INR', receipt } = req.body;

  console.log("📦 Creating Razorpay Order with:", { amount, currency, receipt });

  const options = {
    amount: amount * 100,
    currency,
    receipt
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("❌ Razorpay Create Error:", error); // Add this
    res.status(500).json({ message: 'Failed to create Razorpay order', error: error.message });
  }
};


