const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/notifications/read-all (also accept PUT for frontend compatibility)
router.patch('/read-all', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.notifications.forEach(n => { n.isRead = true; });
    await user.save();
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.put('/read-all', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.notifications.forEach(n => { n.isRead = true; });
    await user.save();
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/notifications/:id/read — mark single notification as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const notif = user.notifications.id(req.params.id);
    if (notif) { notif.isRead = true; await user.save(); }
    res.json({ message: 'Notification marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/notifications/clear
router.delete('/clear', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.notifications = [];
    await user.save();
    res.json({ message: 'Notifications cleared' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
