const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const razorpayInstance = require("../config/razorpay");
const Payment = require("../models/payment");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

// ===================================
// 🔹 1. Create Razorpay Order
// ===================================
router.post("/create-order", protect, async (req, res) => {
  try {
    const {
      amount,
      currency = "INR",
      receipt,
      orderItems,
      shippingAddress,
    } = req.body;

    // Create order in DB first
    // const order = new Order({
    //   user: req.user._id,
    //   orderItems: orderItems,
    //   shippingAddress: shippingAddress,
    //   paymentMethod: "Razorpay",
    //   totalPrice: amount / 100,
    //   isPaid: false,
    //   isDelivered: false,
    // });

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
      paymentMethod: "Razor Pay",
      totalPrice,
      isPaid: false,
      paymentStatus: "pending",
      status: "Processing",
    });

    const createdOrder = await order.save();
    // for (const item of orderItems) {
    //     const product = await Product.findById(item.productId);
    //     if (product) {
    //       product.countInStock -= item.quantity;
    //       if (product.countInStock < 0) product.countInStock = 0;
    //       await product.save();
    //     }
    //   }

    // ❌ REMOVED: Don't decrease stock here - only decrease after successful payment
    // Stock will be decreased in verify-payment route

    // Create Razorpay order
    const options = {
      amount,
      currency,
      receipt: receipt || `order_${createdOrder._id}`,
      notes: {
        order_id: createdOrder._id.toString(),
        user_id: req.user._id.toString(),
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    // Save payment info
    await new Payment({
      orderId: createdOrder._id,
      userId: req.user._id,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      status: "created",
    }).save();

    res.status(201).json({
      success: true,
      orderId: createdOrder._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("💥 Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: "Error creating order",
      error: error.message,
    });
  }
});

// ===================================
// 🔹 2. Verify Payment After Checkout
// ===================================
router.post("/verify-payment", protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate Razorpay signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    const order = await Order.findById(payment.orderId).populate({
      path: "orderItems.productId", // ✅ proper nested populate
      model: "Product",
    });

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Update payment & order
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "captured";
    await payment.save();

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentStatus = "paid";
    order.paymentResult = {
      id: razorpay_payment_id,
      status: "captured",
      update_time: new Date(),
      email_address: req.user.email,
    };
    await order.save();

    // ✅ Now stock will update correctly
    for (const item of order.orderItems) {
      const product = item.productId;
      if (product) {
        product.countInStock -= item.quantity;
        if (product.countInStock < 0) product.countInStock = 0;
        await product.save();
        console.log(`✅ Updated stock for: ${product.name}`);
      } else {
        console.log(`❌ Product not found for item:`, item);
      }
    }

    // ✅ Clear cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { products: [], totalPrice: 0 });

    res.json({
      success: true,
      message: "Payment verified and stock updated",
      orderId: order._id,
      paymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error("💥 Error verifying payment:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});





// ===================================
// 🔹 3. Handle Manual Payment Failure
// ===================================
router.post("/payment-failed", protect, async (req, res) => {
  try {
    const { razorpay_order_id, error } = req.body;

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });
    if (payment) {
      payment.status = "failed";
      payment.failureReason = error?.description || "Payment failed";
      await payment.save();
    }

    res.json({ success: true, message: "Payment failure recorded" });
  } catch (error) {
    console.error("💥 Error recording payment failure:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// ===================================
// 🔹 4. Razorpay Webhook Handler
// ===================================
// router.post(
//   "/webhook",
//   express.raw({ type: "application/json" }),
//   async (req, res) => {
//     const signature = req.headers["x-razorpay-signature"];
//     const body = req.body;

//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
//       .update(JSON.stringify(body))
//       .digest("hex");

//     if (signature !== expectedSignature) {
//       return res.status(400).json({ error: "Invalid webhook signature" });
//     }

//     const event = body.event;
//     const paymentEntity = body.payload.payment?.entity;

//     try {
//       switch (event) {
//         case "payment.captured":
//           await handlePaymentCaptured(paymentEntity);
//           break;
//         case "payment.failed":
//           await handlePaymentFailed(paymentEntity);
//           break;
//         default:
//           console.log(`Unhandled webhook event: ${event}`);
//       }

//       res.json({ received: true });
//     } catch (error) {
//       console.error("💥 Webhook error:", error);
//       res.status(500).json({ error: "Webhook processing failed" });
//     }
//   }
// );

// ========== 🔸Webhook Handlers ==========
async function handlePaymentCaptured(payment) {
  try {
    const paymentDoc = await Payment.findOne({
      razorpayOrderId: payment.order_id,
    });
    if (paymentDoc) {
      paymentDoc.status = "captured";
      paymentDoc.razorpayPaymentId = payment.id;
      await paymentDoc.save();

      // ✅ Also handle stock decrease in webhook as backup
      const order = await Order.findById(paymentDoc.orderId);
      if (order && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentStatus = "paid";
        await order.save();

        // ✅ Decrease stock via webhook as well
        for (const item of order.orderItems) {
          const product = await Product.findById(item.productId);
          if (product) {
            product.countInStock -= item.quantity;
            if (product.countInStock < 0) product.countInStock = 0;
            await product.save();
          }
        }

        // ✅ Clear cart
        await Cart.findOneAndDelete({ user: order.user });
      }
    }
  } catch (error) {
    console.error("Error in handlePaymentCaptured:", error);
  }
}

async function handlePaymentFailed(payment) {
  try {
    const paymentDoc = await Payment.findOne({
      razorpayOrderId: payment.order_id,
    });
    if (paymentDoc) {
      paymentDoc.status = "failed";
      paymentDoc.failureReason = payment.error_description || "Unknown error";
      await paymentDoc.save();
    }
  } catch (error) {
    console.error("Error in handlePaymentFailed:", error);
  }
}

module.exports = router;
