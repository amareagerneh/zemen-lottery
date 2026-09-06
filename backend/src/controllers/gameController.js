const gameService = require("../services/gameService");
const asyncHandler = require("../utils/asyncHandler");

const listOpenGames = asyncHandler(async (req, res) => {
  const games = await gameService.listGames("OPEN");
  res.json({ games });
});

const getGame = asyncHandler(async (req, res) => {
  const game = await gameService.getGame(req.params.gameId);
  res.json({ game });
});

const getGameTickets = asyncHandler(async (req, res) => {
  const tickets = await gameService.getSoldTicketNumbers(req.params.gameId);
  res.json({ tickets });
});

const getGameWinners = asyncHandler(async (req, res) => {
  const winners = await gameService.getGameWinners(req.params.gameId);
  res.json({ winners });
});

const buyTicket = asyncHandler(async (req, res) => {
  const { ticketNumber } = req.body;
  const ticket = await gameService.buyTicket(req.params.gameId, req.user.id, ticketNumber);
  res.status(201).json({ ticket });
});

const myTickets = asyncHandler(async (req, res) => {
  const tickets = await gameService.myTickets(req.user.id);
  res.json({ tickets });
});

const recentWinners = asyncHandler(async (req, res) => {
  const winners = await gameService.getRecentWinners(20);
  res.json({ winners });
});

const myUnseenWins = asyncHandler(async (req, res) => {
  const wins = await gameService.getUnseenWins(req.user.id);
  res.json({ wins });
});

const acknowledgeWin = asyncHandler(async (req, res) => {
  const result = await gameService.acknowledgeWin(req.user.id, req.params.winId);
  res.json({ result });
});

module.exports = {
  listOpenGames,
  getGame,
  getGameTickets,
  getGameWinners,
  buyTicket,
  myTickets,
  recentWinners,
  myUnseenWins,
  acknowledgeWin,
};