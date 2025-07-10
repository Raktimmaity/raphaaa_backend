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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hero", heroSchema);
