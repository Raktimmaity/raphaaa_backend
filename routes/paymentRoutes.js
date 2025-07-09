const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const Payment = require('../models/payment');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require("../models/Product");
const { protect } = require('../middleware/authMiddleware');

// ===================================
// 🔹 1. Create Razorpay Order
// ===================================
router.post('/create-order', protect, async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    // Create order in DB first
    const order = new Order({
      user: req.user._id,
      orderItems: req.body.orderItems,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: 'Razorpay',
      totalPrice: amount / 100,
      isPaid: false,
      isDelivered: false,
    });

    const createdOrder = await order.save();

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
      status: 'created',
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
    console.error('💥 Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message,
    });
  }
});

// ===================================
// 🔹 2. Verify Payment After Checkout
// ===================================
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (razorpay_signature === expectedSignature) {
      // ✅ Valid Signature
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = 'captured';
      await payment.save();

      const order = await Order.findById(payment.orderId);
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentResult = {
        id: razorpay_payment_id,
        status: 'captured',
        update_time: new Date(),
        email_address: req.user.email,
      };
      await order.save();
      // ✅ FIXED: Update product stock from order.orderItems
for (const item of order.orderItems) {
  const product = await Product.findById(item.productId);
  if (product) {
    product.countInStock -= item.quantity;
    if (product.countInStock < 0) product.countInStock = 0;
    await product.save();
  }
}

      await Cart.findOneAndDelete({ user: req.user._id });

      res.json({
        success: true,
        message: 'Payment verified successfully',
        orderId: order._id,
        paymentId: razorpay_payment_id,
      });
    } else {
      // ❌ Invalid Signature
      payment.status = 'failed';
      payment.failureReason = 'Signature mismatch';
      await payment.save();

      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('💥 Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// ===================================
// 🔹 3. Handle Manual Payment Failure
// ===================================
router.post('/payment-failed', protect, async (req, res) => {
  try {
    const { razorpay_order_id, error } = req.body;

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (payment) {
      payment.status = 'failed';
      payment.failureReason = error?.description || 'Payment failed';
      await payment.save();
    }

    res.json({ success: true, message: 'Payment failure recorded' });
  } catch (error) {
    console.error('💥 Error recording payment failure:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// ===================================
// 🔹 4. Razorpay Webhook Handler
// ===================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = body.event;
  const paymentEntity = body.payload.payment?.entity;

  try {
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(paymentEntity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(paymentEntity);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('💥 Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ========== 🔸Webhook Handlers ==========
async function handlePaymentCaptured(payment) {
  try {
    const paymentDoc = await Payment.findOne({ razorpayOrderId: payment.order_id });
    if (paymentDoc) {
      paymentDoc.status = 'captured';
      paymentDoc.razorpayPaymentId = payment.id;
      await paymentDoc.save();
    }
  } catch (error) {
    console.error('Error in handlePaymentCaptured:', error);
  }
}

async function handlePaymentFailed(payment) {
  try {
    const paymentDoc = await Payment.findOne({ razorpayOrderId: payment.order_id });
    if (paymentDoc) {
      paymentDoc.status = 'failed';
      paymentDoc.failureReason = payment.error_description || 'Unknown error';
      await paymentDoc.save();
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

module.exports = router;
