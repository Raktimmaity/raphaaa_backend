const express = require("express");
const router = express.Router();
const ContactSetting = require("../models/ContactSetting");

// @desc Get contact settings
// @route GET /api/settings/contact
// @access Public or Admin
router.get("/", async (req, res) => {
  try {
    let setting = await ContactSetting.findOne();
    if (!setting) setting = await ContactSetting.create({});
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// @desc Update contact settings
// @route PUT /api/settings/contact
// @access Admin
router.put("/", async (req, res) => {
  try {
    const data = req.body;
    let setting = await ContactSetting.findOne();
    if (!setting) {
      setting = new ContactSetting(data);
    } else {
      Object.assign(setting, data);
    }
    await setting.save();
    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update settings" });
  }
});

module.exports = router;
