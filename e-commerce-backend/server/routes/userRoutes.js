const express = require('express');
const {
  getProfile,
  updateProfile,
  updatePassword,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile/password', protect, updatePassword);

module.exports = router;
