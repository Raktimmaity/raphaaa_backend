const express = require("express");
const router = express.Router();
const About = require("../models/About");

// @route GET /api/settings/about
// @desc Get About Us content
// @access Public
router.get("/", async (req, res) => {
  try {
    const about = await About.findOne().sort({ updatedAt: -1 });
    res.json(about || { content: "" });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch About Us content" });
  }
});

// @route PUT /api/settings/about
// @desc Update About Us content
// @access Private (protect with middleware if needed)
router.put("/", async (req, res) => {
  try {
    const { content } = req.body;

    let about = await About.findOne();
    if (about) {
      about.content = content;
    } else {
      about = new About({ content });
    }

    await about.save();
    res.status(200).json({ message: "About Us updated successfully", content: about.content });
  } catch (error) {
    res.status(500).json({ message: "Failed to update About Us content" });
  }
});

module.exports = router;
