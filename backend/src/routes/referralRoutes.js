const express = require("express");
const requireAuth = require("../middleware/auth");
const { getMyReferralInfo } = require("../controllers/referralController");

const router = express.Router();

router.use(requireAuth);
router.get("/me", getMyReferralInfo);

module.exports = router;
