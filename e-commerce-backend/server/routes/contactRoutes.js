const express = require("express");
const { submitMessage, getAllMessages } = require("../controllers/contactController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", submitMessage);         // Public
router.get("/", protect, isAdmin, getAllMessages); // Admin only

module.exports = router;
