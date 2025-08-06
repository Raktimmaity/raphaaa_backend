const express = require("express");
const router = express.Router();
const MetaOption = require("../models/MetaOption");

// Get all
router.get("/", async (req, res) => {
  const options = await MetaOption.find();
  res.json(options);
});

// Add one
router.post("/", async (req, res) => {
  const { type, value } = req.body;
  if (!type || !value) return res.status(400).json({ message: "Type and value are required" });

  const exists = await MetaOption.findOne({ type, value });
  if (exists) return res.status(409).json({ message: "Option already exists" });

  const newOption = new MetaOption({ type, value });
  await newOption.save();
  res.status(201).json(newOption);
});

// Edit meta option
router.put("/:id", async (req, res) => {
  const { value } = req.body;
  try {
    const updated = await MetaOption.findByIdAndUpdate(
      req.params.id,
      { value },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update option" });
  }
});

// Delete meta option
router.delete("/:id", async (req, res) => {
  try {
    await MetaOption.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete option" });
  }
});


module.exports = router;
