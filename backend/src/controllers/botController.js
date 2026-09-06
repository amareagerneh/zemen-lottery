const crypto = require("crypto");
const { resolveOrCreateUser } = require("../services/botUserService");
const walletService = require("../services/walletService");
const gameService = require("../services/gameService");
const depositRequestService = require("../services/depositRequestService");
const payoutProfileService = require("../services/payoutProfileService");
const withdrawalService = require("../services/withdrawalService");
const pointsService = require("../services/pointsService");
const referralService = require("../services/referralService");
const paymentMethods = require("../config/paymentMethods");
const { WITHDRAWAL_FEE_PERCENT, MIN_WITHDRAWAL_AMOUNT } = require("../config/fees");
const { uploadScreenshotBuffer, isConfigured: cloudinaryConfigured } = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/** Every handler needs a telegram_id — this pulls it from query (GET) or body (POST) consistently. */
function requireTelegramId(req) {
  const raw = req.method === "GET" ? req.query.telegram_id : req.body.telegram_id;
  const telegramId = Number(raw);
  if (!Number.isInteger(telegramId)) {
    throw new ApiError(400, "telegram_id is required");
  }
  return telegramId;
}

/**
 * Ensures the account exists (creating it on first-ever contact) and
 * returns its internal user id. Every other handler below starts with
 * this — it's what makes "just start typing to the bot" work with no
 * separate sign-up step.
 */
const ensureUser = asyncHandler(async (req, res) => {
  const telegramId = requireTelegramId(req);
  const { first_name, last_name, username, referral_code } = req.body;
  const userId = await resolveOrCreateUser(telegramId, {
    firstName: first_name,
    lastName: last_name,
    username,
    referralCode: referral_code,
  });
  res.json({ userId });
});

const getStatus = asyncHandler(async (req, res) => {
  const telegramId = requireTelegramId(req);
  const userId = await resolveOrCreateUser(telegramId, {
    firstName: req.query.first_name,
    username: req.query.username,
  });
  const [balance, points] = await Promise.all([
    walletService.getBalance(userId),
    pointsService.getPoints(userId),
  ]);
  res.json({ balance, points });
});

const listGames = asyncHandler(async (req, res) => {
  const games = await gameService.listGames("OPEN");
  res.json({ games });
});

const getGame = asyncHandler(async (req, res) => {
  const game = await gameService.getGame(req.params.gameId);
  res.json({ game });
});

const buyTicket = asyncHandler(async (req, res) => {
  const telegramId = requireTelegramId(req);
  const userId = await resolveOrCreateUser(telegramId, {});
  const ticket = await gameService.buyTicket(req.params.gameId, userId, req.body.ticketNumber);
  res.status(201).json({ ticket });
});

const myTickets = asyncHandler(async (req, res) => {
  const telegramId = requireTelegramId(req);
  const userId = await resolveOrCreateUser(telegramId, {});
  const tickets = await gameService.myTickets(userId);
  res.json({ tickets });
});

const getPaymentMethods = asyncHandler(async (req, res) => {
  res.json(paymentMethods);
});

/**
 * multipart form: telegram_id + amount + method + transactionRef +
 * senderName? + screenshot(file) — mirrors POST /api/wallet/deposit-requests
 * exactly, just resolving the user by Telegram id instead of a JWT.
 */
const createDeposit = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Screenshot is required");
  if (!cloudinaryConfigured()) {
    throw new ApiError(500, "Image uploads aren't configured on the server");
  }
  const telegramId = requireTelegramId(req);
  const userId = await resolveOrCreateUser(telegramId, {});

  const amount = parseInt(req.body.amount, 10);
  const { method, transactionRef, senderName } = req.body;

  const publicId = crypto.randomUUID();
  await uploadScreenshotBuffer(req.file.buffer, publicId);

  const request = await depositRequestService.createRequest(
    userId,
    amount,
    method,
    publicId,
    transactionRef,
    senderName
  );
  res.status(201).json({ request });
});

const getPayoutProfile = asyncHandler(async (req, res) => {
  const telegramId = requireTelegramId(req);
  const userId = await resolveOrCreateUser(telegramId, {});
  const profile = await payoutProfileService.getProfile(userId);
  res.json({ profile });
});

const savePayoutProfile = asyncHandler(async (req, res) => {
  const telegramId = requireTelegramId(req);
  const userId = await resolveOrCreateUser(telegramId, {});
  const { accountHolderName, bankName, bankAccountNumber, telebirrPhone } = req.body;
  const profile = await payoutProfileService.upsertProfile(userId, {
    accountHolderName,
    bankName,
    bankAccountNumber,
    telebirrPhone,
  });
  res.json({ profile });
});

const getWithdrawalTerms = asyncHandler(async (req, res) => {
  res.json({ feePercent: WITHDRAWAL_FEE_PERCENT, minimumAmount: MIN_WITHDRAWAL_AMOUNT });
});

const createWithdrawal = asyncHandler(async (req, res) => {
  const telegramId = requireTelegramId(req);
  const userId = await resolveOrCreateUser(telegramId, {});
  const amount = parseInt(req.body.amount, 10);
  const request = await withdrawalService.createRequest(userId, amount);
  res.status(201).json({ request });
});

const getReferralInfo = asyncHandler(async (req, res) => {
  const telegramId = requireTelegramId(req);
  const userId = await resolveOrCreateUser(telegramId, {});
  const info = await referralService.getMyReferralInfo(userId);
  res.json(info);
});

const spin = asyncHandler(async (req, res) => {
  const telegramId = requireTelegramId(req);
  const userId = await resolveOrCreateUser(telegramId, {});
  const result = await pointsService.spin(userId);
  res.json({ result });
});

module.exports = {
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
};
