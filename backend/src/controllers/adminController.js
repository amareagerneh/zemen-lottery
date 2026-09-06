const gameService = require("../services/gameService");
const depositRequestService = require("../services/depositRequestService");
const withdrawalService = require("../services/withdrawalService");
const bankSmsService = require("../services/bankSmsService");
const adminReportingService = require("../services/adminReportingService");
const { getSignedUrl } = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");

const createGame = asyncHandler(async (req, res) => {
  const { name, ticketPrice, maxTickets, prizeTiers } = req.body;
  const game = await gameService.createGame({
    name,
    ticketPrice,
    maxTickets,
    prizeTiers,
    createdBy: req.user.id,
  });
  res.status(201).json({ game });
});

const listGamesAdmin = asyncHandler(async (req, res) => {
  const games = await gameService.listGamesAdmin();
  res.json({ games });
});

const updateGame = asyncHandler(async (req, res) => {
  const { name, ticketPrice, maxTickets, prizeTiers } = req.body;
  const game = await gameService.updateGame(req.params.id, {
    name,
    ticketPrice,
    maxTickets,
    prizeTiers,
  });
  res.json({ game });
});

const deleteGame = asyncHandler(async (req, res) => {
  const result = await gameService.deleteGame(req.params.id);
  res.json({ result });
});

// --- User reporting ---

const getUserStats = asyncHandler(async (req, res) => {
  const stats = await adminReportingService.getUserStats();
  res.json({ stats });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await adminReportingService.listUsers(req.query.filter);
  res.json({ users });
});

// --- Deposit review ---

const listDepositRequests = asyncHandler(async (req, res) => {
  const requests = await depositRequestService.listForAdmin(req.query.status);
  res.json({ requests });
});

// Screenshots are never served from a public/static folder — only through
// this authenticated, admin-gated route. It generates a short-lived signed
// Cloudinary URL and redirects to it, so the browser fetches the image
// directly from Cloudinary but only after our own admin check has passed.
const getDepositScreenshot = asyncHandler(async (req, res) => {
  const publicId = await depositRequestService.getScreenshotPath(req.params.id);
  const signedUrl = getSignedUrl(publicId);
  res.redirect(302, signedUrl);
});

const approveDeposit = asyncHandler(async (req, res) => {
  const result = await depositRequestService.approve(req.params.id, req.user.id);
  res.json({ result });
});

const rejectDeposit = asyncHandler(async (req, res) => {
  const result = await depositRequestService.reject(req.params.id, req.user.id, req.body.note);
  res.json({ result });
});

// --- Withdrawal review ---

const listWithdrawalRequests = asyncHandler(async (req, res) => {
  const requests = await withdrawalService.listForAdmin(req.query.status);
  res.json({ requests });
});

const approveWithdrawal = asyncHandler(async (req, res) => {
  const result = await withdrawalService.approve(req.params.id, req.user.id);
  res.json({ result });
});

const rejectWithdrawal = asyncHandler(async (req, res) => {
  const result = await withdrawalService.reject(req.params.id, req.user.id, req.body.note);
  res.json({ result });
});

// --- Bank SMS bridge log (read-only visibility into auto-verification) ---

const listBankSms = asyncHandler(async (req, res) => {
  const messages = await bankSmsService.listRecent();
  res.json({ messages });
});

module.exports = {
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
};