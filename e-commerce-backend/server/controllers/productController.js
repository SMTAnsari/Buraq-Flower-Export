const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res) => {
  try {
    const [totalProducts, totalOrders, pendingOrders, completedOrders] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' })
    ]);

    res.json({
      success: true,
      data: { totalProducts, totalOrders, pendingOrders, completedOrders }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error while fetching stats' });
  }
};

// @desc    Export orders to CSV
// @route   GET /api/admin/orders/export
// @access  Private/Admin
exports.exportOrdersCSV = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });

    let csv = 'Order ID,Date,Customer,Total,Status\n';
    orders.forEach(order => {
      csv += `"${order._id}","${order.createdAt.toISOString()}","${order.user?.name || ''}","${order.totalAmount}","${order.status}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('orders-export.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error during order export' });
  }
};

// GET /api/products — public
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
};

// POST /api/products — admin only (image upload handled in route middleware)
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create product', error: err.message });
  }
};
