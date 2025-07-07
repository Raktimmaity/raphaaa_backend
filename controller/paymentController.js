//raphaaa_backend-main\controller\paymentController.js
const Razorpay = require("razorpay");
const crypto = require("crypto");
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
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secret = process.env.RAZORPAY_SECRET;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      return res.status(200).json({
        success: true,
        message: "✅ Payment verified successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "❌ Payment verification failed",
      });
    }
  } catch (err) {
    console.error("🔴 Verification error:", err);
    res.status(500).json({ success: false, message: "Server error during verification" });
  }
};