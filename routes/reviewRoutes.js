// routes/reviewRoutes.js
// routes/reviewRoutes.js
const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post("/:productId", protect, upload.single("image"), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.productId;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!rating || !comment) {
      return res.status(400).json({ message: "Rating and comment are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const userOrders = await Order.find({
      user: req.user._id,
      status: "Delivered",
      "orderItems.productId": productId,
    });

    if (userOrders.length === 0) {
      return res.status(403).json({
        message: "You can only review products you have purchased and received",
      });
    }

    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    const review = new Review({
      product: productId,
      user: req.user._id,
      rating: parseInt(rating),
      comment: comment.trim(),
      image,
    });

    const savedReview = await review.save();
    await updateProductRating(productId);

    const populatedReview = await Review.findById(savedReview._id)
      .populate("user", "name")
      .populate("product", "name");

    res.status(201).json({
      message: "Review submitted successfully",
      review: populatedReview,
    });
  } catch (error) {
    console.error("Submit review error:", error);
    res.status(500).json({
      message: "Failed to submit review",
      error: error.message,
    });
  }
});


// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const reviews = await Review.find({ product: productId })
      .populate('user', 'name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalReviews = await Review.countDocuments({ product: productId });

    // Calculate rating distribution
    const ratingCounts = await Review.aggregate([
      { $match: { product: productId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = 0;
    }
    ratingCounts.forEach(item => {
      ratingDistribution[item._id] = item.count;
    });

    res.json({
      reviews,
      totalReviews,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit),
      ratingDistribution
    });

  } catch (error) {
    console.error('Fetch reviews error:', error);
    res.status(500).json({
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
});

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
router.get('/my-reviews', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('product', 'name images')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Fetch user reviews error:', error);
    res.status(500).json({
      message: 'Failed to fetch your reviews',
      error: error.message
    });
  }
});

// @desc    Update a review
// @route   PUT /api/reviews/:reviewId
// @access  Private (Only review author)
router.put('/:reviewId', protect, async (req, res) => {
  try {
    const { rating, comment, image } = req.body;
    const reviewId = req.params.reviewId;

    // Validate required fields
    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is the author of the review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    // Update review
    review.rating = parseInt(rating);
    review.comment = comment.trim();
    if (image !== undefined) {
      review.image = image;
    }

    const updatedReview = await review.save();

    // Update product rating after review update
    await updateProductRating(review.product);

    // Populate user data for response
    const populatedReview = await Review.findById(updatedReview._id)
      .populate('user', 'name')
      .populate('product', 'name');

    res.json({
      message: 'Review updated successfully',
      review: populatedReview
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      message: 'Failed to update review',
      error: error.message
    });
  }
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:reviewId
// @access  Private (Only review author or admin)
router.delete('/:reviewId', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is the author of the review or admin
    if (review.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.reviewId);

    // Update product rating after deletion
    await updateProductRating(productId);

    res.json({ message: 'Review deleted successfully' });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      message: 'Failed to delete review',
      error: error.message
    });
  }
});

// @desc    Check if user can review a product
// @route   GET /api/reviews/can-review/:productId
// @access  Private
router.get('/can-review/:productId', protect, async (req, res) => {
  try {
    const productId = req.params.productId;

    // Check if user has purchased and received this product
    const userOrders = await Order.find({ 
      user: req.user._id, 
      status: 'Delivered',
      'orderItems.productId': productId 
    });

    if (userOrders.length === 0) {
      return res.json({ canReview: false, reason: 'Product not purchased or not delivered' });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id
    });

    if (existingReview) {
      return res.json({ 
        canReview: false, 
        reason: 'Already reviewed',
        existingReview: existingReview
      });
    }

    res.json({ canReview: true });

  } catch (error) {
    console.error('Check review eligibility error:', error);
    res.status(500).json({
      message: 'Failed to check review eligibility',
      error: error.message
    });
  }
});

// @desc    Update product rating and review count
// @access  Helper function
async function updateProductRating(productId) {
  try {
    const reviews = await Review.find({ product: productId });
    
    if (reviews.length === 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: 0,
        numReviews: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      numReviews: reviews.length
    });

  } catch (error) {
    console.error('Update product rating error:', error);
    throw error;
  }
}

module.exports = router;