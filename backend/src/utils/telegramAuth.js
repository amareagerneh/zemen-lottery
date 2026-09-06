const crypto = require("crypto");

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // 24h

/**
 * Verifies a Telegram Mini App `initData` string against the bot token,
 * per Telegram's documented algorithm:
 *   https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Returns the parsed, verified fields on success, or null if the data is
 * missing, malformed, has an invalid signature, or is too old.
 */
function verifyTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== "string" || !botToken) return null;

  let params;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expectedBuf = Buffer.from(expectedHash, "hex");
  const actualBuf = Buffer.from(hash, "hex");
  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) return null;
  const ageSeconds = Date.now() / 1000 - authDate;
  if (ageSeconds < 0 || ageSeconds > MAX_AUTH_AGE_SECONDS) return null;

  let user = null;
  const userJson = params.get("user");
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {
      return null;
    }
  }
  if (!user || !Number.isInteger(user.id)) return null;

  return {
    telegramId: user.id,
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    username: user.username || null,
    startParam: params.get("start_param") || null,
  };
}

module.exports = { verifyTelegramInitData };
