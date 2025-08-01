const express = require("express");
const router = express.Router();
const Offer = require("../models/offer");
const Product = require("../models/Product");
const { protect, admin } = require("../middleware/authMiddleware");
const { sendMail } = require("../utils/sendMail"); // Assuming you already have this utility
const Subscriber = require("../models/Subscriber");
const Order = require("../models/Order");
const User = require("../models/User");

// Create offer
router.post("/", protect, admin, async (req, res) => {
  const offer = await Offer.create(req.body);

  // Update products with offer
  await Product.updateMany(
  { _id: { $in: offer.productIds } },
  [
    {
      $set: {
        offerPercentage: offer.offerPercentage,
        discountPrice: {
          $subtract: [
            "$price",
            {
              $divide: [
                { $multiply: ["$price", offer.offerPercentage] },
                100
              ]
            }
          ]
        }
      }
    }
  ]
);

const sendInitialOfferEmails = async (offer) => {
  const subscribers = await Subscriber.find({ isSubscribed: true });
  const uniqueBuyerIds = await Order.distinct("user", {
    "orderItems.productId": { $in: offer.productIds },
  });
  const buyers = await User.find({ _id: { $in: uniqueBuyerIds } });

  const recipients = [...subscribers.map(s => s.email), ...buyers.map(b => b.email)];
  const uniqueEmails = [...new Set(recipients)];

  const formattedStart = new Date(offer.startDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
  const formattedEnd = new Date(offer.endDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });

  const subject = `Upcoming Offer: ${offer.title}`;
  const message = `
    <h2>Get Ready for Our New Offer!</h2>
    <p><strong>${offer.title}</strong> is launching soon with up to <strong>${offer.offerPercentage}% OFF</strong>.</p>
    <p>Valid from <strong>${formattedStart}</strong> to <strong>${formattedEnd}</strong>.</p>
    <p>Stay tuned and don't miss out!</p>
  `;

  for (const email of uniqueEmails) {
    await sendMail({ to: email, subject, message });
  }
};
await sendInitialOfferEmails(offer);


  res.status(201).json(offer);
});

// Public: Get all active offers for users
router.get("/public", async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate("productIds", "name price images price discountPrice offerPercentage")
      .sort({ createdAt: -1 });

    const activeOffers = offers.filter(
      offer => new Date(offer.endDate) >= new Date()
    );

    res.json(activeOffers);
  } catch (err) {
    console.error("Public offer fetch failed:", err.message);
    res.status(500).json({ message: "Failed to load offers" });
  }
});

// Get all offers
// Get all offers
router.get("/", protect, admin, async (req, res) => {
  const now = new Date();

  // Auto update isActive flag
  await Offer.updateMany(
    { startDate: { $lte: now }, endDate: { $gte: now } },
    { $set: { isActive: true } }
  );
  await Offer.updateMany(
    { $or: [{ startDate: { $gt: now } }, { endDate: { $lt: now } }] },
    { $set: { isActive: false } }
  );

  // Reset prices for expired offers
  const expiredOffers = await Offer.find({
    $or: [{ startDate: { $gt: now } }, { endDate: { $lt: now } }],
  });

  for (const offer of expiredOffers) {
    await Product.updateMany(
      { _id: { $in: offer.productIds } },
      {
        $set: {
          discountPrice: null,
          offerPercentage: 0,
        },
      }
    );
  }

  const offers = await Offer.find().populate("productIds", "name price discountPrice offerPercentage");
  res.json(offers);
});



// Get single offer
router.get("/:id", protect, admin, async (req, res) => {
  const offer = await Offer.findById(req.params.id).populate("productIds");
  res.json(offer);
});

// Update offer
router.put("/:id", protect, admin, async (req, res) => {
  const updatedOffer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });

  // Apply updated discount to products
  await Product.updateMany(
  { _id: { $in: updatedOffer.productIds } },
  [
    {
      $set: {
        offerPercentage: updatedOffer.offerPercentage,
        discountPrice: {
          $subtract: [
            "$price",
            {
              $divide: [
                { $multiply: ["$price", updatedOffer.offerPercentage] },
                100
              ]
            }
          ]
        }
      }
    }
  ]
);


  res.json(updatedOffer);
});

// Delete offer
router.delete("/:id", protect, admin, async (req, res) => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  // Optionally reset offer fields from products
  await Product.updateMany(
    { _id: { $in: offer.productIds } },
    { $set: { offerPercentage: 0, discountPrice: null } }
  );

  res.json({ message: "Offer deleted" });
});




module.exports = router;