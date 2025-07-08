const Review = require("../models/Review");
const Product = require("../models/Product");

exports.createReview = async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  try {
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({ message: "You already reviewed this product." });
    }

    const review = new Review({
      product: productId,
      user: req.user._id,
      rating: Number(rating),
      comment,
      image: req.file ? `/uploads/reviews/${req.file.filename}` : undefined,
    });

    await review.save();

    // Update product stats
    const reviews = await Review.find({ product: productId });
    const avgRating =
      reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      rating: avgRating,
      numReviews: reviews.length,
    });

    res.status(201).json({ message: "Review added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error submitting review" });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id }).populate("product", "name");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Error fetching your reviews" });
  }
};
