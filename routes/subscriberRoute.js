const express = require("express");
const router = express.Router();
const Subscriber = require("../models/Subscriber");

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
            return res.status(400).json({ message: "Email is already subscribed" });
        }

        subscriber = new Subscriber({ email, ipAddress: ip });
        await subscriber.save();

        res.status(201).json({ message: "Successfully subscribed to the newsletter!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});



module.exports = router;