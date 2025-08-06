const mongoose = require("mongoose");

const metaOptionSchema = new mongoose.Schema({
  type: { type: String, enum: ["category", "collection", "gender"], required: true },
  value: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("MetaOption", metaOptionSchema);
