const { pool, withTransaction } = require("../config/db");
const { ensureWallet } = require("./walletService");
const referralService = require("./referralService");

/**
 * The app is bot-first now: someone can hit any command (/balance,
 * /deposit, tapping a button) without ever going through a separate
 * "sign up" step. So EVERY bot endpoint resolves-or-creates the account
 * transparently on first contact, keyed by Telegram's own user id (which
 * the bot's own shared-secret auth on this whole route group already
 * establishes as trustworthy — see middleware/botAuth.js).
 *
 * `profile` is optional context the bot can pass along when it has it
 * (name/username from ctx.from, a referral code from a /start deep
 * link) — only used the first time this telegramId is ever seen; a
 * returning user's profile fields are refreshed opportunistically but
 * never required.
 */
async function resolveOrCreateUser(telegramId, profile = {}) {
  const { rows } = await pool.query(`SELECT id FROM users WHERE telegram_id = $1`, [telegramId]);
  if (rows.length > 0) {
    if (profile.username) {
      await pool.query(`UPDATE users SET telegram_username = $1 WHERE id = $2`, [
        profile.username,
        rows[0].id,
      ]);
    }
    return rows[0].id;
  }

  return withTransaction(async (client) => {
    const displayName =
      `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
      profile.username ||
      `User${telegramId}`;

    let inserted;
    try {
      inserted = await client.query(
        `INSERT INTO users (name, telegram_id, telegram_username)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [displayName, telegramId, profile.username || null]
      );
    } catch (err) {
      if (err.code === "23505") {
        // Extremely rare race (two near-simultaneous first messages from
        // the same brand-new user) — just look the row up, it exists now.
        const { rows: retry } = await client.query(
          `SELECT id FROM users WHERE telegram_id = $1`,
          [telegramId]
        );
        return retry[0].id;
      }
      throw err;
    }

    const userId = inserted.rows[0].id;
    await ensureWallet(userId, client);
    await referralService.assignReferralCode(client, userId);
    if (profile.referralCode) {
      await referralService.linkReferral(client, userId, profile.referralCode);
    }
    return userId;
  });
}

module.exports = { resolveOrCreateUser };
