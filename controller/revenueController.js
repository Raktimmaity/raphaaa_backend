const Order = require("../models/Order");

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

