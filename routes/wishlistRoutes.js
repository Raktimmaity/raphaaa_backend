// routes/wishlistRoutes.js
const express = require("express");
const router = express.Router();
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

// Get wishlist for current user
router.get("/", protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate("products");
    res.json(wishlist?.products || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to load wishlist" });
  }
});

// Add product to wishlist
router.post("/add/:productId", protect, async (req, res) => {
  try {
    const { productId } = req.params;
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, products: [productId] });
    } else if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
    }

    await wishlist.save();
    res.status(200).json({ message: "Product added to wishlist" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add product to wishlist" });
  }
});

// Remove product from wishlist
router.delete("/remove/:productId", protect, async (req, res) => {
  try {
    const { productId } = req.params;
    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) return res.status(404).json({ error: "Wishlist not found" });

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );
    await wishlist.save();

    res.status(200).json({ message: "Product removed from wishlist" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove product" });
  }
});

module.exports = router;
