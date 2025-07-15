const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Payment = require("../models/payment");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");

// 🔥 Important: Wrap the router with raw body middleware
router.use(express.raw({ type: "application/json" }));

router.post("/", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

    if (signature !== generatedSignature) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    // const body = JSON.parse(req.body); // Manually parse body
    const body = JSON.parse(req.body.toString());
    const event = body.event;
    const paymentEntity = body.payload.payment?.entity;

    if (event === "payment.captured") {
      const paymentDoc = await Payment.findOne({ razorpayOrderId: paymentEntity.order_id });
      if (!paymentDoc) return res.status(404).json({ error: "Payment not found" });

      paymentDoc.status = "captured";
      paymentDoc.razorpayPaymentId = paymentEntity.id;
      await paymentDoc.save();

      const order = await Order.findById(paymentDoc.orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });

      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = "paid";
      await order.save();

      // ✅ Decrease product stock
      for (const item of order.orderItems) {
        const productId = item.productId?._id || item.productId;
        const product = await Product.findById(productId);
        if (product) {
          product.countInStock -= item.quantity;
          if (product.countInStock < 0) product.countInStock = 0;
          await product.save();
          console.log(`✅ Stock updated for ${product.name}`);
        }
      }

      await Cart.findOneAndDelete({ user: order.user });

      return res.json({ received: true });
    }

    return res.json({ received: true }); // For other events
  } catch (error) {
    console.error("💥 Webhook error:", error);
    return res.status(500).json({ error: "Webhook failed" });
  }
});

module.exports = router;
