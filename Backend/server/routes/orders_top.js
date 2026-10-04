const express = require('express');
const {
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');

const { protect, isAdmin } = require('../middleware/authMiddleware');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const { restoreStockAndCoupon } = require('../controllers/orderController');
const { calcDeductGrams } = require('../utils/stockUtils');

const router = express.Router();

// ===========================
// USER ROUTES
// ===========================

// 1. Place a new order
router.post('/', protect, async (req, res) => {
  try {
    const { orderItems, totalAmount, totalPrice, paymentMethod, address, shippingAddress, couponCode, deliveryDate } = req.body;
    if (!orderItems || orderItems.length === 0) return res.status(400).json({ message: 'No items to order' });

    const resolvedAddress = address || (shippingAddress ? `${shippingAddress.address}, ${shippingAddress.city}` : '');
    if (!resolvedAddress && !shippingAddress) return res.status(400).json({ message: 'Address is required' });

    // Fetch all products once â€” eliminates N+1 queries
    const productIds = orderItems.map(i => i.product?._id || i.product);
    const products   = await Product.find({ _id: { $in: productIds } });
    const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

    // Validate stock
    for (const item of orderItems) {
      const productId = (item.product?._id || item.product).toString();
      const product   = productMap[productId];
      if (!product) return res.status(404).json({ message: `Product not found: ${item.name}` });
      const qty          = item.quantity || item.qty || 1;
      const deductGrams  = calcDeductGrams(product, item.selectedOption, qty);
      const needed       = deductGrams !== null ? deductGrams : qty;
      if (product.stock < needed) return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
    }

    // Deduct stock + notify seller if low
    for (const item of orderItems) {
      const productId   = (item.product?._id || item.product).toString();
      const product     = productMap[productId];
      const qty         = item.quantity || item.qty || 1;
      const deductGrams = calcDeductGrams(product, item.selectedOption, qty);
      const deduct      = deductGrams !== null ? deductGrams : qty;
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: -deduct } },
        { new: true }
      );
      // Notify seller if stock drops below 5
      if (updatedProduct && updatedProduct.stock < 5 && updatedProduct.sellerId) {
        const User = require('../models/User');
        const seller = await User.findById(updatedProduct.sellerId);
        if (seller) {
          seller.notifications.push({
            title: 'âš ï¸ Low Stock Alert',
            message: `"${updatedProduct.name}" is running low (${updatedProduct.stock} left). Please restock soon.`,
            type: 'alert',
          });
          await seller.save();
        }
      }
    }

    const finalTotal = totalPrice || totalAmount;
    const order = await Order.create({
      user: req.user._id,
      orderItems: orderItems.map(i => {
        const productId = (i.product?._id || i.product).toString();
        const product   = productMap[productId];
        // Lock price from DB at order time â€” prevents price manipulation
        const lockedPrice = i.selectedOption
          ? i.selectedOption.price
          : (product?.price || i.price);
        return {
          ...i,
          price:    lockedPrice,
          qty:      i.quantity || i.qty || 1,
          quantity: i.quantity || i.qty || 1,
          ...(i.selectedOption && { selectedOption: i.selectedOption }),
        };
      }),
      totalAmount: finalTotal, totalPrice: finalTotal,
      paymentMethod: paymentMethod || 'Cash On Delivery (COD)',
      address: resolvedAddress,
      shippingAddress: shippingAddress || null,
      isPaid: paymentMethod && paymentMethod !== 'cash' && paymentMethod !== 'Cash On Delivery (COD)',
      couponCode: couponCode || null,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      loyaltyPointsEarned: Math.floor((totalPrice || totalAmount || 0) / 10),
    });

    // Increment coupon usedCount if a coupon was applied
    if (couponCode) {
      const mongoose = require('mongoose');
      const Coupon = mongoose.models.Coupon;
      if (Coupon) {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
        if (coupon) {
          // Final guard: reject if limit already reached (race condition protection)
          if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            // Rollback: delete the just-created order and restore stock
            await Order.findByIdAndDelete(order._id);
            for (const item of orderItems) {
              const product = await Product.findById(item.product?._id || item.product);
              if (!product) continue;
              const qty = item.quantity || item.qty || 1;
              const grams = calcDeductGrams(product, item.selectedOption, qty);
              if (grams !== null) {
                await Product.findByIdAndUpdate(item.product?._id || item.product, { $inc: { stock: grams } });
              } else {
                await Product.findByIdAndUpdate(item.product?._id || item.product, { $inc: { stock: qty } });
              }
            }
            return res.status(400).json({ message: 'Coupon usage limit has been reached' });
          }
          await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    // Award loyalty points (1 point per â‚¹10 spent)
    const pointsEarned = Math.floor(finalTotal / 10);
    if (user && pointsEarned > 0) {
      user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
    }
    if (user) {
      user.notifications.push({ title: 'Order Placed Successfully!', message: `Your order #${order._id.toString().substring(0,8)} has been placed. Total: â‚¹${finalTotal}. You earned ${pointsEarned} loyalty points!`, type: 'order' });
      await user.save();
    }

    res.status(201).json(order);
  } catch (err) { res.status(500).json({ message: 'Order failed', error: err.message }); }
});

// 2. Get logged-in user's orders
router.get('/my-orders', protect, getMyOrders);

// 3. Cancel order â€” user can cancel if status is pending, processing, or shipped (before out for delivery)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only the owner can cancel
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const cancellableStatuses = ['pending', 'processing', 'shipped'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        message: 'Order cannot be cancelled at this stage. Only pending, processing, or shipped orders can be cancelled.'
      });
    }

    // Restore stock for each item
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      const qty = item.quantity || item.qty || 1;
      const opt = item.selectedOption;
      const grams = calcDeductGrams(product, opt, qty);
      if (grams !== null) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: grams } });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: qty } });
      }
    }

    order.status = 'cancelled';
    await order.save();

    // Decrement coupon usedCount on cancellation
    if (order.couponCode) {
      const mongoose = require('mongoose');
      const Coupon = mongoose.models.Coupon;
      if (Coupon) {
        await Coupon.findOneAndUpdate(
          { code: order.couponCode.toUpperCase().trim(), usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      }
    }

    res.json({ message: 'Order cancelled successfully', order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel order', error: err.message });
  }
