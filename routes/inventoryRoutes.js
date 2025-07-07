const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

router.get("/stock", async (req, res) => {
  try {
    const products = await Product.find({}, "name category price countInStock");
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch inventory data" });
  }
});

module.exports = router;
