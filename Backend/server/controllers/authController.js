const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '2d' }
  );
};

const crypto = require('crypto');

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not registered' });

    // Generate reset token and expiry
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    // Create frontend reset link
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    console.log(`🔐 RESET LINK: ${resetLink}`);

    // ✅ Return reset link/token (for development only)
    res.json({
      message: 'Reset link generated (see console or use token)',
      token: resetToken,          // optionally use this in frontend
      resetLink                  // for frontend redirect if needed
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: 'Server error while generating reset link' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() }
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

  user.password = password;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;

  await user.save();

  res.json({ message: 'Password reset successful. You can now log in.' });
};


exports.register = async (req, res) => {
  try {
    const { name, email, password, role, businessName, businessAddress } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const allowedRoles = ['user', 'seller'];
    const assignedRole = allowedRoles.includes(role) ? role : 'user';

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      businessName: assignedRole === 'seller' ? (businessName || '') : '',
      businessAddress: assignedRole === 'seller' ? (businessAddress || '') : '',
    });

    // Sellers need admin approval — don't issue token yet
    if (assignedRole === 'seller') {
      return res.status(201).json({
        message: 'Seller account created. Awaiting admin approval.',
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    }

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Block unapproved sellers
    if (user.role === 'seller' && !user.isApproved) {
      return res.status(403).json({ message: 'Your seller account is pending admin approval.' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};
