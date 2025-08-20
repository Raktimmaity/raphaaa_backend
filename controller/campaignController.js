// backend/controllers/campaignController.js
const Campaign = require("../models/campaignModel");

// Create new campaign
const createCampaign = async (req, res) => {
  try {
    const newCampaign = await Campaign.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: newCampaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all campaigns for logged-in marketer
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user.id });
    res.status(200).json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update campaign
const updateCampaign = async (req, res) => {
  try {
    const updated = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete campaign
const deleteCampaign = async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  updateCampaign,
  deleteCampaign
};
