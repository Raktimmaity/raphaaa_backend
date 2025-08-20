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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Campaign", campaignSchema);
