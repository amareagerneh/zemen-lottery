/**
 * Fire-and-forget Telegram DM sender using the Bot API directly. Used to
 * notify a winner the instant a draw completes. Silently no-ops if
 * TELEGRAM_BOT_TOKEN isn't set or the user has no linked telegramId —
 * never allowed to affect the payout that triggered it.
 */
async function sendTelegramMessage(telegramId, text, extra = {}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !telegramId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramId, text, parse_mode: "HTML", ...extra }),
    });
    if (!res.ok) {
      console.error(`Telegram sendMessage failed (${res.status}):`, await res.text());
    }
  } catch (err) {
    console.error("Telegram sendMessage error:", err.message);
  }
}

module.exports = { sendTelegramMessage };
