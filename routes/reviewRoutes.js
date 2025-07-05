const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');

// @desc    Submit a review for a product
// @route   POST /api/products/:productId/reviews
// @access  Private
router.post('/:productId/reviews', protect, async (req, res) => {
  try {
    const totalReviews = await Review.countDocuments({ product: productId });

    res.json({
      reviews,
      totalReviews,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit)
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

module.exports = router;

// @desc    Get all reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public
// router.get('/:productId/reviews', async (req, res) => {
//   try {
//     const productId = req.params.productId;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     const reviews = await Review.find({ product: productId })
//       .populate('user', 'name')
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const

// module.exports = router;