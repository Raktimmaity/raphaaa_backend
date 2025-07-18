const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  bannerImage: String, // optional Cloudinary URL
  offerPercentage: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  isActive: { type: Boolean, default: false }, // ✅ New field
}, { timestamps: true });

module.exports = mongoose.model("Offer", offerSchema);
