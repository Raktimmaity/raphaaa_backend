const express = require("express");
const router = express.Router();
const Collab = require("../models/Collab");
const Product = require("../models/Product");

// @route   POST /api/collabs
// @desc    Create new collab
router.post("/", async (req, res) => {
  try {
    const { title, collaborators, isPublished, image } = req.body;
    const collab = await Collab.create({ title, collaborators, isPublished, image });
    res.status(201).json(collab);
  } catch (err) {
    res.status(500).json({ message: "Failed to create collab", error: err.message });
  }
});

// @route   GET /api/collabs/all
router.get("/all", async (req, res) => {
  try {
    const collabs = await Collab.find().populate({
      path: "collaborators.products",
      model: "Product",
    });
    res.json(collabs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch all collabs", error: err.message });
  }
});


// @route   GET /api/collabs
// @desc    Get all collabs (optionally filtered by isPublished)
router.get("/", async (req, res) => {
  try {
    const collabs = await Collab.find({ isPublished: true });
    res.json(collabs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch collabs", error: err.message });
  }
});

// @route   GET /api/collabs/all
// @desc    Admin: Get all collabs (including unpublished)
router.get("/all", async (req, res) => {
  try {
    const collabs = await Collab.find().populate("collaborators.products");
    res.json(collabs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch all collabs", error: err.message });
  }
});

// @route   GET /api/collabs/:id
// @desc    Get a single collab by ID
router.get("/:id", async (req, res) => {
  try {
    const collab = await Collab.findById(req.params.id).populate("collaborators.products");
    if (!collab) return res.status(404).json({ message: "Collab not found" });
    res.json(collab);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch collab", error: err.message });
  }
});

// @route   PUT /api/collabs/:id
// @desc    Update a collab (title, collaborators, isPublished)
router.put("/:id", async (req, res) => {
  try {
    const collab = await Collab.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(collab);
  } catch (err) {
    res.status(500).json({ message: "Failed to update collab", error: err.message });
  }
});

// @route   DELETE /api/collabs/:id
// @desc    Delete a collab
router.delete("/:id", async (req, res) => {
  try {
    const collab = await Collab.findByIdAndDelete(req.params.id);
    if (!collab) return res.status(404).json({ message: "Collab not found" });
    res.json({ message: "Collab deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete collab", error: err.message });
  }
});

module.exports = router;
