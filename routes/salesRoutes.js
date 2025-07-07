const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");

// @desc    Get product sales performance (for admin/merchandise dashboard)
// @route   GET /api/sales/analysis
// @access  Private (admin & merchandise)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({ isPaid: true }).populate("orderItems.productId");

    // Flatten all orderItems into a single array
    const allItems = orders.flatMap(order => order.orderItems);

    // Group by productId and calculate total quantity sold
    const salesMap = new Map();

    for (const item of allItems) {
      const product = item.productId;
      if (!product) continue;

      const key = product._id.toString();

      if (!salesMap.has(key)) {
        salesMap.set(key, {
          productId: product._id,
          name: product.name,
          category: product.category,
          gender: product.gender || "Unisex",
          size: item.size || "N/A",
          totalSold: 0,
          totalRevenue: 0,
        });
      }

      const entry = salesMap.get(key);
      entry.totalSold += item.quantity;
      entry.totalRevenue += item.quantity * item.price;
    }

    const result = [...salesMap.values()].sort((a, b) => b.totalSold - a.totalSold);

    res.json(result);
  } catch (error) {
    console.error("Sales analysis error:", error);
    res.status(500).json({
      message: "Failed to fetch sales analysis",
      error: error.message,
    });
  }
});


module.exports = router;
