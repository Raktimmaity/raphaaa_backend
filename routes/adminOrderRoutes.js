// const express = require("express");
// const Order = require("../models/Order");
// const { protect, admin } = require("../middleware/authMiddleware");

// const router = express.Router();

// // @route GET /api/admin/orders
// // @desc get all orders (Admin only)
// // @access Private /Admin
// router.get("/", protect, admin, async(req, res) => {
//     try {
//         const orders = await Order.find({}).populate("user", "name email");
//         res.json(orders);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal Server error" });
//     }
// });

// // @routes PUT /api/admin/orders/:id
// // @desc update orders status
// // @access Private /Admin
// router.put("/:id", protect, admin, async(req, res) => {
//     try {
//         const order = await Order.findById(req.params.id).populate("user", "name");
//         if (order) {
//             order.status = req.body.status || order.status;
//             order.isDelivered = req.body.status === "Delivered" ? true : order.isDelivered;
//             order.deliveredAt = req.body.status === "Delivered" ? Date.now() : order.deliveredAt;
//             const updatedOrder = await order.save();
//             res.json({ message: "Order updated successfully", order: updatedOrder });
//         } else {
//             res.status(404).json({ message: "Order not found" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal Server error" });
//     }
// });

// // @route DELETE /api/admin/orders/:id
// // @desc Delete an order
// // @access Private/Admin
// router.delete("/:id", protect, admin, async(req, res) => {
//     try {
//         const order = await Order.findById(req.params.id);
//         if (order) {
//             await order.deleteOne();
//             res.json({ message: "Order removed successfully" });
//         } else {
//             res.status(404).json({ message: "Order not found" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal Server error" });
//     }
// });

// module.exports = router;

// const express = require('express');
// const router = express.Router();
// const Order = require('../models/Order');
// const { protect, adminOrMerchantise } = require('../middleware/authMiddleware');

// // Middleware to check if user is admin
// const admin = (req, res, next) => {
//   if (req.user && req.user.role === 'admin') {
//     next();
//   } else {
//     res.status(403).json({ message: 'Not authorized as admin' });
//   }
// };

// // @desc    Get all orders (Admin only)
// // @route   GET /api/admin/orders
// // @access  Private/Admin
// router.get('/', protect, admin, async (req, res) => {
//   try {
//     const orders = await Order.find({})
//       .populate('user', 'name email')
//       .populate('orderItems.productId', 'name image')
//       .sort({ createdAt: -1 });

      

//     console.log('Admin fetching orders, found:', orders.length);
//     res.json(orders);
//   } catch (error) {
//     console.error('Fetch all orders error:', error);
//     res.status(500).json({
//       message: 'Failed to fetch orders',
//       error: error.message
//     });
//   }
// });

// // @desc    Update order status (Admin only)
// // @route   PUT /api/admin/orders/:id
// // @access  Private/Admin
// router.put('/:id', protect, admin, async (req, res) => {
//   try {
//     const { status, paymentStatus } = req.body;
//     const order = await Order.findById(req.params.id)
//       .populate('user', 'name email');

//     if (!order) {
//       return res.status(404).json({ message: 'Order not found' });
//     }

//     if (status) {
//       order.status = status;

//       if (status === 'Delivered') {
//         order.isDelivered = true;
//         order.deliveredAt = Date.now();

//         if (order.paymentMethod === 'cash_on_delivery') {
//           order.isPaid = true;
//           order.paidAt = Date.now();
//           order.paymentStatus = 'paid';
//         }
//       }
//     }

//     if (paymentStatus) {
//       order.paymentStatus = paymentStatus;
//       if (paymentStatus === 'paid') {
//         order.isPaid = true;
//         order.paidAt = Date.now();
//       }
//     }

//     const updatedOrder = await order.save();
    
//     // Populate the updated order before sending response
//     await updatedOrder.populate('user', 'name email');
    
//     console.log('Order status updated:', updatedOrder._id, 'New status:', updatedOrder.status);
//     res.json(updatedOrder);
//   } catch (error) {
//     console.error('Order status update error:', error);
//     res.status(500).json({
//       message: 'Failed to update order status',
//       error: error.message
//     });
//   }
// });

// // @desc    Delete order (Admin only)
// // @route   DELETE /api/admin/orders/:id
// // @access  Private/Admin
// router.delete('/:id', protect, admin, async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id);

//     if (!order) {
//       return res.status(404).json({ message: 'Order not found' });
//     }

//     await Order.findByIdAndDelete(req.params.id);
//     console.log('Order deleted:', req.params.id);
//     res.json({ message: 'Order deleted successfully', orderId: req.params.id });
//   } catch (error) {
//     console.error('Delete order error:', error);
//     res.status(500).json({
//       message: 'Failed to delete order',
//       error: error.message
//     });
//   }
// });

// // @desc    Get order statistics (Admin only)
// // @route   GET /api/admin/orders/stats
// // @access  Private/Admin
// router.get('/stats', protect, admin, async (req, res) => {
//   try {
//     const totalOrders = await Order.countDocuments();
//     const pendingOrders = await Order.countDocuments({ status: 'Processing' });
//     const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
    
//     const totalSalesResult = await Order.aggregate([
//       { $group: { _id: null, total: { $sum: '$totalPrice' } } }
//     ]);
    
//     const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].total : 0;

//     res.json({
//       totalOrders,
//       pendingOrders,
//       deliveredOrders,
//       totalSales
//     });
//   } catch (error) {
//     console.error('Order stats error:', error);
//     res.status(500).json({
//       message: 'Failed to fetch order statistics',
//       error: error.message
//     });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, adminOrMerchantise } = require('../middleware/authMiddleware');
const { sendMail } = require("../utils/sendMail");

// Middleware to check if user is admin or merchantise
const adminOrMerchantiseMiddleware = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'merchantise' || req.user.role === "delivery_boy" || req.user.role === "marketing")) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin or merchantise' });
  }
};

// Middleware to check if user is admin only (for sensitive operations)
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

// @desc    Get all orders (Admin and Merchantise)
// @route   GET /api/admin/orders
// @access  Private/Admin/Merchantise
router.get('/', protect, adminOrMerchantiseMiddleware, async (req, res) => {
  try {
    let orders;
    
    // If user is admin, show all orders
    if (req.user.role === 'admin') {
      orders = await Order.find({})
        .populate('user', 'name email')
        .populate('orderItems.productId', 'name image')
        .sort({ createdAt: -1 });
    } 
    // If user is merchantise, show only their orders (if you have merchant-specific orders)
    // For now, showing all orders to merchantise as well
    else if (req.user.role === 'merchantise') {
      orders = await Order.find({})
        .populate('user', 'name email')
        .populate('orderItems.productId', 'name image')
        .sort({ createdAt: -1 });
    } else if(req.user.role === 'delivery_boy') {
      orders = await Order.find({})
      .populate('user', 'name email')
      .populate('orderItems.productId', 'name image')
      .sort({ createdAt: -1 });
    } else if(req.user.role === 'marketing') {
      orders = await Order.find({})
      .populate('user', 'name email')
      .populate('orderItems.productId', 'name image')
      .sort({ createdAt: -1 });
    }

    // console.log(`${req.user.role} fetching orders, found:`, orders.length);
    res.json(orders);
  } catch (error) {
    console.error('Fetch all orders error:', error);
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// @desc    Update order status (Admin and Merchantise)
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin/Merchantise
router.put('/:id', protect, adminOrMerchantiseMiddleware, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let shouldSendStatusEmail = false;
    let newStatus = '';

    if (status) {
      order.status = status;
      newStatus = status;
      shouldSendStatusEmail = ['Shipped', 'Delivered', 'Cancelled'].includes(status);

      if (status === 'Delivered') {
        order.isDelivered = true;
        order.deliveredAt = Date.now();

        if (order.paymentMethod === 'cash_on_delivery') {
          order.isPaid = true;
          order.paidAt = Date.now();
          order.paymentStatus = 'paid';
        }
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid') {
        order.isPaid = true;
        order.paidAt = Date.now();
      }
    }

    const updatedOrder = await order.save();
    
    // Populate the updated order before sending response
    await updatedOrder.populate('user', 'name email');

    // ✅ Send email if status was updated to Shipped / Delivered / Cancelled
    if (shouldSendStatusEmail) {
      const items = order.orderItems.map(item => `
        <p><strong>${item.name}</strong> - ${item.color}, ${item.size} (Qty: ${item.quantity})</p>
      `).join("");

      const statusMessages = {
        Shipped: "Your order has been shipped and is on its way to you.",
        Delivered: "Your order has been delivered. We hope you enjoy it!",
        Cancelled: "Your order has been cancelled. If this was unexpected, please contact support.",
      };

      await sendMail({
        to: order.user.email,
        subject: `📦 Order ${status} - Raphaaa`,
        message: `
          <p>Hi ${order.user.name},</p>
          <p>${statusMessages[status]}</p>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Order Items:</strong></p>
          ${items}
          <p>Thank you for shopping with us!</p>
          <p>Team Raphaaa</p>
        `
      });
    }
    
    // console.log('Order status updated by', req.user.role, ':', updatedOrder._id, 'New status:', updatedOrder.status);
    res.json(updatedOrder);
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

// @desc    Delete order (Admin only)
// @route   DELETE /api/admin/orders/:id
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await Order.findByIdAndDelete(req.params.id);
    console.log('Order deleted by admin:', req.params.id);
    res.json({ message: 'Order deleted successfully', orderId: req.params.id });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      message: 'Failed to delete order',
      error: error.message
    });
  }
});

// @desc    Get order statistics (Admin and Merchantise)
// @route   GET /api/admin/orders/stats
// @access  Private/Admin/Merchantise
router.get('/stats', protect, adminOrMerchantiseMiddleware, async (req, res) => {
  try {
    let totalOrders, pendingOrders, deliveredOrders, totalSalesResult;

    // If user is admin, get all statistics
    if (req.user.role === 'admin') {
      totalOrders = await Order.countDocuments();
      pendingOrders = await Order.countDocuments({ status: 'Processing' });
      deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
      
      totalSalesResult = await Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);
    }
    // If user is merchantise, get the same stats for now
    // You can modify this later to filter by merchant if needed
    else if (req.user.role === 'merchantise') {
      totalOrders = await Order.countDocuments();
      pendingOrders = await Order.countDocuments({ status: 'Processing' });
      deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
      
      totalSalesResult = await Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);
    }
    
    const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].total : 0;

    res.json({
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalSales
    });
  } catch (error) {
    console.error('Order stats error:', error);
    res.status(500).json({
      message: 'Failed to fetch order statistics',
      error: error.message
    });
  }
});

module.exports = router;