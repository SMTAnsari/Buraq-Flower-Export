const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require("../models/User");
// const Order = require("../models/Order");
// const Product = require("../models/Product");

const { Parser } = require('json2csv');

exports.exportOrdersCSV = async (req, res) => {
  const orders = await Order.find().populate('user', 'email');

  const flatData = orders.map(order => ({
    OrderID: order._id,
    Email: order.user?.email,
    Amount: order.totalAmount,
    Paid: order.isPaid,
    Payment: order.paymentMethod,
    Status: order.status,
    Date: order.createdAt.toISOString().slice(0, 10)
  }));

  const csv = new Parser().parse(flatData);
  res.header('Content-Type', 'text/csv');
  res.attachment('orders_report.csv');
  return res.send(csv);
};

exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.revenue || 0,
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ message: 'Failed to load stats' });
  }
};

// exports.getStats = async (req, res) => {
//   try {
//     const totalOrders = await Order.countDocuments();
//     const totalRevenueData = await Order.aggregate([
//       { $match: { isPaid: true } },
//       { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//     ]);
//     const totalRevenue = totalRevenueData[0]?.total || 0;

//     const pendingOrders = await Order.countDocuments({ status: 'pending' });
//     const productsCount = await Product.countDocuments();

//     res.json({
//       totalOrders,
//       totalRevenue,
//       pendingOrders,
//       productsCount
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
//   }
// };

// 🧾 View all orders
exports.getAllOrders = async (req, res) => {
  const { status, from, to, limit } = req.query;

  const query = {};
  if (status) query.status = status;

  if (from && to) {
    query.createdAt = {
      $gte: new Date(from),
      $lte: new Date(to)
    };
  }

  const orders = await Order.find(query)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit ? parseInt(limit) : 0);

  res.json(orders);
};


// ✅ Update order status
exports.updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  order.status = req.body.status || order.status;
  await order.save();

  res.json({ message: 'Order status updated', order });
};

// 📦 View all products
exports.getAllProducts = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};

// ✏️ Update product
exports.updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const { name, type, price, stock, image, description } = req.body;

  product.name = name || product.name;
  product.type = type || product.type;
  product.price = price || product.price;
  product.stock = stock || product.stock;
  product.image = image || product.image;
  product.description = description || product.description;

  await product.save();

  res.json({ message: 'Product updated', product });
};

// ❌ Delete product
exports.deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found or already deleted' });

  res.json({ message: 'Product deleted' });
};
