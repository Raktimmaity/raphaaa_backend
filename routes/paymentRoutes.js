// const express = require("express");
// const router = express.Router();
// const crypto = require("crypto");
// const razorpayInstance = require("../config/razorpay");
// const Payment = require("../models/payment");
// const Order = require("../models/Order");
// const Cart = require("../models/Cart");
// const Product = require("../models/Product");
// const { protect } = require("../middleware/authMiddleware");

// // ===================================
// // 🔹 1. Create Razorpay Order
// // ===================================
// router.post("/create-order", protect, async (req, res) => {
//   console.log("online payment initiated")
//   try {
//     const {
//       amount,
//       currency = "INR",
//       receipt,
//       orderItems,
//       shippingAddress,
//     } = req.body;

//     // Create order in DB first
//     // const order = new Order({
//     //   user: req.user._id,
//     //   orderItems: orderItems,
//     //   shippingAddress: shippingAddress,
//     //   paymentMethod: "Razorpay",
//     //   totalPrice: amount / 100,
//     //   isPaid: false,
//     //   isDelivered: false,
//     // });

//     const order = new Order({
//       user: req.user._id,
//       orderItems: orderItems.map((item) => ({
//         productId: item.productId,
//         name: item.name,
//         image: item.image,
//         price: item.price,
//         quantity: item.quantity,
//         size: item.size,
//         color: item.color,
//         sku: item.sku,
//       })),
//       shippingAddress: {
//         address: `${shippingAddress.firstName} ${shippingAddress.lastName}, ${shippingAddress.address}`,
//         city: shippingAddress.city,
//         postalCode: shippingAddress.postalCode,
//         country: shippingAddress.country,
//         phone: shippingAddress.phone,
//       },
//       paymentMethod: "Razor Pay",
//       totalPrice,
//       isPaid: false,
//       paymentStatus: "pending",
//       status: "Processing",
//     });

//     const createdOrder = await order.save();
//     console.log(orderItems)
//     for (const item of orderItems) {
//         console.log("item is: ", item)
//         const product = await Product.findById(item.productId);
//         console.log("product is: ", product)
//         if (product) {
//           product.countInStock -= item.quantity;
//           if (product.countInStock < 0) product.countInStock = 0;
//           await product.save();
//         }
//       }

//     // ❌ REMOVED: Don't decrease stock here - only decrease after successful payment
//     // Stock will be decreased in verify-payment route

//     // Create Razorpay order
//     const options = {
//       amount,
//       currency,
//       receipt: receipt || `order_${createdOrder._id}`,
//       notes: {
//         order_id: createdOrder._id.toString(),
//         user_id: req.user._id.toString(),
//       },
//     };

//     const razorpayOrder = await razorpayInstance.orders.create(options);

//     // Save payment info
//     await new Payment({
//       orderId: createdOrder._id,
//       userId: req.user._id,
//       razorpayOrderId: razorpayOrder.id,
//       amount,
//       currency,
//       status: "created",
//     }).save();

//     res.status(201).json({
//       success: true,
//       orderId: createdOrder._id,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       currency: razorpayOrder.currency,
//       key: process.env.RAZORPAY_KEY_ID,
//     });
//   } catch (error) {
//     console.error("💥 Error creating Razorpay order:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error creating order",
//       error: error.message,
//     });
//   }
// });

// // ===================================
// // 🔹 2. Verify Payment After Checkout
// // ===================================
// router.post("/verify-payment", protect, async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//     // Validate Razorpay signature
//     const sign = razorpay_order_id + "|" + razorpay_payment_id;
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(sign)
//       .digest("hex");

//     if (razorpay_signature !== expectedSignature) {
//       return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
//     }

//     const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
//     if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

//     const order = await Order.findById(payment.orderId).populate({
//       path: "orderItems.productId", // ✅ proper nested populate
//       model: "Product",
//     });

//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     // Update payment & order
//     payment.razorpayPaymentId = razorpay_payment_id;
//     payment.razorpaySignature = razorpay_signature;
//     payment.status = "captured";
//     await payment.save();

//     order.isPaid = true;
//     order.paidAt = new Date();
//     order.paymentStatus = "paid";
//     order.paymentResult = {
//       id: razorpay_payment_id,
//       status: "captured",
//       update_time: new Date(),
//       email_address: req.user.email,
//     };
//     await order.save();

//     // ✅ Now stock will update correctly
//     for (const item of order.orderItems) {
//       const product = item.productId;
//       if (product) {
//         product.countInStock -= item.quantity;
//         if (product.countInStock < 0) product.countInStock = 0;
//         await product.save();
//         console.log(`✅ Updated stock for: ${product.name}`);
//       } else {
//         console.log(`❌ Product not found for item:`, item);
//       }
//     }

//     // ✅ Clear cart
//     await Cart.findOneAndUpdate({ user: req.user._id }, { products: [], totalPrice: 0 });

//     res.json({
//       success: true,
//       message: "Payment verified and stock updated",
//       orderId: order._id,
//       paymentId: razorpay_payment_id,
//     });
//   } catch (err) {
//     console.error("💥 Error verifying payment:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });





// // ===================================
// // 🔹 3. Handle Manual Payment Failure
// // ===================================
// router.post("/payment-failed", protect, async (req, res) => {
//   try {
//     const { razorpay_order_id, error } = req.body;

//     const payment = await Payment.findOne({
//       razorpayOrderId: razorpay_order_id,
//     });
//     if (payment) {
//       payment.status = "failed";
//       payment.failureReason = error?.description || "Payment failed";
//       await payment.save();
//     }

//     res.json({ success: true, message: "Payment failure recorded" });
//   } catch (error) {
//     console.error("💥 Error recording payment failure:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

// // ===================================
// // 🔹 4. Razorpay Webhook Handler
// // ===================================
// // router.post(
// //   "/webhook",
// //   express.raw({ type: "application/json" }),
// //   async (req, res) => {
// //     const signature = req.headers["x-razorpay-signature"];
// //     const body = req.body;

// //     const expectedSignature = crypto
// //       .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
// //       .update(JSON.stringify(body))
// //       .digest("hex");

// //     if (signature !== expectedSignature) {
// //       return res.status(400).json({ error: "Invalid webhook signature" });
// //     }

// //     const event = body.event;
// //     const paymentEntity = body.payload.payment?.entity;

// //     try {
// //       switch (event) {
// //         case "payment.captured":
// //           await handlePaymentCaptured(paymentEntity);
// //           break;
// //         case "payment.failed":
// //           await handlePaymentFailed(paymentEntity);
// //           break;
// //         default:
// //           console.log(`Unhandled webhook event: ${event}`);
// //       }

// //       res.json({ received: true });
// //     } catch (error) {
// //       console.error("💥 Webhook error:", error);
// //       res.status(500).json({ error: "Webhook processing failed" });
// //     }
// //   }
// // );

// // ========== 🔸Webhook Handlers ==========
// async function handlePaymentCaptured(payment) {
//   try {
//     const paymentDoc = await Payment.findOne({
//       razorpayOrderId: payment.order_id,
//     });
//     if (paymentDoc) {
//       paymentDoc.status = "captured";
//       paymentDoc.razorpayPaymentId = payment.id;
//       await paymentDoc.save();

//       // ✅ Also handle stock decrease in webhook as backup
//       const order = await Order.findById(paymentDoc.orderId);
//       if (order && !order.isPaid) {
//         order.isPaid = true;
//         order.paidAt = new Date();
//         order.paymentStatus = "paid";
//         await order.save();

//         // ✅ Decrease stock via webhook as well
//         for (const item of order.orderItems) {
//           const product = await Product.findById(item.productId);
//           if (product) {
//             product.countInStock -= item.quantity;
//             if (product.countInStock < 0) product.countInStock = 0;
//             await product.save();
//           }
//         }

//         // ✅ Clear cart
//         await Cart.findOneAndDelete({ user: order.user });
//       }
//     }
//   } catch (error) {
//     console.error("Error in handlePaymentCaptured:", error);
//   }
// }

// async function handlePaymentFailed(payment) {
//   try {
//     const paymentDoc = await Payment.findOne({
//       razorpayOrderId: payment.order_id,
//     });
//     if (paymentDoc) {
//       paymentDoc.status = "failed";
//       paymentDoc.failureReason = payment.error_description || "Unknown error";
//       await paymentDoc.save();
//     }
//   } catch (error) {
//     console.error("Error in handlePaymentFailed:", error);
//   }
// }

// module.exports = router;


const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const razorpayInstance = require("../config/razorpay");
const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");

// Environment variables validation
const requiredEnvVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`${varName} is not set`);
    process.exit(1);
  }
});

// 🔹 1. Create Razorpay Order
router.post("/create-order", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { amount, currency = "INR", receipt, orderItems, shippingAddress, idempotencyKey } = req.body;

      console.log("Creating order for user:", req.user._id);
      console.log("Order amount:", amount);
      console.log("Received idempotencyKey:", idempotencyKey);

      // Input validation
      if (!orderItems || orderItems.length === 0) {
        throw new Error("No order items provided");
      }

      if (!amount || amount <= 0) {
        throw new Error("Invalid amount");
      }

      if (!shippingAddress) {
        throw new Error("Shipping address is required");
      }

      // Validate order items structure
      for (const item of orderItems) {
        if (!item.productId || !item.name || !item.price || !item.quantity) {
          throw new Error("Invalid order item structure");
        }
      }

      // Calculate total price and verify with frontend amount
      const calculatedTotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      
      if (Math.abs(amount - calculatedTotal) > 0.01) {
        console.error("Amount mismatch - Frontend:", amount, "Calculated:", calculatedTotal);
        throw new Error("Amount mismatch between frontend and calculated total");
      }

      // Check for existing pending order with idempotencyKey
      if (idempotencyKey) {
        const existingPayment = await Payment.findOne({ idempotencyKey }).session(session);
        if (existingPayment) {
          const order = await Order.findById(existingPayment.orderId).session(session);
          if (order && order.paymentStatus === "pending") {
            console.log("Returning order for idempotency key:", idempotencyKey);
            return res.status(200).json({
              success: true,
              orderId: order._id,
              razorpayOrderId: existingPayment.razorpayOrderId,
              amount: order.totalPrice,
              currency: existingPayment.currency,
              key: process.env.RAZORPAY_KEY_ID,
            });
          }
        }
      }

      // Create MongoDB Order
      const order = new Order({
        user: req.user._id,
        orderItems: orderItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
          sku: item.sku || null,
        })),
        shippingAddress: {
          address: `${shippingAddress.firstName} ${shippingAddress.lastName}, ${shippingAddress.address}`,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone,
        },
        paymentMethod: "RazorPay",
        totalPrice: calculatedTotal,
        isPaid: false,
        paymentStatus: "pending",
        status: "Processing",
        idempotencyKey: idempotencyKey || undefined,
      });

      const createdOrder = await order.save({ session });
      console.log("Created Order:", createdOrder._id);

      // Create Razorpay Order
      const razorpayAmount = Math.round(amount * 100); // Convert to paise
      const options = {
        amount: razorpayAmount,
        currency,
        receipt: receipt || `order_${createdOrder._id}`,
        notes: {
          order_id: createdOrder._id.toString(),
          user_id: req.user._id.toString(),
        },
      };

      const razorpayOrder = await razorpayInstance.orders.create(options);
      
      if (!razorpayOrder || !razorpayOrder.id) {
        throw new Error("Razorpay order creation failed");
      }

      console.log("Razorpay Order Created:", razorpayOrder.id);

      // Create Payment document
      const payment = new Payment({
        orderId: createdOrder._id,
        userId: req.user._id,
        razorpayOrderId: razorpayOrder.id,
        amount: amount,
        currency,
        status: "created",
        idempotencyKey: idempotencyKey || undefined,
      });

      await payment.save({ session });
      console.log("Payment Document Created:", payment._id);

      // Clear cart to prevent reuse
      const cart = await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $set: { products: [], totalPrice: 0 } },
        { session }
      );
      if (cart) {
        console.log("Cart cleared for user:", req.user._id);
      }

      res.status(201).json({
        success: true,
        orderId: createdOrder._id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount / 100,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
      });
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error.message);
    console.error("Stack trace:", error.stack);
    
    if (error.code === 'BAD_REQUEST_ERROR') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request to Razorpay", 
        error: error.description 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Error creating order", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// 🔹 2. Verify Payment After Checkout
router.post("/verify-payment", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } = req.body;

      console.log("Verify payment request body:", req.body);
      console.log("User ID:", req.user._id);

      // Validate required fields
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
        throw new Error("Missing payment details");
      }

      console.log("Verifying payment for order:", razorpayOrderId);

      // Verify signature
      const sign = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest("hex");

      if (razorpaySignature !== expectedSignature) {
        console.error("Signature verification failed");
        console.error("Expected:", expectedSignature);
        console.error("Received:", razorpaySignature);
        throw new Error("Invalid Razorpay signature");
      }

      console.log("Signature verified successfully");

      // Find payment record
      const payment = await Payment.findOne({ razorpayOrderId }).session(session);
      if (!payment) {
        console.error("Payment record not found for order:", razorpayOrderId);
        throw new Error("Payment record not found");
      }

      // Validate orderId matches payment.orderId
      if (payment.orderId.toString() !== orderId) {
        console.error("Order ID mismatch. Expected:", payment.orderId, "Received:", orderId);
        throw new Error("Order ID does not match payment record");
      }

      // Check if payment already processed
      if (payment.status === "captured") {
        console.log("Payment already processed for order:", payment.orderId);
        return res.status(200).json({
          success: true,
          message: "Payment already processed",
          orderId: payment.orderId,
          paymentId: razorpayPaymentId,
        });
      }

      // Find order
      const order = await Order.findById(payment.orderId).session(session);
      if (!order) {
        console.error("Order not found:", payment.orderId);
        throw new Error("Order not found");
      }

      // Check if order already paid
      if (order.isPaid) {
        console.log("Order already paid:", order._id);
        return res.status(200).json({
          success: true,
          message: "Order already paid",
          orderId: order._id,
          paymentId: razorpayPaymentId,
        });
      }

      // Verify the user owns this order
      if (order.user.toString() !== req.user._id.toString()) {
        console.error("Unauthorized access attempt for order:", order._id);
        throw new Error("Unauthorized access");
      }

      // Update payment record
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      payment.status = "captured";
      payment.capturedAt = new Date();
      await payment.save({ session });

      // Update order
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = "paid";
      order.paymentResult = {
        id: razorpayPaymentId,
        status: "captured",
        update_time: new Date(),
        email_address: req.user.email,
      };
      await order.save({ session });

      // Update product stock
      for (const item of order.orderItems) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        if (product.countInStock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        product.countInStock = Math.max(0, product.countInStock - item.quantity);
        await product.save({ session });
        console.log(`Updated stock for product ${product.name}: ${product.countInStock}`);
      }

      // Clear cart
      const cartResult = await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $set: { products: [], totalPrice: 0 } },
        { new: true, session }
      );

      if (cartResult) {
        console.log("Cart cleared for user:", req.user._id);
      } else {
        console.log("No cart found for user:", req.user._id);
      }

      console.log("Payment verification completed successfully for order:", order._id);

      res.json({
        success: true,
        message: "Payment verified and order processed successfully",
        orderId: order._id,
        paymentId: razorpayPaymentId,
        order: {
          id: order._id,
          status: order.status, // Fixed: Corrected syntax
          paymentStatus: order.paymentStatus,
          isPaid: order.isPaid,
          totalPrice: order.totalPrice,
          paidAt: order.paidAt,
        },
      });
    });
  } catch (err) {
    console.error("Error verifying payment:", err.message);
    console.error("Stack trace:", err.stack);
    
    res.status(err.message.includes("Order ID does not match") ? 400 : 500).json({
      success: false,
      message: "Server error during payment verification",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// 🔹 3. Get Order Status
router.get("/order-status/:orderId", protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log("Fetching order status for:", orderId);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Check if user owns this order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }
    
    const payment = await Payment.findOne({ orderId: order._id });
    
    res.json({
      success: true,
      order: {
        id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        isPaid: order.isPaid,
        totalPrice: order.totalPrice,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        orderItems: order.orderItems,
        shippingAddress: order.shippingAddress,
      },
      payment: payment ? {
        status: payment.status,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        capturedAt: payment.capturedAt,
        failureReason: payment.failureReason,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching order status:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🔹 4. Handle Payment Failure
router.post("/payment-failed", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { razorpayOrderId, error_code, error_description } = req.body;

      console.log("Processing payment failure for order:", razorpayOrderId);

      if (!razorpayOrderId) {
        throw new Error("Order ID is required");
      }

      // Find payment record
      const payment = await Payment.findOne({ razorpayOrderId }).session(session);
      if (!payment) {
        console.error("Payment record not found for failed payment:", razorpayOrderId);
        throw new Error("Payment record not found");
      }

      // Update payment status to failed
      payment.status = "failed";
      payment.failureReason = error_description || error_code || "Payment failed";
      payment.failedAt = new Date();
      await payment.save({ session });

      // Find and update order status
      const order = await Order.findById(payment.orderId).session(session);
      if (order) {
        // Verify user owns this order
        if (order.user.toString() !== req.user._id.toString()) {
          throw new Error("Unauthorized access");
        }

        order.paymentStatus = "failed";
        order.status = "Payment Failed";
        await order.save({ session });
        
        console.log("Order status updated to failed:", order._id);
      } else {
        console.error("Order not found for failed payment:", payment.orderId);
      }

      console.log("Payment failure processed for order:", razorpayOrderId);

      res.json({
        success: true,
        message: "Payment failure recorded",
        orderId: order ? order._id : payment.orderId,
        paymentStatus: "failed",
      });
    });
  } catch (error) {
    console.error("Error handling payment failure:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while processing payment failure",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// 🔹 5. Get Payment History for User
router.get("/payment-history", protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const payments = await Payment.find({ userId: req.user._id })
      .populate({
        path: 'orderId',
        select: 'orderItems totalPrice status createdAt shippingAddress',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPayments = await Payment.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPayments / limit),
        totalPayments,
        hasNext: skip + payments.length < totalPayments,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🔹 6. Refund Payment
router.post("/refund/:paymentId", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { paymentId } = req.params;
      const { reason } = req.body;

      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        throw new Error("Payment not found");
      }

      // Check if user owns this payment
      if (payment.userId.toString() !== req.user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      // Check if payment is eligible for refund
      if (payment.status !== "captured") {
        throw new Error("Payment not eligible for refund");
      }

      // Create refund request with Razorpay
      const refundOptions = {
        amount: payment.amount * 100, // Convert to paise
        notes: {
          reason: reason || "Customer requested refund",
          order_id: payment.orderId.toString(),
        },
      };

      const refund = await razorpayInstance.payments.refund(payment.razorpayPaymentId, refundOptions);

      // Update payment status
      payment.status = "refunded";
      payment.refundId = refund.id;
      payment.refundReason = reason;
      payment.refundedAt = new Date();
      await payment.save({ session });

      // Update order status
      const order = await Order.findById(payment.orderId).session(session);
      if (order) {
        order.paymentStatus = "refunded";
        order.status = "Refunded";
        await order.save({ session });
      }

      console.log("Refund processed for payment:", paymentId);

      res.json({
        success: true,
        message: "Refund processed successfully",
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      });
    });
  } catch (error) {
    console.error("Error processing refund:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during refund processing",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
});

// 🔹 7. Webhook for Razorpay
router.post("/webhook", async (req, res) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const webhookBody = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest("hex");

    if (webhookSignature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    console.log("Webhook received:", event, "for payment:", paymentEntity.id);

    switch (event) {
      case "payment.captured":
        await handlePaymentCaptured(paymentEntity);
        break;
      case "payment.failed":
        await handlePaymentFailed(paymentEntity);
        break;
      case "refund.created":
        await handleRefundCreated(req.body.payload.refund.entity);
        break;
      default:
        console.log("Unhandled webhook event:", event);
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(500).json({ message: "Webhook error" });
  }
});

// 🔹 8. Cancel Pending Order
router.put("/cancel/:orderId", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { orderId } = req.params;

      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error("Order not found");
      }

      if (order.user.toString() !== req.user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      if (order.paymentStatus !== "pending") {
        throw new Error("Only pending orders can be cancelled");
      }

      order.paymentStatus = "cancelled";
      order.status = "Cancelled";
      await order.save({ session });

      const payment = await Payment.findOne({ orderId }).session(session);
      if (payment) {
        payment.status = "cancelled";
        await payment.save({ session });
      }

      console.log("Order cancelled:", orderId);

      res.json({
        success: true,
        message: "Order cancelled successfully",
        orderId,
      });
    });
  } catch (error) {
    console.error("Error cancelling order:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  } finally {
    session.endSession();
  }
});

// 🔹 9. Cleanup Pending Orders
async function cleanupPendingOrders() {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const timeout = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes timeout
      const pendingOrders = await Order.find({
        paymentStatus: "pending",
        createdAt: { $lt: timeout },
      }).session(session);

      for (const order of pendingOrders) {
        await Payment.deleteOne({ orderId: order._id }).session(session);
        await order.deleteOne({ session });
        console.log(`Cleaned up pending order: ${order._id}`);
      }
    });
  } catch (error) {
    console.error("Error cleaning up pending orders:", error.message);
  } finally {
    session.endSession();
  }
}

// Schedule cleanup job
const cron = require("node-cron");
cron.schedule("*/15 * * * *", cleanupPendingOrders); // Run every 15 minutes

// 🔹 Helper functions for webhook events
async function handlePaymentCaptured(paymentEntity) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({ razorpayPaymentId: paymentEntity.id }).session(session);
      if (payment && payment.status !== "captured") {
        payment.status = "captured";
        payment.capturedAt = new Date();
        await payment.save({ session });
        console.log("Payment captured via webhook:", paymentEntity.id);
      }
    });
  } catch (error) {
    console.error("Error handling payment captured webhook:", error);
  } finally {
    session.endSession();
  }
}

async function handlePaymentFailed(paymentEntity) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({ razorpayPaymentId: paymentEntity.id }).session(session);
      if (payment) {
        payment.status = "failed";
        payment.failureReason = paymentEntity.error_description || "Payment failed";
        payment.failedAt = new Date();
        await payment.save({ session });
        console.log("Payment failed via webhook:", paymentEntity.id);
      }
    });
  } catch (error) {
    console.error("Error handling payment failed webhook:", error);
  } finally {
    session.endSession();
  }
}

async function handleRefundCreated(refundEntity) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({ razorpayPaymentId: refundEntity.payment_id }).session(session);
      if (payment) {
        payment.status = "refunded";
        payment.refundId = refundEntity.id;
        payment.refundedAt = new Date();
        await payment.save({ session });
        console.log("Refund created via webhook:", refundEntity.id);
      }
    });
  } catch (error) {
    console.error("Error handling refund created webhook:", error);
  } finally {
    session.endSession();
  }
}

module.exports = router;