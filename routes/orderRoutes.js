// const express = require("express");
// const Order = require("../models/Order");
// const { protect } = require("../middleware/authMiddleware");

// const router = express.Router();

// // @route GET /api/orders/my-orders
// // @desc Get logged-in user's orders
// // @access Private
// router.get("/my-orders", protect, async (req, res) => {
//     try {
//         // Find orders for the authenticate user
//         const orders = await Order.find({ user: req.user._id }).sort({
//             createdAt: -1,
//         }); // sort by most recent orders
//         res.json(orders);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// });

// // @route GET /api/orders/:id
// // @desc Get order details by ID
// // @access Private
// router.get("/:id", protect, async (req, res) => {
//     try {
//         const order = await Order.findById(req.params.id).populate(
//             "user",
//             "name email"
//         );

//         if(!order) {
//             return res.status(404).json({ message: "Order not found" });
//         }

//         // Return the full order details
//         res.json(order);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// });

// module.exports = router;

// routes/orders.js - Add this route to your existing orders routes

const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect, adminOrMerchantise } = require("../middleware/authMiddleware");
const {
  getWeeklyRevenue,
  getMonthlyRevenue,
  getYearlyRevenue,
  getTodayRevenue,
} = require("../controller/revenueController");

const { getRevenueByPeriod } = require("../controller/orderController");
const { sendMail } = require("../utils/sendMail");

// @desc    Create Cash on Delivery Order
// @route   POST /api/orders/cod
// @access  Private
router.post("/cod", protect, async (req, res) => {
  try {
    const { orderItems, shippingAddress, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    const requiredFields = [
      "firstName",
      "lastName",
      "address",
      "city",
      "postalCode",
      "country",
      "phone",
    ];
    for (const field of requiredFields) {
      if (!shippingAddress[field]) {
        return res
          .status(400)
          .json({ message: `${field} is required in shipping address` });
      }
    }

    const order = new Order({
      user: req.user._id,
      orderItems: orderItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        sku: item.sku,
      })),
      shippingAddress: {
        address: `${shippingAddress.firstName} ${shippingAddress.lastName}, ${shippingAddress.address}`,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        phone: shippingAddress.phone,
      },
      paymentMethod: "cash_on_delivery",
      totalPrice,
      isPaid: false,
      paymentStatus: "pending",
      status: "Processing",
    });

    const createdOrder = await order.save();

    // Send confirmation email
    try {
      const userEmail = req.user.email;
      const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB");

      const message = orderItems
        .map((item) => {
          return `
      <p><strong>Product:</strong> ${item.name}</p>
      <p><strong>Color:</strong> ${item.color}</p>
      <p><strong>Size:</strong> ${item.size}</p>
      <p><strong>Quantity:</strong> ${item.quantity}</p>
      <hr/>
    `;
        })
        .join("");

      await sendMail({
        to: userEmail,
        subject: "🛍️ Your Order Has Been Placed Successfully!",
        message: `
      <p>Hi ${req.user.name},</p>
      <p>Thank you for shopping with us. Your Cash on Delivery order has been placed successfully on <strong>${orderDate}</strong>.</p>
      ${message}
      <p>We'll notify you once your order is on the way!</p>
      <p>Love,<br/>Team Raphaaa</p>
    `,
      });
    } catch (emailError) {
      console.error(
        "Failed to send order confirmation email:",
        emailError.message
      );
    }

    // 🔻 Decrease stock for each ordered product
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.countInStock -= item.quantity;
        if (product.countInStock < 0) product.countInStock = 0;
        await product.save();
      }
    }

    // Clear cart after placing the order
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      {
        products: [],
        totalPrice: 0,
      }
    );

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("COD Order creation error:", error);
    res.status(500).json({
      message: "Failed to create Cash on Delivery order",
      error: error.message,
    });
  }
});

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
router.put("/:id/status", protect, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status) {
      order.status = status;

      if (status === "Delivered") {
        order.isDelivered = true;
        order.deliveredAt = Date.now();

        if (order.paymentMethod === "cash_on_delivery") {
          order.isPaid = true;
          order.paidAt = Date.now();
          order.paymentStatus = "paid";
        }
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === "paid") {
        order.isPaid = true;
        order.paidAt = Date.now();
      }
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    console.error("Order status update error:", error);
    res.status(500).json({
      message: "Failed to update order status",
      error: error.message,
    });
  }
});

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
router.get("/my-orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("orderItems.productId", "name image")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.productId", "name image");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      order.user._id.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    res.json(order);
  } catch (error) {
    console.error("Fetch order details error:", error);
    res.status(500).json({
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
});

// Example API Endpoint in Express (orderRoutes.js)
router.get("/revenue/total", protect, adminOrMerchantise, async (req, res) => {
  try {
    const orders = await Order.find({ isPaid: true });
    const totalRevenue = orders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );
    res.json({ totalRevenue });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/revenue/weekly", protect, getWeeklyRevenue);
router.get("/revenue/monthly", protect, getMonthlyRevenue);
router.get("/revenue/yearly", protect, getYearlyRevenue);
router.get("/revenue/today", protect, getTodayRevenue);

router.get(
  "/revenue/:period",
  protect,
  adminOrMerchantise,
  async (req, res) => {
    try {
      const { period } = req.params;

      const now = new Date();
      let startDate;

      if (period === "weekly") {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === "monthly") {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      } else if (period === "yearly") {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      } else if (period === "daily") {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
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
      console.error(err);
      res.status(500).json({ message: "Error fetching revenue" });
    }
  }
);

router.get("/revenue/:period", protect, getRevenueByPeriod);

module.exports = router;
