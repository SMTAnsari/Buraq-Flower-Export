const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) return res.json(user);
  res.status(404).json({ message: 'User not found' });
};

// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.address = req.body.address || user.address;

    const updated = await user.save();
    res.json({ message: 'Profile updated', user: updated });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// PUT /api/users/profile/password
exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (user && await bcrypt.compare(currentPassword, user.password)) {
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } else {
    res.status(400).json({ message: 'Invalid current password' });
  }
};
// DELETE /api/users/profile