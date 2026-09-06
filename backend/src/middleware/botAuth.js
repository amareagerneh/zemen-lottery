const ApiError = require("../utils/ApiError");

/**
 * Everything under /api/bot/* is called by the bot process, never
 * directly by a browser or the Telegram client. It authenticates with a
 * long shared secret instead of a per-user JWT — Telegram's own bot API
 * is what vouches for which end-user a given request is really for
 * (ctx.from.id can't be spoofed by the end user, only forwarded
 * faithfully by our own bot code), so this secret's only job is making
 * sure it really is *our* bot process calling, not a stranger who found
 * the URL.
 */
function requireBotKey(req, res, next) {
  const expected = process.env.TELEGRAM_BOT_API_KEY;
  if (!expected) {
    return next(new ApiError(503, "Bot API isn't configured (missing TELEGRAM_BOT_API_KEY)"));
  }
  const provided = req.headers["x-bot-key"];
  if (!provided || provided !== expected) {
    return next(new ApiError(401, "Invalid or missing bot key"));
  }
  next();
}

module.exports = requireBotKey;
