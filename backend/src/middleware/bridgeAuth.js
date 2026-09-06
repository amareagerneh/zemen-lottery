const { BANK_SMS_API_KEY, isConfigured } = require("../config/smsBridge");
const ApiError = require("../utils/ApiError");

/**
 * The SMS-bridge device isn't a logged-in user, so it can't send a JWT.
 * Instead it sends the shared secret from BANK_SMS_API_KEY in this header.
 * Treat this key like a password: only give it to the bridge app/device,
 * and rotate it (change the env var) if it's ever exposed.
 */
function requireBridgeKey(req, res, next) {
  if (!isConfigured()) {
    return next(
      new ApiError(503, "Bank SMS auto-verification isn't configured (missing BANK_SMS_API_KEY)")
    );
  }
  const provided = req.headers["x-bridge-key"];
  if (!provided || provided !== BANK_SMS_API_KEY) {
    return next(new ApiError(401, "Invalid or missing bridge key"));
  }
  next();
}

module.exports = requireBridgeKey;
