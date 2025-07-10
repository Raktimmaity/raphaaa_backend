const express = require("express");
const router = express.Router();
const { updateAbout, getAbout } = require("../controller/websiteController");

router.get("/about", getAbout);
router.post("/about", updateAbout);

module.exports = router;
