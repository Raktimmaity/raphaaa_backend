const Order = require("../models/Order");

exports.getRevenueByPeriod = async (req, res) => {
  try {
    const { period } = req.params;

    const now = new Date();
    let startDate;

    if (period === "daily") {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0); // Start of today
    } else if (period === "weekly") {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (period === "monthly") {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    } else if (period === "yearly") {
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
    } else {
      return res.status(400).json({ message: "Invalid period" });
    }

    const orders = await Order.find({
      isPaid: true,
      paidAt: { $gte: startDate },
    });

    const totalRevenue = orders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );

    res.json({ totalRevenue, totalOrders: orders.length });
  } catch (err) {
    res.status(500).json({ message: "Error fetching revenue" });
  }
};
