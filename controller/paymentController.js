//raphaaa_backend-main\controller\paymentController.js
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/payment');
require("dotenv").config();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// 🔹 Create Razorpay Order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100, // convert to paise
      currency: "INR",
      receipt: `receipt_order_${Math.random().toString(36).substring(7)}`,
      payment_capture: 1,
    };

    const response = await razorpayInstance.orders.create(options);
    return res.status(200).json(response);
  } catch (error) {
    console.error("🔴 Razorpay Order Error:", error);
    res.status(500).json({ message: "Failed to create Razorpay order" });
  }
};

// 🔹 Verify Razorpay Signature
// exports.verifyPayment = async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
//     const secret = process.env.RAZORPAY_SECRET;

//     const hmac = crypto.createHmac("sha256", secret);
//     hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
//     const generatedSignature = hmac.digest("hex");

//     if (generatedSignature === razorpay_signature) {
//       return res.status(200).json({
//         success: true,
//         message: "✅ Payment verified successfully",
//       });
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: "❌ Payment verification failed",
//       });
//     }
//   } catch (err) {
//     console.error("🔴 Verification error:", err);
//     res.status(500).json({ success: false, message: "Server error during verification" });
//   }
// };

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secret = process.env.RAZORPAY_SECRET;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "❌ Payment verification failed",
      });
    }

    // ✅ Fetch payment and associated order
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const order = await Order.findById(payment.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ✅ Update payment
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'captured';
    await payment.save();

    // ✅ Update order
    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentStatus = 'paid';
    await order.save();

    // ✅ Decrease stock for ordered items
    for (const item of order.orderItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.countInStock -= item.quantity;
        if (product.countInStock < 0) product.countInStock = 0;
        await product.save();
      }
    }

    // ✅ Optionally delete cart
    const Cart = require('../models/Cart');
    await Cart.findOneAndUpdate(
      { user: order.user },
      { products: [], totalPrice: 0 }
    );

    return res.status(200).json({
      success: true,
      message: "✅ Payment verified and stock updated",
    });
  } catch (err) {
    console.error("🔴 Verification error:", err);
    res.status(500).json({ success: false, message: "Server error during verification" });
  }
};