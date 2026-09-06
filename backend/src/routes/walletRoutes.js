const express = require("express");
const requireAuth = require("../middleware/auth");
const { uploadDepositScreenshot } = require("../middleware/upload");
const {
  getMyWallet,
  getMyTransactions,
  getPaymentMethods,
  createDepositRequest,
  listMyDepositRequests,
  getMyPayoutProfile,
  upsertMyPayoutProfile,
  createWithdrawalRequest,
  listMyWithdrawalRequests,
  getWithdrawalTerms,
  getMyPoints,
  spinWheel,
} = require("../controllers/walletController");

const router = express.Router();

router.use(requireAuth);

router.get("/me", getMyWallet);
router.get("/me/transactions", getMyTransactions);

router.get("/points", getMyPoints);
router.post("/spin", spinWheel);

router.get("/payment-methods", getPaymentMethods);
router.post("/deposit-requests", uploadDepositScreenshot.single("screenshot"), createDepositRequest);
router.get("/deposit-requests", listMyDepositRequests);

router.get("/payout-profile", getMyPayoutProfile);
router.put("/payout-profile", upsertMyPayoutProfile);

router.get("/withdrawal-terms", getWithdrawalTerms);
router.post("/withdrawal-requests", createWithdrawalRequest);
router.get("/withdrawal-requests", listMyWithdrawalRequests);

module.exports = router;
