const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  ipAddress: { type: String },
  isSubscribed: {
    type: Boolean,
    default: true, // so by default, user is subscribed
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  pushSubscription: {
  endpoint: String,
  keys: {
    auth: String,
    p256dh: String,
  },
},
});

module.exports = mongoose.model("Subscriber", subscriberSchema);
