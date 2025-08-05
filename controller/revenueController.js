const Order = require("../models/Order");
const Product = require("../models/Product");

// Common helper to calculate revenue
const calculateRevenue = async (startDate) => {
  const match = {
    createdAt: { $gte: startDate },
    isPaid: true, // only count paid orders
  };

  const orders = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalPrice" },
        totalOrders: { $sum: 1 },
      },
    },
  ]);

  return {
    totalRevenue: orders[0]?.totalRevenue || 0,
    totalOrders: orders[0]?.totalOrders || 0,
  };
};

exports.getWeeklyRevenue = async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const data = await calculateRevenue(oneWeekAgo);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching weekly revenue" });
  }
};

exports.getMonthlyRevenue = async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const data = await calculateRevenue(oneMonthAgo);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching monthly revenue" });
  }
};

exports.getYearlyRevenue = async (req, res) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const data = await calculateRevenue(oneYearAgo);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching yearly revenue" });
  }
};

exports.getTodayRevenue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of the day

    const data = await calculateRevenue(today);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching today's revenue" });
  }
};

exports.getRevenueByPeriod = async (req, res) => {
  try {
    const { period } = req.params;
    const now = new Date();
    let startDate;

    switch (period) {
      case "daily":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "yearly":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return res.status(400).json({ message: "Invalid period" });
    }

    // Get all paid orders for the period
    const paidOrders = await Order.find({
      isPaid: true,
      paidAt: { $gte: startDate },
    });

    const totalRevenue = paidOrders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );

    const totalOrders = paidOrders.length;

    // Gather all sold items
    const allItems = paidOrders.flatMap((order) => order.orderItems);

    // Group by name (fallback if productId is missing)
    const productMap = new Map();

    for (const item of allItems) {
      const key = item.productId?.toString() || item.name;

      if (productMap.has(key)) {
        productMap.get(key).totalSold += item.quantity;
      } else {
        productMap.set(key, {
          name: item.name || "Unknown",
          category: "N/A",
          price: item.price || 0,
          totalSold: item.quantity,
        });
      }
    }

    const productsSold = Array.from(productMap.values());

    res.json({ totalRevenue, totalOrders, productsSold });
  } catch (err) {
    console.error("Revenue fetch error:", err);
    res.status(500).json({ message: "Error fetching revenue" });
  }
};

