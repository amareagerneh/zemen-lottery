const express = require("express");
const requireBotKey = require("../middleware/botAuth");
const { uploadDepositScreenshot } = require("../middleware/upload");
const {
  ensureUser,
  getStatus,
  listGames,
  getGame,
  buyTicket,
  myTickets,
  getPaymentMethods,
  createDeposit,
  getPayoutProfile,
  savePayoutProfile,
  getWithdrawalTerms,
  createWithdrawal,
  getReferralInfo,
  spin,
} = require("../controllers/botController");

const router = express.Router();

router.use(requireBotKey);

router.post("/ensure-user", ensureUser);
router.get("/status", getStatus);

router.get("/games", listGames);
router.get("/games/:gameId", getGame);
router.post("/games/:gameId/tickets", buyTicket);
router.get("/my-tickets", myTickets);

router.get("/payment-methods", getPaymentMethods);
router.post("/deposit-requests", uploadDepositScreenshot.single("screenshot"), createDeposit);

router.get("/payout-profile", getPayoutProfile);
router.post("/payout-profile", savePayoutProfile);

router.get("/withdrawal-terms", getWithdrawalTerms);
router.post("/withdrawal-requests", createWithdrawal);

router.get("/referrals", getReferralInfo);
router.post("/spin", spin);

module.exports = router;
