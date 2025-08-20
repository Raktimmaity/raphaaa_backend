// backend/routes/campaignRoutes.js
const express = require("express");
const {
  createCampaign,
  getCampaigns,
  updateCampaign,
  deleteCampaign
} = require("../controller/campaignController");
const { protect, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, roleCheck("marketing"), createCampaign);
router.get("/", protect, roleCheck("marketing"), getCampaigns);
router.put("/:id", protect, roleCheck("marketing"), updateCampaign);
router.delete("/:id", protect, roleCheck("marketing"), deleteCampaign);

module.exports = router;
