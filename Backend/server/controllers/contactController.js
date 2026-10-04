const ContactMessage = require("../models/ContactMessage");

// POST /api/contact
exports.submitMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const contact = await ContactMessage.create({ name, email, message });
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};

// GET /api/contact (admin only)
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch messages", error: err.message });
  }
};
