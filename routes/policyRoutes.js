const express = require("express");
const router = express.Router();
const Policy = require("../models/policyModel");

// @desc   Get Privacy Policy
// @route  GET /api/settings/policy
router.get("/", async (req, res) => {
  try {
    const policy = await Policy.findOne().sort({ updatedAt: -1 });
    res.json(policy || { content: "" });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch policy" });
  }
});

// @desc   Create or Update Privacy Policy
// @route  POST /api/settings/policy
router.put("/", async (req, res) => {
  try {
    const { content } = req.body;

    let policy = await Policy.findOne();
    if (policy) {
      policy.content = content;
    } else {
      policy = new Policy({ content });
    }

    const saved = await policy.save();
    res.status(200).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Failed to save policy" });
  }
});

module.exports = router;
