const mongoose = require("mongoose");

const heroSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    paragraph: {
      type: String,
    //   required: true,
    },
    image: {
      type: String, // URL of uploaded image
    //   required: true,
    },
    isVisible: {
      type: Boolean,
      default: true, // true means shown by default
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hero", heroSchema);
