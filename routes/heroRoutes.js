const express = require("express");
const router = express.Router();
const multer = require("multer");
const { createOrUpdateHero, getHero } = require("../controller/heroController");

// Multer config
const storage = multer.diskStorage({});
const upload = multer({ storage });

// Routes
router.get("/", getHero);
router.post("/", upload.single("image"), createOrUpdateHero);

module.exports = router;
