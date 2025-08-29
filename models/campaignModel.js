// backend/models/campaignModel.js
const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  platform: { type: String, enum: ["Google", "Instagram", "Facebook"], required: true },
  utmLink: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  budget: { type: Number, required: true },
  status: { type: String, enum: ["Draft", "Active", "Paused", "Completed"], default: "Draft" },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },            // NEW
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

campaignSchema.virtual("ctr").get(function () {
  return this.impressions ? +(this.clicks / this.impressions * 100).toFixed(2) : 0;
});
campaignSchema.virtual("conversionRate").get(function () {
  return this.clicks ? +(this.conversions / this.clicks * 100).toFixed(2) : 0;
});
campaignSchema.set("toJSON", { virtuals: true });
campaignSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Campaign", campaignSchema);
