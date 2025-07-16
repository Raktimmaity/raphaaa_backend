const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Middleware to protect route (use your auth middleware if any)
const protect = async (req, res, next) => {
  try {
    // Replace this with your actual auth logic
    const userId = req.headers.userid;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    req.user = { id: userId };
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized" });
  }
};

// GET: Get user's saved addresses
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    res.json(user.addresses || []);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST: Add a new address
router.post("/", protect, async (req, res) => {
  const { address, city, postalCode, country, phone } = req.body;

  if (!address || !city || !postalCode || !country || !phone) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findById(req.user.id);
    user.addresses.push({ address, city, postalCode, country, phone });
    await user.save();
    res.status(201).json({ message: "Address added", addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE: Remove address by index
router.delete("/:index", protect, async (req, res) => {
  const index = parseInt(req.params.index);
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.addresses[index]) {
      return res.status(404).json({ message: "Address not found" });
    }

    user.addresses.splice(index, 1);
    await user.save();
    res.json({ message: "Address deleted", addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
