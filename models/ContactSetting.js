const mongoose = require("mongoose");

const contactSettingSchema = new mongoose.Schema({
  showFacebook: { type: Boolean, default: false },
  facebookUrl: { type: String, default: "" },
  showInstagram: { type: Boolean, default: false },
  instagramUrl: { type: String, default: "" },
  showTwitter: { type: Boolean, default: false },
  twitterUrl: { type: String, default: "" },
  showGmail: { type: Boolean, default: false },
  gmail: { type: String, default: "" },
  showPhone: { type: Boolean, default: false },
  phone: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("ContactSetting", contactSettingSchema);
