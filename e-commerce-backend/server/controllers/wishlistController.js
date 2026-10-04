const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

// Get user's wishlist
exports.getWishlist = async (req, res) => {
  try {
    const items = await Wishlist.find({ user: req.user._id }).populate("product");
    // Filter out entries where the product was deleted (populate returns null)
    const valid = items.filter(entry => entry.product != null);
    res.json(valid.map((entry) => ({
      _id: entry.product._id,
      name: entry.product.name,
      price: entry.product.price,
      image: entry.product.image,
      stock: entry.product.stock,
      type: entry.product.type,
      description: entry.product.description
    })));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add to wishlist
exports.addToWishlist = async (req, res) => {
  const { productId } = req.body;

  const exists = await Wishlist.findOne({ user: req.user._id, product: productId });
  if (exists) return res.status(400).json({ message: "Already in wishlist" });

  const item = await Wishlist.create({ user: req.user._id, product: productId });
  res.status(201).json(item);
};

// Remove from wishlist
exports.removeFromWishlist = async (req, res) => {
  const productId = req.params.id;

  await Wishlist.findOneAndDelete({ user: req.user._id, product: productId });
  res.json({ message: "Removed from wishlist" });
};



const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// PUT /api/users/profile - update name or address
exports.updateProfile = async (req, res) => {
  const { name, address } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = name || user.name;
    user.address = address || user.address;
    await user.save();

    res.json({ message: 'Profile updated', user: { name: user.name, address: user.address } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// PUT /api/users/change-password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Password change failed' });
  }
};
