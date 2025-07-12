// routes/suggestionRoutes.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// @route   GET /api/suggestions?search=term
// @desc    Get product name suggestions by search term
// @access  Public
router.get("/", async (req, res) => {
  try {
    const search = req.query.search;
    if (!search) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const suggestions = await Product.find({
      name: { $regex: search, $options: "i" }
    }).select("name _id images").limit(10);

    res.json(suggestions);
  } catch (err) {
    console.error("🔴 Error in /api/suggestions:", err);
    res.status(500).json({ message: "Failed to fetch suggestions" });
  }
});

module.exports = router;
