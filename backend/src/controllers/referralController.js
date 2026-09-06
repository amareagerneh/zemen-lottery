const referralService = require("../services/referralService");
const asyncHandler = require("../utils/asyncHandler");

const getMyReferralInfo = asyncHandler(async (req, res) => {
  const info = await referralService.getMyReferralInfo(req.user.id);
  res.json(info);
});

module.exports = { getMyReferralInfo };
