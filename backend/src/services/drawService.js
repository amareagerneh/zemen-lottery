const crypto = require("crypto");
const { pool, withTransaction } = require("../config/db");
const { creditWithinTransaction } = require("./walletService");
const { sendTelegramMessage } = require("../utils/telegramNotify");
const ApiError = require("../utils/ApiError");

/**
 * Draws winners for a FULL game and pays out every prize tier. Runs
 * entirely server-side, inside one transaction, so the game can't be
 * drawn twice and no payout can be duplicated.
 *
 * One rank draws one ticket, without replacement — so the same ticket
 * can never win twice, but the same USER can win multiple ranks if they
 * hold more than one ticket in the pool (that's expected for a raffle).
 *
 * Uses crypto.randomInt (CSPRNG), never Math.random, because the output
 * decides who receives real money.
 */
async function drawWinners(gameId) {
  return withTransaction(async (client) => {
    const { rows: gameRows } = await client.query(
      `SELECT * FROM games WHERE id = $1 FOR UPDATE`,
      [gameId]
    );
    if (gameRows.length === 0) throw new ApiError(404, "Game not found");
    const game = gameRows[0];

    if (game.status === "COMPLETED") {
      // Already drawn — return existing results instead of erroring, so
      // a retried call (e.g. two near-simultaneous "game just filled up"
      // triggers) is safe.
      const { rows: existing } = await client.query(
        `SELECT rank, ticket_id, user_id, prize_amount FROM game_winners
         WHERE game_id = $1 ORDER BY rank ASC`,
        [gameId]
      );
      return { alreadyDrawn: true, winners: existing };
    }
    if (game.status !== "FULL") {
      throw new ApiError(400, `Game is not ready to draw (status: ${game.status})`);
    }

    const { rows: tiers } = await client.query(
      `SELECT rank, prize_amount FROM game_prize_tiers WHERE game_id = $1 ORDER BY rank ASC`,
      [gameId]
    );
    if (tiers.length === 0) throw new ApiError(400, "Game has no prize tiers configured");

    await client.query(`UPDATE games SET status = 'DRAWING' WHERE id = $1`, [gameId]);

    const { rows: tickets } = await client.query(
      `SELECT id, user_id, ticket_number FROM tickets
       WHERE game_id = $1 AND status = 'VALID'
       ORDER BY ticket_number ASC`,
      [gameId]
    );
    if (tickets.length === 0) throw new ApiError(400, "Game has no valid tickets");
    if (tickets.length < tiers.length) {
      throw new ApiError(400, "Fewer valid tickets than prize tiers — can't draw");
    }

    // Draw without replacement: shuffle a working copy and take one
    // ticket per tier in order, so no ticket can win more than one rank.
    const shuffled = [...tickets];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const winners = [];
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const winnerTicket = shuffled[i];

      const { rows: winnerRows } = await client.query(
        `INSERT INTO game_winners (game_id, rank, ticket_id, user_id, prize_amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [gameId, tier.rank, winnerTicket.id, winnerTicket.user_id, tier.prize_amount]
      );
      winners.push(winnerRows[0]);

      // Reference includes the rank, so each tier's payout is its own
      // idempotent ledger entry — a game can't pay out any single rank
      // twice because of the unique (type, reference) index.
      await creditWithinTransaction(
        client,
        winnerTicket.user_id,
        Number(tier.prize_amount),
        "PRIZE",
        `game:${gameId}:rank:${tier.rank}`
      );
    }

    // Keep games.winner_ticket_id pointing at the rank-1 winner for
    // backward compatibility with anything still reading it directly
    // (e.g. the single-winner ticket-board highlight).
    const topWinner = winners.find((w) => w.rank === 1) || winners[0];
    await client.query(
      `UPDATE games
       SET status = 'COMPLETED', winner_ticket_id = $1, completed_at = now()
       WHERE id = $2`,
      [topWinner.ticket_id, gameId]
    );

    return { alreadyDrawn: false, winners };
  }).then(async (result) => {
    if (!result.alreadyDrawn) {
      await notifyWinnersOnTelegram(gameId, result.winners);
    }
    return result;
  });
}

/**
 * Best-effort Telegram DM to each winner, sent only after the draw
 * transaction has committed — a notification failure must never be able
 * to roll back a payout that already happened.
 */
async function notifyWinnersOnTelegram(gameId, winners) {
  if (winners.length === 0) return;

  const { rows: game } = await pool.query(`SELECT name FROM games WHERE id = $1`, [gameId]);
  const gameName = game[0]?.name || "a pool";

  const userIds = winners.map((w) => w.user_id);
  const { rows: recipients } = await pool.query(
    `SELECT id, telegram_id FROM users WHERE id = ANY($1::bigint[]) AND telegram_id IS NOT NULL`,
    [userIds]
  );
  const telegramIdByUserId = new Map(recipients.map((r) => [r.id, r.telegram_id]));

  await Promise.all(
    winners.map((w) => {
      const telegramId = telegramIdByUserId.get(w.user_id);
      if (!telegramId) return Promise.resolve();
      const ordinal = w.rank === 1 ? "1st" : w.rank === 2 ? "2nd" : w.rank === 3 ? "3rd" : `${w.rank}th`;
      const text =
        `🎉 <b>Congratulations!</b>\n\n` +
        `You won <b>${ordinal} place</b> in "${gameName}"!\n` +
        `💰 Prize: <b>${w.prize_amount} ETB</b> — already added to your wallet.\n\n` +
        `Type /balance to check, or /mytickets to see all your tickets.`;
      return sendTelegramMessage(telegramId, text);
    })
  );
}

module.exports = { drawWinners };