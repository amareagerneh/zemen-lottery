const { pool, withTransaction } = require("../config/db");
const ApiError = require("../utils/ApiError");

/**
 * Ensures a wallet row exists for a user (call at registration time,
 * but this is a safe fallback too).
 */
async function ensureWallet(userId, client = pool) {
  await client.query(
    `INSERT INTO wallets (user_id, balance) VALUES ($1, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function getBalance(userId) {
  const { rows } = await pool.query(
    "SELECT balance FROM wallets WHERE user_id = $1",
    [userId]
  );
  if (rows.length === 0) throw new ApiError(404, "Wallet not found");
  return Number(rows[0].balance);
}

async function getTransactionHistory(userId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT id, type, amount, reference, status, created_at
     FROM wallet_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

/**
 * Credits a user's wallet after a payment provider confirms a deposit.
 * `reference` MUST be the payment provider's unique transaction id —
 * this is what makes the operation idempotent. If the same reference
 * is submitted twice (e.g. a retried webhook), the unique index on
 * (type, reference) causes the second insert to violate a constraint,
 * which we catch and treat as "already processed" rather than an error.
 */
async function deposit(userId, amount, reference) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, "Deposit amount must be a positive integer");
  }

  return withTransaction(async (client) => {
    await ensureWallet(userId, client);

    let inserted;
    try {
      inserted = await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, reference, status)
         VALUES ($1, 'DEPOSIT', $2, $3, 'COMPLETED')
         RETURNING id`,
        [userId, amount, reference]
      );
    } catch (err) {
      if (err.code === "23505") {
        // Already processed this exact deposit reference — idempotent no-op.
        return { alreadyProcessed: true };
      }
      throw err;
    }

    await client.query(
      `UPDATE wallets SET balance = balance + $1, updated_at = now() WHERE user_id = $2`,
      [amount, userId]
    );

    return { alreadyProcessed: false, transactionId: inserted.rows[0].id };
  });
}

/**
 * Debits a user's wallet within an EXISTING transaction/client, taking a
 * row lock first. Used internally by gameService when purchasing a ticket —
 * never exported for direct use, because debits should always happen
 * alongside the thing they're paying for (in the same transaction).
 */
async function debitWithinTransaction(client, userId, amount, type, reference) {
  const { rows } = await client.query(
    `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );
  if (rows.length === 0) throw new ApiError(404, "Wallet not found");

  const balance = Number(rows[0].balance);
  if (balance < amount) throw new ApiError(400, "Insufficient balance");

  await client.query(
    `INSERT INTO wallet_transactions (user_id, type, amount, reference, status)
     VALUES ($1, $2, $3, $4, 'COMPLETED')`,
    [userId, type, -amount, reference]
  );

  await client.query(
    `UPDATE wallets SET balance = balance - $1, updated_at = now() WHERE user_id = $2`,
    [amount, userId]
  );
}

/**
 * Credits a user's wallet within an EXISTING transaction/client
 * (e.g. paying out a prize as part of the draw transaction).
 */
async function creditWithinTransaction(client, userId, amount, type, reference) {
  await client.query(
    `INSERT INTO wallet_transactions (user_id, type, amount, reference, status)
     VALUES ($1, $2, $3, $4, 'COMPLETED')`,
    [userId, type, amount, reference]
  );

  await client.query(
    `UPDATE wallets SET balance = balance + $1, updated_at = now() WHERE user_id = $2`,
    [amount, userId]
  );
}

module.exports = {
  ensureWallet,
  getBalance,
  getTransactionHistory,
  deposit,
  debitWithinTransaction,
  creditWithinTransaction,
};
