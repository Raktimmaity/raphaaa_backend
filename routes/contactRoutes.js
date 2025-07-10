const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");

// Post the user contact details
router.post("/", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if(!name || !email || !subject || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }
        const newMessage = await Contact.create({ name, email, subject, message });
        res.status(201).json({ message: "Message sent successfully", data: newMessage });
    } catch (error) {
        res.status(500).json({ error: "failed to send message" });
    }
});

// Get all messages to the admin
router.get("/", async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: "Failed to fecth message" });
    }
});

module.exports = router;