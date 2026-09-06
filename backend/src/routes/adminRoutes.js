const express = require("express");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");
const {
  createGame,
  listGamesAdmin,
  updateGame,
  deleteGame,
  getUserStats,
  listUsers,
  listDepositRequests,
  getDepositScreenshot,
  approveDeposit,
  rejectDeposit,
  listWithdrawalRequests,
  approveWithdrawal,
  rejectWithdrawal,
  listBankSms,
} = require("../controllers/adminController");

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.post("/games", createGame);
router.get("/games", listGamesAdmin);
router.put("/games/:id", updateGame);
router.delete("/games/:id", deleteGame);

router.get("/users/stats", getUserStats);
router.get("/users", listUsers);

router.get("/deposit-requests", listDepositRequests);
router.get("/deposit-requests/:id/screenshot", getDepositScreenshot);
router.post("/deposit-requests/:id/approve", approveDeposit);
router.post("/deposit-requests/:id/reject", rejectDeposit);

router.get("/withdrawal-requests", listWithdrawalRequests);
router.post("/withdrawal-requests/:id/approve", approveWithdrawal);
router.post("/withdrawal-requests/:id/reject", rejectWithdrawal);

router.get("/bank-sms", listBankSms);

module.exports = router;