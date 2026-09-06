const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const gameRoutes = require("./routes/gameRoutes");
const adminRoutes = require("./routes/adminRoutes");
const referralRoutes = require("./routes/referralRoutes");
const bankSmsRoutes = require("./routes/bankSmsRoutes");
const botRoutes = require("./routes/botRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
// Restrict to the deployed frontend's origin in production. Left unset
// (local dev), allow any origin so localhost:5173 etc. all just work.
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// A friendly, translated-at-the-frontend message instead of the default
// plain-text "Too many requests, please try again later." — the frontend
// shows this verbatim, so it needs to read like something a person wrote.
function rateLimitHandler(req, res) {
  res.status(429).json({
    error: "You're going a bit fast — please wait a moment and try again.",
  });
}

// Tighter limit on money-moving endpoints than the rest of the API.
const financialLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Ticket purchases happen one-per-click when someone is buying several
// tickets in a row for the same pool, so this gets a much higher ceiling
// than deposits/withdrawals while still guarding against abuse/bots.
const ticketLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

app.use("/api/wallet/deposit-requests", financialLimiter);
app.use("/api/wallet/withdrawal-requests", financialLimiter);
app.use("/api/games/:gameId/tickets", ticketLimiter);

// Bot routes carry ALL Telegram users' traffic through one process (one
// IP, from this server's point of view), so they get their own, higher
// ceiling than the per-browser-visitor limiters above — a per-IP limit
// sized for "one person clicking around a website" would throttle the
// entire bot user base together. Revisit this number if the bot's user
// base grows large enough to need it raised further.
const botLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
app.use("/api/bot", botLimiter);

app.use(
  "/api/auth",
  rateLimit({ windowMs: 60 * 1000, limit: 20, handler: rateLimitHandler }),
  authRoutes
);
app.use("/api/wallet", walletRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/bank-sms", bankSmsRoutes);
app.use("/api/bot", botRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use(errorHandler);

module.exports = app;
