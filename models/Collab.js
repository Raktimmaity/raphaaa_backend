const mongoose = require("mongoose");

const collabSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String, // Cloudinary URL for the collab banner
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    collaborators: [
      {
        name: {
          type: String,
          required: true,
        },
        image: {
          type: String, // URL to footballer image
          required: true,
        },
        products: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Collab", collabSchema);
