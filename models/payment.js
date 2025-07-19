// const mongoose = require('mongoose');

// const paymentSchema = new mongoose.Schema({
//     orderId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Order',
//         required: true
//     },
//     userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
//     razorpayOrderId: {
//         type: String,
//         required: true
//     },
//     razorpayPaymentId: {
//         type: String,
//         default: null
//     },
//     razorpaySignature: {
//         type: String,
//         default: null
//     },
//     amount: {
//         type: Number,
//         required: true
//     },
//     currency: {
//         type: String,
//         default: 'INR'
//     },
//     status: {
//         type: String,
//         enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
//         default: 'created'
//     },
//     paymentMethod: {
//         type: String,
//         default: 'razorpay'
//     },
//     failureReason: {
//         type: String,
//         default: null
//     }
// }, {
//     timestamps: true
// });

// module.exports = mongoose.model('Payment', paymentSchema);
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true, // Ensure unique Razorpay order IDs
  },
  razorpayPaymentId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['created', 'captured', 'failed', 'refunded'],
    default: 'created',
  },
  failureReason: {
    type: String,
  },
  capturedAt: {
    type: Date,
  },
  failedAt: {
    type: Date,
  },
  refundId: {
    type: String,
  },
  refundReason: {
    type: String,
  },
  refundedAt: {
    type: Date,
  },
  idempotencyKey: {
    type: String,
    index: true,
    sparse: true,
    unique: true, // Ensure unique idempotency keys
  },
}, {
  timestamps: true,
});

// Prevent model overwrite by checking if model already exists
module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);