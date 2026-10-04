const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// GET /api/addresses
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.addresses || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/addresses
router.post('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;
    if (!fullName || !phone || !addressLine1 || !city || !postalCode) {
      return res.status(400).json({ message: 'fullName, phone, addressLine1, city, postalCode are required' });
    }
    const makeDefault = isDefault || user.addresses.length === 0;
    if (makeDefault) user.addresses.forEach(a => { a.isDefault = false; });
    user.addresses.push({ fullName, phone, addressLine1, addressLine2: addressLine2 || '', city, state: state || '', postalCode, country: country || 'India', isDefault: makeDefault });
    await user.save();
    res.status(201).json(user.addresses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/addresses/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const addr = user.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });
    const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;
    if (isDefault) user.addresses.forEach(a => { a.isDefault = false; });
    Object.assign(addr, { fullName, phone, addressLine1, addressLine2: addressLine2 || '', city, state: state || '', postalCode, country: country || 'India', isDefault: isDefault || false });
    await user.save();
    res.json(user.addresses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/addresses/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const addr = user.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });
    const wasDefault = addr.isDefault;
    addr.deleteOne();
    if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
    await user.save();
    res.json(user.addresses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/addresses/:id/default
router.patch('/:id/default', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.addresses.forEach(a => { a.isDefault = a._id.toString() === req.params.id; });
    await user.save();
    res.json(user.addresses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
