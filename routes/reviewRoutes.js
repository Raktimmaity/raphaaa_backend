const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");
const {
  createReview,
  getMyReviews,
} = require("../controller/reviewController");

const upload = multer({ dest: "uploads/reviews/" }); // adjust destination as needed

router.post("/:productId", protect, upload.single("image"), createReview);
router.get("/my-reviews", protect, getMyReviews);

module.exports = router;
