const express = require("express");
const router = express.Router();
const Subscriber = require("../models/Subscriber");

// @route POST /api/subscribe
// @desc Subscribe a user to the newsletter
// @access Public
router.post("/subscribe", async (req, res) => {
    const { email } = req.body;
    if(!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    try {
        // Check if the email already exists
        let subscriber = await Subscriber.findOne({ email });
        if (subscriber) {
            return res.status(400).json({ message: "Email already subscribed" });
        }

        // Create a new subscriber
        subscriber = new Subscriber({ email });
        await subscriber.save();

        res.status(201).json({ message: "Successfully subscribed to the newsletter!!" });
    } catch (error) {
        console.error("Error subscribing:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;