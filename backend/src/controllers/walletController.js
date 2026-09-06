const crypto = require("crypto");
const walletService = require("../services/walletService");
const depositRequestService = require("../services/depositRequestService");
const payoutProfileService = require("../services/payoutProfileService");
const withdrawalService = require("../services/withdrawalService");
const pointsService = require("../services/pointsService");
const paymentMethods = require("../config/paymentMethods");
const { WITHDRAWAL_FEE_PERCENT, MIN_WITHDRAWAL_AMOUNT } = require("../config/fees");
const { uploadScreenshotBuffer, isConfigured } = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const getMyWallet = asyncHandler(async (req, res) => {
  const balance = await walletService.getBalance(req.user.id);
  res.json({ balance });
});

const getMyTransactions = asyncHandler(async (req, res) => {
  const history = await walletService.getTransactionHistory(req.user.id);
  res.json({ transactions: history });
});

const getPaymentMethods = asyncHandler(async (req, res) => {
  res.json(paymentMethods);
});

// User submits amount + method + a screenshot proving they paid the
// sample CBE/Telebirr account. Goes to PENDING until an admin reviews it —
// the wallet is NOT credited here.
const createDepositRequest = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Screenshot is required");
  if (!isConfigured()) {
    throw new ApiError(
      500,
      "Image uploads aren't configured on the server (missing Cloudinary env vars)"
    );
  }

  const amount = parseInt(req.body.amount, 10);
  const method = req.body.method;
  const transactionRef = req.body.transactionRef;
  const senderName = req.body.senderName;

  // Upload straight to Cloudinary from the in-memory buffer — nothing
  // touches this server's disk.
  const publicId = crypto.randomUUID();
  await uploadScreenshotBuffer(req.file.buffer, publicId);

  const request = await depositRequestService.createRequest(
    req.user.id,
    amount,
    method,
    publicId,
    transactionRef,
    senderName
  );
  res.status(201).json({ request });
});

const listMyDepositRequests = asyncHandler(async (req, res) => {
  const requests = await depositRequestService.listForUser(req.user.id);
  res.json({ requests });
});

const getMyPayoutProfile = asyncHandler(async (req, res) => {
  const profile = await payoutProfileService.getProfile(req.user.id);
  res.json({ profile });
});

const upsertMyPayoutProfile = asyncHandler(async (req, res) => {
  const { accountHolderName, bankName, bankAccountNumber, telebirrPhone } = req.body;
  const profile = await payoutProfileService.upsertProfile(req.user.id, {
    accountHolderName,
    bankName,
    bankAccountNumber,
    telebirrPhone,
  });
  res.json({ profile });
});

const createWithdrawalRequest = asyncHandler(async (req, res) => {
  const amount = parseInt(req.body.amount, 10);
  const request = await withdrawalService.createRequest(req.user.id, amount);
  res.status(201).json({ request });
});

const listMyWithdrawalRequests = asyncHandler(async (req, res) => {
  const requests = await withdrawalService.listForUser(req.user.id);
  res.json({ requests });
});

const getWithdrawalTerms = asyncHandler(async (req, res) => {
  res.json({ feePercent: WITHDRAWAL_FEE_PERCENT, minimumAmount: MIN_WITHDRAWAL_AMOUNT });
});

const getMyPoints = asyncHandler(async (req, res) => {
  const points = await pointsService.getPoints(req.user.id);
  res.json({ points });
});

const spinWheel = asyncHandler(async (req, res) => {
  const result = await pointsService.spin(req.user.id);
  res.json({ result });
});

module.exports = {
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
};
