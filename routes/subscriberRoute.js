const express = require("express");
const router = express.Router();
const Subscriber = require("../models/Subscriber");
const { sendMail } = require("../utils/sendMail");

// @route POST /api/subscribe
// @desc Handle newsletter subscription
// @access Public
router.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    let subscriber = await Subscriber.findOne({ email });

    if (subscriber) {
      if (!subscriber.isSubscribed) {
        subscriber.isSubscribed = true;
        subscriber.subscribedAt = Date.now();
        await subscriber.save();

        await sendMail({
          to: email,
          subject: "🎉 Welcome Back to Raphaaa Newsletters!",
          message: `
            <p>Hi there,</p>
            <p>You’ve successfully re-subscribed to Raphaaa updates! 🎉</p>
            <p>We’ll keep you in the loop about new arrivals, offers, and fashion drops.</p>
            <p style="margin-top:20px;font-size:12px;">
              If you change your mind later, you can <a href="https://raphaaa-backend.onrender.com/api/unsubscribe/${encodeURIComponent(email)}">unsubscribe here</a>.
            </p>
          `,
        });

        return res.status(200).json({ message: "You have re-subscribed successfully." });
      }

      return res.status(400).json({ message: "Email is already subscribed" });
    }

    subscriber = new Subscriber({ email, ipAddress: ip });
    await subscriber.save();

    await sendMail({
      to: email,
      subject: "👋 Welcome to Raphaaa!",
      message: `
        <p>Hi there,</p>
        <p>Thanks for subscribing to Raphaaa! ✨</p>
        <p>You’ll now be the first to hear about new drops, exclusive offers, and stylish arrivals.</p>
        <p style="margin-top:20px;font-size:12px;">
          Don’t want emails from us? <a href="https://raphaaa-backend.onrender.com/api/unsubscribe/${encodeURIComponent(email)}">Unsubscribe here</a>.
        </p>
      `,
    });

    res.status(201).json({ message: "Successfully subscribed to the newsletter!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/subscribe/push", async (req, res) => {
  const { email, subscription } = req.body;

  if (!email || !subscription?.endpoint) {
    return res.status(400).json({ message: "Invalid subscription data" });
  }

  try {
    const subscriber = await Subscriber.findOne({ email });
    if (!subscriber) return res.status(404).json({ message: "Subscriber not found" });

    subscriber.pushSubscription = subscription;
    await subscriber.save();

    res.status(200).json({ message: "Push subscription saved successfully" });
  } catch (err) {
    console.error("Push subscription error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// @route GET /api/unsubscribe/:email
// @desc Unsubscribe from newsletter
// @access Public
router.get("/unsubscribe/:email", async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  try {
    const subscriber = await Subscriber.findOne({ email });

    if (!subscriber) {
      return res.status(404).send("Email not found.");
    }

    subscriber.isSubscribed = false;
    await subscriber.save();

    res.send(`
      <div style="text-align:center; margin-top:50px;">
        <h2>You have been unsubscribed from Raphaaa newsletters.</h2>
        <p>You will no longer receive email notifications.</p>
      </div>
    `);
  } catch (err) {
    res.status(500).send("Server error.");
  }
});

// @route GET /api/subscribers
// @desc Get all subscribers (admin use)
// @access Private (but currently public unless you add middleware)
router.get("/subscribers", async (req, res) => {
  try {
    const allSubscribers = await Subscriber.find().sort({ subscribedAt: -1 });
    res.status(200).json(allSubscribers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// @route DELETE /api/subscribers/:id
// @desc Delete a subscriber by ID
// @access Private
router.delete("/subscribers/:id", async (req, res) => {
  try {
    const deleted = await Subscriber.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Subscriber not found" });
    res.status(200).json({ message: "Subscriber deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting subscriber" });
  }
});



module.exports = router;