const Hero = require("../models/Hero");
const cloudinary = require("cloudinary").v2;

// @desc    Create or update hero section
// @route   POST /api/website/hero
exports.createOrUpdateHero = async (req, res) => {
  try {
    const { title, paragraph } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Hero image is required" });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "raphaaa/hero",
    });

    // Either update the existing or create new
    const existing = await Hero.findOne();
    if (existing) {
      existing.title = title;
      existing.paragraph = paragraph;
      existing.image = result.secure_url;
      await existing.save();
      return res.json({ message: "Hero updated", data: existing });
    } else {
      const hero = await Hero.create({
        title,
        paragraph,
        image: result.secure_url,
      });
      return res.status(201).json({ message: "Hero created", data: hero });
    }
  } catch (error) {
    console.error("Hero create/update error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get hero details
// @route   GET /api/website/hero
exports.getHero = async (req, res) => {
  try {
    const hero = await Hero.findOne();
    if (!hero) return res.status(404).json({ message: "No hero data found" });
    res.json(hero);
  } catch (error) {
    console.error("Fetch hero error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
