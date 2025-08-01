const express = require("express");
const Product = require("../models/Product");
const {
  protect,
  admin,
  adminOrMerchantise,
} = require("../middleware/authMiddleware");
const Review = require("../models/Review");
const Order = require("../models/Order");
const User = require("../models/User");

const router = express.Router();

// @route POST /api/products
// @desc Create a new Product
// @access Private/Admin
router.post("/", protect, admin, adminOrMerchantise, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      countInStock,
      category,
      brand,
      sizes,
      colors,
      collections,
      material,
      gender,
      images,
      isFeatured,
      isPublished,
      tags,
      dimensions,
      weight,
      sku,
      offerPercentage,
    } = req.body;

    const product = new Product({
      name,
      description,
      price,
      discountPrice,
      countInStock,
      category,
      brand,
      sizes,
      colors,
      collections,
      material,
      gender,
      images,
      isFeatured,
      isPublished,
      tags,
      dimensions,
      weight,
      sku,
      offerPercentage,
      user: req.user._id, // Reference to the admin user who created it
    });

    const createdProduct = await product.save();
    // Get all subscribed users
    const Subscriber = require("../models/Subscriber");
    const { sendMail } = require("../utils/sendMail");

    const subscribers = await Subscriber.find({ isSubscribed: true });

    if (subscribers.length > 0) {
      const productUrl = `https://raphaaa.onrender.com/product/${createdProduct._id}`; // Update this as needed
      const subject = `New Arrival: ${createdProduct.name} just dropped!`;

      const message = `
    <h2>New Product Alert!</h2>
    <p>We just added <strong>${
      createdProduct.name
    }</strong> to our collection.</p>
    <p><a href="${productUrl}">Click here</a> to view it now!</p>
    <p>Thanks for being a part of Raphaaa.</p>
     <p style="margin-top:20px; font-size:12px;">
    Not interested? <a href="https://raphaaa-backend.onrender.com/api/unsubscribe/${encodeURIComponent(
      subscribers.email
    )}">Unsubscribe</a>
  </p>
  `;

      for (const subscriber of subscribers) {
        await sendMail({
          to: subscriber.email,
          subject,
          message,
        });
      }
    }

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// @route GET /api/products
// @desc Get all products with optional queries filters
// access Public
router.get("/", async (req, res) => {
  try {
    const {
      collection,
      size,
      color,
      gender,
      minPrice,
      maxPrice,
      sortBy,
      search,
      category,
      material,
      brand,
      limit,
      userId, // 👈 new
    } = req.query;

    let query = {};
    // git status
    // Filters
    if (collection && collection.toLowerCase() !== "all") {
      query.collections = collection;
    }

    if (category && category.toLowerCase() !== "all") {
      query.category = category;
    }

    if (material) {
      query.material = { $in: material.split(",") };
    }

    if (brand) {
      query.brand = { $in: brand.split(",") };
    }

    if (size) {
      query.sizes = { $in: size.split(",") };
    }

    if (color) {
      query.colors = { $in: [color] };
    }

    if (gender) {
      query.gender = gender;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Sorting
    let sort = {};
    if (sortBy) {
      switch (sortBy) {
        case "priceAsc":
          sort = { price: 1 };
          break;
        case "priceDesc":
          sort = { price: -1 };
          break;
        case "popularity":
          sort = { rating: -1 };
          break;
        default:
          break;
      }
    }

    // Fetch products
    let products = await Product.find(query)
      .sort(sort)
      .limit(Number(limit) || 0);

    // If user has a valid coupon, apply discount
    if (userId) {
      const user = await User.findById(userId);

      if (
        user?.coupon &&
        user.coupon.code &&
        user.coupon.discount &&
        new Date(user.coupon.expiresAt) > new Date()
      ) {
        const discount = user.coupon.discount;

        // Apply discountPrice on the fly
        products = products.map((p) => {
          const discountPrice = parseFloat(
            (p.price * (1 - discount / 100)).toFixed(2)
          );
          return { ...p._doc, discountPrice };
        });
      }
    }

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// GET /api/products/inventory - Admin & Merchandise only
router.get("/inventory", async (req, res) => {
  try {
    const products = await Product.find().select(
      "name category price countInStock"
    );
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

// @route GET /api/products/best-seller
// @desc Retrieve the product with highest rating
// @access Public
// router.get("/best-seller", async(req, res) => {
//     try {
//         const bestSeller = await Product.findOne().sort({ rating: -1 });
//         if(bestSeller){
//             res.json(bestSeller);
//         } else {
//             res.status(404).json({ message: "No best seller found" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send("Internal Server error");
//     }
// });

// routes/productRoutes.js or analyticsRoutes.js
router.get("/best-seller", async (req, res) => {
  try {
    const bestSellers = await Order.aggregate([
      { $unwind: "$orderItems" }, // Break down array of items

      {
        $group: {
          _id: "$orderItems.productId", // Group by product ID
          totalSold: { $sum: "$orderItems.quantity" }, // Sum quantity sold
        },
      },

      { $sort: { totalSold: -1 } }, // Sort by sold quantity, highest first
      { $limit: 10 }, // Top 10

      {
        $lookup: {
          from: "products", // ⬅️ must match your actual MongoDB collection name
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" }, // convert array to object

      {
        $project: {
          _id: 0,
          productId: "$product._id",
          name: "$product.name",
          price: "$product.price",
          discountPrice: "$product.discountPrice",
          category: "$product.category",
          gender: "$product.gender",
          image: { $arrayElemAt: ["$product.images.url", 0] },
          totalSold: 1,
        },
      },
    ]);

    res.status(200).json(bestSellers);
  } catch (error) {
    console.error("Error fetching best sellers:", error);
    res.status(500).json({ message: "Failed to fetch best sellers" });
  }
});

// @route GET /api/products/new-arrivals
// @desc Retrieve latest 8 products - Creation date
// @access Public
router.get("/new-arrivals", async (req, res) => {
  try {
    const newArrivals = await Product.find().sort({ createdAt: -1 }).limit(8);
    res.json(newArrivals);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

// @route GET /api/products/similar/:id
// @desc Retrieve similar products based on the current product's gender and category
// @access Public
router.get("/similar/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const similarProducts = await Product.find({
      _id: { $ne: id }, // Exclude the current product ID
      gender: product.gender,
      category: product.category,
    }).limit(4);

    res.json(similarProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// @route PUT /api/products/:id
// @desc Update an existing product ID
// @access Private/Admin
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      countInStock,
      category,
      brand,
      sizes,
      colors,
      collections,
      material,
      gender,
      images,
      isFeatured,
      isPublished,
      tags,
      dimensions,
      weight,
      sku,
      offerPercentage,
    } = req.body;

    // Find product by ID
    const product = await Product.findById(req.params.id);

    if (product) {
      // Update product fields
      product.name = name || product.name;
      product.description = description || product.description;
      product.price = price || product.price;
      product.discountPrice = discountPrice || product.discountPrice;
      product.countInStock = countInStock || product.countInStock;
      product.category = category || product.category;
      product.brand = brand || product.brand;
      product.sizes = sizes || product.sizes;
      product.colors = colors || product.colors;
      product.collections = collections || product.collections;
      product.material = material || product.material;
      product.gender = gender || product.gender;
      product.images = images || product.images;
      product.isFeatured =
        isFeatured !== undefined ? isFeatured : product.isFeatured;
      product.isPublished =
        isPublished !== undefined ? isPublished : product.isPublished;
      product.tags = tags || product.tags;
      product.dimensions = dimensions || product.dimensions;
      product.weight = weight || product.weight;
      product.sku = sku || product.sku;
      product.offerPercentage = offerPercentage || 0;

      // Save the updated product to the database
      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// @route DELETE /api/products/:id
// @desc Delete a product by ID
// @access Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    // Find the product by ID
    const product = await Product.findById(req.params.id);

    if (product) {
      // Remove the product from the database
      await product.deleteOne();
      res.json({ message: "Product Removed" });
    } else {
      res.status(404).json({ message: "Product not found" }); // Fixed typo: was "re.status" and "Peoduct"
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// @route GET /api/products/:id
// @desc Get a single product by ID
// @access Public
// IMPORTANT: This route MUST be last because it catches all remaining /api/products/[anything]
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

// @route POST /api/products/:productId/reviews
// @desc Submit a product review
// @access Private
router.post("/:productId/reviews", protect, async (req, res) => {
  try {
    const { rating, comment, image } = req.body;
    const { productId } = req.params;

    // Prevent duplicate reviews by the same user (optional)
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id,
    });

    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You already reviewed this product" });
    }

    const review = new Review({
      product: productId,
      user: req.user._id,
      rating,
      comment,
      image,
    });

    await review.save();

    // Recalculate product stats
    const allReviews = await Review.find({ product: productId });
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Product.findByIdAndUpdate(productId, {
      numReviews: allReviews.length,
      rating: avgRating,
    });

    res.status(201).json({ message: "Review submitted", review });
  } catch (err) {
    console.error("Review submission error:", err);
    res
      .status(500)
      .json({ message: "Failed to submit review", error: err.message });
  }
});

module.exports = router;
