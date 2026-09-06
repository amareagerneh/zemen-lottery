const { pool, withTransaction } = require("../config/db");
const { debitWithinTransaction, creditWithinTransaction } = require("./walletService");
const { getProfile } = require("./payoutProfileService");
const { MIN_WITHDRAWAL_AMOUNT, calculateWithdrawalFee } = require("../config/fees");
const ApiError = require("../utils/ApiError");

async function createRequest(userId, amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, "Amount must be a positive whole number");
  }
  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    throw new ApiError(400, `Minimum withdrawal is ${MIN_WITHDRAWAL_AMOUNT} ETB`);
  }

  const profile = await getProfile(userId);
  if (!profile) {
    throw new ApiError(400, "Add your payout details before requesting a withdrawal");
  }

  const { fee, net } = calculateWithdrawalFee(amount);

  const method = profile.bank_account_number ? "BANK" : "TELEBIRR";
  const snapshot =
    method === "BANK"
      ? {
          accountHolderName: profile.account_holder_name,
          bankName: profile.bank_name,
          bankAccountNumber: profile.bank_account_number,
        }
      : {
          accountHolderName: profile.account_holder_name,
          telebirrPhone: profile.telebirr_phone,
        };

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO withdrawal_requests (user_id, amount, fee_amount, net_amount, method, account_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, amount, fee_amount, net_amount, method, status, created_at`,
      [userId, amount, fee, net, method, JSON.stringify(snapshot)]
    );
    const request = rows[0];

    // Hold the FULL requested amount immediately — the fee is deducted at
    // payout time, not from the user's remaining balance, so the wallet
    // debit has to match what was actually removed from spendable funds.
    await debitWithinTransaction(client, userId, amount, "WITHDRAWAL", `withdrawal:${request.id}`);

    return request;
  });
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, amount, fee_amount, net_amount, method, account_snapshot, status, admin_note, created_at, reviewed_at
     FROM withdrawal_requests WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function listForAdmin(status) {
  const { rows } = await pool.query(
    `SELECT wr.id, wr.amount, wr.fee_amount, wr.net_amount, wr.method, wr.account_snapshot, wr.status, wr.created_at,
            u.id AS user_id, u.name AS user_name, u.phone AS user_phone
     FROM withdrawal_requests wr
     JOIN users u ON u.id = wr.user_id
     WHERE ($1::text IS NULL OR wr.status = $1)
     ORDER BY wr.created_at DESC
     LIMIT 200`,
    [status || null]
  );
  return rows;
}

/**
 * Admin confirms the payout was actually sent outside the system
 * (bank transfer / Telebirr). No wallet change here — the amount was
 * already held at request time.
 */
async function approve(requestId, adminId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`,
      [requestId]
    );
    if (rows.length === 0) throw new ApiError(404, "Withdrawal request not found");
    if (rows[0].status !== "PENDING") {
      throw new ApiError(400, `Request already ${rows[0].status.toLowerCase()}`);
    }

    await client.query(
      `UPDATE withdrawal_requests
       SET status = 'COMPLETED', reviewed_by = $1, reviewed_at = now()
       WHERE id = $2`,
      [adminId, requestId]
    );

    return { id: requestId, status: "COMPLETED" };
  });
}

async function reject(requestId, adminId, note) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`,
      [requestId]
    );
    if (rows.length === 0) throw new ApiError(404, "Withdrawal request not found");
    const reqRow = rows[0];
    if (reqRow.status !== "PENDING") {
      throw new ApiError(400, `Request already ${reqRow.status.toLowerCase()}`);
    }

    await client.query(
      `UPDATE withdrawal_requests
       SET status = 'REJECTED', admin_note = $1, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3`,
      [note || null, adminId, requestId]
    );

    // Return the held funds since the payout won't happen.
    await creditWithinTransaction(
      client,
      reqRow.user_id,
      Number(reqRow.amount),
      "REFUND",
      `withdrawal-refund:${requestId}`
    );

    return { id: requestId, status: "REJECTED" };
  });
}

module.exports = { createRequest, listForUser, listForAdmin, approve, reject };
