// // backend/routes/campaignRoutes.js
// const express = require("express");
// const {
//   createCampaign,
//   getCampaigns,
//   updateCampaign,
//   deleteCampaign
// } = require("../controller/campaignController");
// const { protect, roleCheck } = require("../middleware/authMiddleware");

// const router = express.Router();

// router.post("/", protect, roleCheck("marketing"), createCampaign);
// router.get("/", protect, roleCheck("marketing"), getCampaigns);
// router.put("/:id", protect, roleCheck("marketing"), updateCampaign);
// router.delete("/:id", protect, roleCheck("marketing"), deleteCampaign);

// module.exports = router;


// backend/routes/campaignRoutes.js
const express = require("express");
const {
  createCampaign, getCampaigns, updateCampaign, deleteCampaign,
  redirectAndTrack, pixel, trackConversion
} = require("../controller/campaignController");
const { protect, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// Marketing-only CRUD (unchanged from your current file)
router.post("/", protect, roleCheck("marketing"), createCampaign);
router.get("/", protect, roleCheck("marketing"), getCampaigns);
router.put("/:id", protect, roleCheck("marketing"), updateCampaign);
router.delete("/:id", protect, roleCheck("marketing"), deleteCampaign);

// Public tracking
router.get("/r/:id", redirectAndTrack);            // click tracker + redirect
router.get("/:id/pixel.gif", pixel);              // impression tracker
router.post("/:id/conversion", trackConversion);  // mark conversion

module.exports = router;
