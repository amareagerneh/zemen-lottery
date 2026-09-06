const ApiError = require("../utils/ApiError");

/**
 * Guards the bank-SMS ingestion endpoint. This isn't hit by a logged-in
 * user — it's called by whatever forwards the bank's SMS to us (an
 * Android automation, a small relay app, etc.), so it can't carry a user
 * JWT. A shared secret is the simplest thing that works for a single
 * trusted device; rotate BANK_SMS_SECRET if it's ever exposed.
 */
function requireBankSmsSecret(req, res, next) {
  const secret = process.env.BANK_SMS_SECRET;
  if (!secret) {
    return next(new ApiError(500, "Bank SMS ingestion isn't configured (missing BANK_SMS_SECRET)"));
  }
  const provided = req.headers["x-bank-sms-secret"];
  if (provided !== secret) {
    return next(new ApiError(401, "Invalid or missing bank SMS secret"));
  }
  next();
}

module.exports = requireBankSmsSecret;
