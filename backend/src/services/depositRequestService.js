const { pool, withTransaction } = require("../config/db");
const { creditWithinTransaction } = require("./walletService");
const pointsService = require("./pointsService");
const referralService = require("./referralService");
const ApiError = require("../utils/ApiError");

async function createRequest(userId, amount, method, screenshotPath, transactionRef, senderName) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, "Amount must be a positive whole number");
  }
  if (!["CBE", "TELEBIRR"].includes(method)) {
    throw new ApiError(400, "Method must be CBE or TELEBIRR");
  }
  if (!transactionRef || !transactionRef.trim()) {
    throw new ApiError(400, "Transaction reference/ID from your receipt is required");
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO deposit_requests (user_id, amount, method, screenshot_path, transaction_ref, sender_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, amount, method, status, transaction_ref, created_at`,
      [userId, amount, method, screenshotPath, transactionRef.trim(), senderName?.trim() || null]
    );
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      throw new ApiError(409, "This transaction reference has already been submitted");
    }
    throw err;
  }
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, amount, method, status, admin_note, transaction_ref, auto_verified, created_at, reviewed_at
     FROM deposit_requests WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function listForAdmin(status) {
  const { rows } = await pool.query(
    `SELECT dr.id, dr.amount, dr.method, dr.status, dr.created_at, dr.reviewed_at,
            dr.transaction_ref, dr.sender_name, dr.auto_verified,
            u.id AS user_id, u.name AS user_name, u.phone AS user_phone
     FROM deposit_requests dr
     JOIN users u ON u.id = dr.user_id
     WHERE ($1::text IS NULL OR dr.status = $1)
     ORDER BY dr.created_at DESC
     LIMIT 200`,
    [status || null]
  );
  return rows;
}

async function getScreenshotPath(requestId) {
  const { rows } = await pool.query(
    `SELECT screenshot_path FROM deposit_requests WHERE id = $1`,
    [requestId]
  );
  if (rows.length === 0) throw new ApiError(404, "Deposit request not found");
  return rows[0].screenshot_path;
}

/**
 * Approves a deposit request, crediting the wallet, awarding loyalty
 * points, and paying out any qualifying referral bonus — all in one
 * transaction.
 *
 * `adminId` is the reviewing admin's user id, OR null when this is an
 * automatic approval triggered by a matched bank SMS (see
 * bankSmsService.ingest) — pass { auto: true } in that case so the record
 * is clearly marked as machine-verified rather than human-reviewed.
 */
async function approve(requestId, adminId, { auto = false } = {}) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM deposit_requests WHERE id = $1 FOR UPDATE`,
      [requestId]
    );
    if (rows.length === 0) throw new ApiError(404, "Deposit request not found");
    const reqRow = rows[0];
    if (reqRow.status !== "PENDING") {
      throw new ApiError(400, `Request already ${reqRow.status.toLowerCase()}`);
    }

    await client.query(
      `UPDATE deposit_requests
       SET status = 'APPROVED', reviewed_by = $1, reviewed_at = now(),
           auto_verified = $2, admin_note = COALESCE(admin_note, $3)
       WHERE id = $4`,
      [adminId, auto, auto ? "Auto-verified via bank SMS match" : null, requestId]
    );

    // Reference ties the ledger entry to this exact request, so approving
    // twice (e.g. a double click) can't double-credit — the second attempt
    // will already fail the PENDING check above before this even runs.
    await creditWithinTransaction(
      client,
      reqRow.user_id,
      Number(reqRow.amount),
      "DEPOSIT",
      `deposit-request:${requestId}`
    );

    // Award loyalty points in the SAME transaction as the credit — they
    // succeed or fail together.
    const pointsEarned = await pointsService.awardDepositPoints(
      client,
      reqRow.user_id,
      Number(reqRow.amount)
    );

    // If this user was invited and this is their qualifying deposit, pay
    // the inviter their referral bonus — also in the same transaction.
    const referralReward = await referralService.checkAndRewardReferral(
      client,
      reqRow.user_id,
      Number(reqRow.amount)
    );

    return { id: requestId, status: "APPROVED", pointsEarned, autoVerified: auto, referralReward };
  });
}

async function reject(requestId, adminId, note) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM deposit_requests WHERE id = $1 FOR UPDATE`,
      [requestId]
    );
    if (rows.length === 0) throw new ApiError(404, "Deposit request not found");
    if (rows[0].status !== "PENDING") {
      throw new ApiError(400, `Request already ${rows[0].status.toLowerCase()}`);
    }

    await client.query(
      `UPDATE deposit_requests
       SET status = 'REJECTED', admin_note = $1, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3`,
      [note || null, adminId, requestId]
    );

    return { id: requestId, status: "REJECTED" };
  });
}

module.exports = {
  createRequest,
  listForUser,
  listForAdmin,
  getScreenshotPath,
  approve,
  reject,
};
