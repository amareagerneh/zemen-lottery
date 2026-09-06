const { pool, withTransaction } = require("../config/db");
const { debitWithinTransaction, creditWithinTransaction } = require("./walletService");
const { drawWinners } = require("./drawService");
const ApiError = require("../utils/ApiError");

/**
 * Validates and normalizes prize tiers into rank order. Ranks are
 * re-derived by sorting on the client-supplied rank rather than trusted
 * verbatim, so a client that sent them out of order still ends up
 * correct — "1st" is always the lowest rank number, by construction.
 */
function normalizePrizeTiers(prizeTiers, maxTickets) {
  if (!Array.isArray(prizeTiers) || prizeTiers.length === 0) {
    throw new ApiError(400, "At least one prize tier is required");
  }
  if (prizeTiers.length > maxTickets) {
    throw new ApiError(400, "Can't have more prize winners than tickets");
  }

  const seen = new Set();
  const normalized = prizeTiers.map((t) => {
    const rank = Number(t.rank);
    const prizeAmount = Number(t.prizeAmount);
    if (!Number.isInteger(rank) || rank < 1) {
      throw new ApiError(400, "Each prize tier needs a valid rank");
    }
    if (!Number.isInteger(prizeAmount) || prizeAmount <= 0) {
      throw new ApiError(400, "prizeAmount must be a positive integer");
    }
    if (seen.has(rank)) throw new ApiError(400, `Duplicate prize tier rank ${rank}`);
    seen.add(rank);
    return { rank, prizeAmount };
  });

  normalized.sort((a, b) => a.rank - b.rank);
  return normalized;
}

async function createGame({ name, ticketPrice, maxTickets, prizeTiers, createdBy }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new ApiError(400, "Pool name is required");
  }
  if (!Number.isInteger(ticketPrice) || ticketPrice <= 0) {
    throw new ApiError(400, "ticketPrice must be a positive integer");
  }
  if (!Number.isInteger(maxTickets) || maxTickets < 2) {
    throw new ApiError(400, "maxTickets must be an integer >= 2");
  }
  const tiers = normalizePrizeTiers(prizeTiers, maxTickets);
  const totalPrize = tiers.reduce((sum, t) => sum + t.prizeAmount, 0);

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO games (name, ticket_price, max_tickets, prize_amount, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), ticketPrice, maxTickets, totalPrize, createdBy]
    );
    const game = rows[0];

    for (const tier of tiers) {
      await client.query(
        `INSERT INTO game_prize_tiers (game_id, rank, prize_amount) VALUES ($1, $2, $3)`,
        [game.id, tier.rank, tier.prizeAmount]
      );
    }

    return { ...game, prize_tiers: tiers.map((t) => ({ rank: t.rank, prize_amount: t.prizeAmount })) };
  });
}

/**
 * Edits a pool. Only allowed while it's still OPEN with zero tickets
 * sold — once anyone's bought in, the prize structure they saw has to
 * stay fixed.
 */
async function updateGame(gameId, { name, ticketPrice, maxTickets, prizeTiers }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new ApiError(400, "Pool name is required");
  }
  if (!Number.isInteger(ticketPrice) || ticketPrice <= 0) {
    throw new ApiError(400, "ticketPrice must be a positive integer");
  }
  if (!Number.isInteger(maxTickets) || maxTickets < 2) {
    throw new ApiError(400, "maxTickets must be an integer >= 2");
  }
  const tiers = normalizePrizeTiers(prizeTiers, maxTickets);
  const totalPrize = tiers.reduce((sum, t) => sum + t.prizeAmount, 0);

  return withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM games WHERE id = $1 FOR UPDATE`, [gameId]);
    if (rows.length === 0) throw new ApiError(404, "Game not found");
    const game = rows[0];

    if (game.status !== "OPEN") {
      throw new ApiError(400, "Only open pools can be edited");
    }
    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int AS sold FROM tickets WHERE game_id = $1 AND status = 'VALID'`,
      [gameId]
    );
    if (countRows[0].sold > 0) {
      throw new ApiError(400, "Can't edit a pool once tickets have been sold");
    }

    await client.query(
      `UPDATE games SET name = $1, ticket_price = $2, max_tickets = $3, prize_amount = $4 WHERE id = $5`,
      [name.trim(), ticketPrice, maxTickets, totalPrize, gameId]
    );
    await client.query(`DELETE FROM game_prize_tiers WHERE game_id = $1`, [gameId]);
    for (const tier of tiers) {
      await client.query(
        `INSERT INTO game_prize_tiers (game_id, rank, prize_amount) VALUES ($1, $2, $3)`,
        [gameId, tier.rank, tier.prizeAmount]
      );
    }

    const { rows: updated } = await client.query(`SELECT * FROM games WHERE id = $1`, [gameId]);
    return {
      ...updated[0],
      prize_tiers: tiers.map((t) => ({ rank: t.rank, prize_amount: t.prizeAmount })),
    };
  });
}

/**
 * Removes a pool. If nobody's bought a ticket yet, it's a clean delete.
 * If tickets were already sold, deleting outright would just vanish
 * people's money — instead this cancels the pool and refunds every
 * buyer their ticket price, keeping a record of what happened.
 */
async function deleteGame(gameId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM games WHERE id = $1 FOR UPDATE`, [gameId]);
    if (rows.length === 0) throw new ApiError(404, "Game not found");
    const game = rows[0];

    if (game.status === "COMPLETED" || game.status === "CANCELLED") {
      throw new ApiError(400, `Pool is already ${game.status.toLowerCase()}`);
    }

    const { rows: ticketRows } = await client.query(
      `SELECT id, user_id, price FROM tickets WHERE game_id = $1 AND status = 'VALID'`,
      [gameId]
    );

    if (ticketRows.length === 0) {
      await client.query(`DELETE FROM game_prize_tiers WHERE game_id = $1`, [gameId]);
      await client.query(`DELETE FROM games WHERE id = $1`, [gameId]);
      return { cancelled: false, deleted: true, refundedTickets: 0 };
    }

    for (const t of ticketRows) {
      // Reference is per-ticket, so this can't double-refund even if
      // deleteGame were somehow retried.
      await creditWithinTransaction(
        client,
        t.user_id,
        Number(t.price),
        "REFUND",
        `game:${gameId}:ticket:${t.id}:refund`
      );
    }
    await client.query(
      `UPDATE tickets SET status = 'CANCELLED' WHERE game_id = $1 AND status = 'VALID'`,
      [gameId]
    );
    await client.query(`UPDATE games SET status = 'CANCELLED' WHERE id = $1`, [gameId]);

    return { cancelled: true, deleted: false, refundedTickets: ticketRows.length };
  });
}

async function listGames(status = "OPEN") {
  const { rows } = await pool.query(
    `SELECT g.*,
            COUNT(t.id) FILTER (WHERE t.status = 'VALID') AS tickets_sold,
            COALESCE(
              (SELECT prize_amount FROM game_prize_tiers WHERE game_id = g.id ORDER BY rank ASC LIMIT 1),
              g.prize_amount
            ) AS top_prize
     FROM games g
     LEFT JOIN tickets t ON t.game_id = g.id
     WHERE g.status = $1
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [status]
  );
  return rows;
}

/** All pools regardless of status, for the admin "manage pools" list. */
async function listGamesAdmin() {
  const { rows } = await pool.query(
    `SELECT g.*, COUNT(t.id) FILTER (WHERE t.status = 'VALID') AS tickets_sold
     FROM games g
     LEFT JOIN tickets t ON t.game_id = g.id
     GROUP BY g.id
     ORDER BY g.created_at DESC`
  );
  return rows;
}

async function getGame(gameId) {
  const { rows } = await pool.query(
    `SELECT g.*,
            COUNT(t.id) FILTER (WHERE t.status = 'VALID') AS tickets_sold,
            winner.ticket_number AS winner_ticket_number
     FROM games g
     LEFT JOIN tickets t ON t.game_id = g.id
     LEFT JOIN game_winners gw1 ON gw1.game_id = g.id AND gw1.rank = 1
     LEFT JOIN tickets winner ON winner.id = gw1.ticket_id
     WHERE g.id = $1
     GROUP BY g.id, winner.ticket_number`,
    [gameId]
  );
  if (rows.length === 0) throw new ApiError(404, "Game not found");
  const game = rows[0];

  const { rows: tiers } = await pool.query(
    `SELECT rank, prize_amount FROM game_prize_tiers WHERE game_id = $1 ORDER BY rank ASC`,
    [gameId]
  );
  game.prize_tiers = tiers;
  return game;
}

async function getSoldTicketNumbers(gameId) {
  const { rows } = await pool.query(
    `SELECT ticket_number, user_id FROM tickets WHERE game_id = $1 AND status = 'VALID' ORDER BY ticket_number`,
    [gameId]
  );
  return rows;
}

/** Full per-rank results for a completed game's detail page. */
async function getGameWinners(gameId) {
  const { rows } = await pool.query(
    `SELECT gw.rank, gw.prize_amount, gw.user_id, gw.ticket_id,
            t.ticket_number, u.name AS winner_name
     FROM game_winners gw
     JOIN tickets t ON t.id = gw.ticket_id
     JOIN users u ON u.id = gw.user_id
     WHERE gw.game_id = $1
     ORDER BY gw.rank ASC`,
    [gameId]
  );
  return rows;
}

/**
 * Recently completed draws (one row per game+rank), for the "winner
 * announcement" banner shown to users on login. Public-ish (any authed
 * user can see who won what) — that's intentional for a raffle:
 * publishing winners builds trust.
 */
async function getRecentWinners(limit = 20) {
  const { rows } = await pool.query(
    `SELECT g.id AS game_id, g.name AS game_name, g.completed_at,
            gw.rank, gw.prize_amount,
            t.ticket_number AS winner_ticket_number,
            u.name AS winner_name
     FROM game_winners gw
     JOIN games g ON g.id = gw.game_id
     JOIN tickets t ON t.id = gw.ticket_id
     JOIN users u ON u.id = gw.user_id
     WHERE g.status = 'COMPLETED'
     ORDER BY g.completed_at DESC, gw.rank ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * The critical path: purchasing a ticket.
 *
 * Everything happens inside one transaction, and the game row is locked
 * FIRST with SELECT ... FOR UPDATE. That serializes concurrent buyers of
 * the same game — the second concurrent request has to wait for the
 * first to commit (or roll back) before it can see an up-to-date ticket
 * count, which is exactly what prevents ticket #16 being sold for a
 * 15-ticket game.
 *
 * `requestedTicketNumber` lets a user pick a specific number out of the
 * pool. If omitted, falls back to the next sequential number. Either way,
 * the DB's UNIQUE (game_id, ticket_number) constraint is the final backstop
 * against two people getting the same number — caught below as a 409.
 */
async function buyTicket(gameId, userId, requestedTicketNumber) {
  const result = await withTransaction(async (client) => {
    const { rows: gameRows } = await client.query(
      `SELECT * FROM games WHERE id = $1 FOR UPDATE`,
      [gameId]
    );
    if (gameRows.length === 0) throw new ApiError(404, "Game not found");
    const game = gameRows[0];

    if (game.status !== "OPEN") {
      throw new ApiError(400, `Game is not open for ticket purchases (status: ${game.status})`);
    }

    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int AS sold FROM tickets WHERE game_id = $1 AND status = 'VALID'`,
      [gameId]
    );
    const sold = countRows[0].sold;
    if (sold >= game.max_tickets) {
      // Shouldn't happen given the lock, but guard anyway.
      throw new ApiError(400, "Game is already full");
    }

    let ticketNumber;
    if (requestedTicketNumber !== undefined && requestedTicketNumber !== null) {
      ticketNumber = Number(requestedTicketNumber);
      if (!Number.isInteger(ticketNumber) || ticketNumber < 1 || ticketNumber > game.max_tickets) {
        throw new ApiError(400, `Ticket number must be between 1 and ${game.max_tickets}`);
      }
    } else {
      ticketNumber = sold + 1;
    }

    const price = Number(game.ticket_price);

    // Debit wallet — this itself takes a row lock on the wallet and
    // throws if balance is insufficient, rolling back the whole transaction.
    await debitWithinTransaction(
      client,
      userId,
      price,
      "TICKET",
      `game:${gameId}:ticket:${ticketNumber}:user:${userId}`
    );

    let ticket;
    try {
      const { rows: ticketRows } = await client.query(
        `INSERT INTO tickets (game_id, user_id, ticket_number, price)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [gameId, userId, ticketNumber, price]
      );
      ticket = ticketRows[0];
    } catch (err) {
      if (err.code === "23505") {
        // Someone else already holds this exact number — the game-row lock
        // makes this rare (it'd require the earlier holder to have committed
        // within the same locked window), but a picked number can still
        // collide with a sequential buyer, so handle it explicitly.
        throw new ApiError(409, `Ticket #${ticketNumber} was just taken. Pick another.`);
      }
      throw err;
    }

    const newSoldCount = sold + 1;
    const isNowFull = newSoldCount === game.max_tickets;
    if (isNowFull) {
      await client.query(`UPDATE games SET status = 'FULL' WHERE id = $1`, [gameId]);
    }

    return { ticket, isNowFull };
  });

  // Draw runs in its own transaction, after the ticket-purchase transaction
  // has committed, so the buyer's own request isn't blocked waiting on the
  // draw, and a draw failure can't roll back a legitimately sold ticket.
  if (result.isNowFull) {
    await drawWinners(gameId);
  }

  return result.ticket;
}

async function myTickets(userId) {
  const { rows } = await pool.query(
    `SELECT t.*, g.name AS game_name, g.status AS game_status,
            gw.rank AS won_rank, gw.prize_amount AS won_amount
     FROM tickets t
     JOIN games g ON g.id = t.game_id
     LEFT JOIN game_winners gw ON gw.ticket_id = t.id
     WHERE t.user_id = $1
     ORDER BY t.created_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Wins the user hasn't seen the congratulation popup for yet. Shown once,
 * on login — see acknowledgeWin() for how it gets marked seen.
 */
async function getUnseenWins(userId) {
  const { rows } = await pool.query(
    `SELECT gw.id, gw.rank, gw.prize_amount, g.name AS game_name, t.ticket_number
     FROM game_winners gw
     JOIN games g ON g.id = gw.game_id
     JOIN tickets t ON t.id = gw.ticket_id
     WHERE gw.user_id = $1 AND gw.acknowledged_at IS NULL
     ORDER BY gw.created_at ASC`,
    [userId]
  );
  return rows;
}

/**
 * Marks a win's popup as seen. Scoped to the requesting user's own win
 * row so nobody can mark someone else's win acknowledged.
 */
async function acknowledgeWin(userId, winId) {
  const { rows } = await pool.query(
    `UPDATE game_winners SET acknowledged_at = now() WHERE id = $1 AND user_id = $2 RETURNING id`,
    [winId, userId]
  );
  if (rows.length === 0) throw new ApiError(404, "Win not found");
  return { id: rows[0].id };
}

module.exports = {
  createGame,
  updateGame,
  deleteGame,
  listGames,
  listGamesAdmin,
  getGame,
  getGameWinners,
  getRecentWinners,
  buyTicket,
  myTickets,
  getSoldTicketNumbers,
  getUnseenWins,
  acknowledgeWin,
};