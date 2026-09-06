const express = require("express");
const requireAuth = require("../middleware/auth");
const {
  listOpenGames,
  getGame,
  getGameTickets,
  getGameWinners,
  buyTicket,
  myTickets,
  recentWinners,
  myUnseenWins,
  acknowledgeWin,
} = require("../controllers/gameController");

const router = express.Router();

router.use(requireAuth);
router.get("/", listOpenGames);
router.get("/my-tickets", myTickets);
router.get("/recent-winners", recentWinners);
router.get("/my-wins/unseen", myUnseenWins);
router.post("/my-wins/:winId/ack", acknowledgeWin);
router.get("/:gameId", getGame);
router.get("/:gameId/tickets", getGameTickets);
router.get("/:gameId/winners", getGameWinners);
router.post("/:gameId/tickets", buyTicket);

module.exports = router;