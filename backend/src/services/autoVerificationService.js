const { pool, withTransaction } = require("../config/db");
const depositRequestService = require("./depositRequestService");
const { parseBankMessage } = require("../utils/bankMessageParser");

/**
 * Records an incoming bank message (from the SMS bridge, or an admin's
 * manual paste) and immediately tries to match it against a PENDING
 * deposit request that's still waiting for verification. Covers the case
 * where the screenshot was uploaded (and OCR'd) before this message arrived.
 */
async function ingestBankMessage(method, rawMessage) {
  const parsed = parseBankMessage(rawMessage);

  const { rows } = await pool.query(
    `INSERT INTO bank_messages (method, raw_message, extracted_transaction_id, extracted_amount, extracted_name)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [method, rawMessage, parsed.transactionId, parsed.amount, parsed.name]
  );
  const messageId = rows[0].id;

  let matchResult = null;
  if (parsed.transactionId && parsed.amount) {
    matchResult = await matchMessageToPendingDeposit(messageId, method, parsed.transactionId, parsed.amount);
  }

  return { messageId, parsed, autoApproved: Boolean(matchResult) };
}

async function matchMessageToPendingDeposit(messageId, method, transactionId, amount) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id FROM deposit_requests
       WHERE status = 'PENDING' AND method = $1
         AND (ocr_transaction_id = $2 OR declared_reference = $2)
         AND amount = $3
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [method, transactionId, amount]
    );
    if (rows.length === 0) return null;
    const depositRequestId = rows[0].id;

    await client.query(`UPDATE bank_messages SET matched_deposit_request_id = $1 WHERE id = $2`, [
      depositRequestId,
      messageId,
    ]);

    return depositRequestService.runApprovalWithinTransaction(client, depositRequestId, {
      reviewedBy: null,
      source: "AUTO",
    });
  });
}

/**
 * Called right after a deposit request is created and OCR'd. Looks
 * backward for an already-received, unmatched bank message with a
 * matching transaction ID + amount — the common case, since the bank's
 * SMS almost always arrives before the user finishes uploading a
 * screenshot of it.
 *
 * Returns null (leaving the deposit PENDING for manual review) whenever
 * there's any ambiguity — no OCR transaction ID, or no matching message
 * yet. It never approves on a weak/partial match.
 */
async function attemptAutoVerify(depositRequestId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM deposit_requests WHERE id = $1 FOR UPDATE`,
      [depositRequestId]
    );
    const deposit = rows[0];
    if (!deposit || deposit.status !== "PENDING") return null;

    // Prefer the OCR-extracted reference; fall back to what the user
    // typed in manually if OCR found nothing usable.
    const candidateRef = deposit.ocr_transaction_id || deposit.declared_reference;
    if (!candidateRef) return null;

    const { rows: msgRows } = await client.query(
      `SELECT id FROM bank_messages
       WHERE method = $1 AND matched_deposit_request_id IS NULL
         AND extracted_transaction_id = $2 AND extracted_amount = $3
       ORDER BY received_at DESC
       LIMIT 1`,
      [deposit.method, candidateRef, Number(deposit.amount)]
    );
    if (msgRows.length === 0) return null;

    await client.query(`UPDATE bank_messages SET matched_deposit_request_id = $1 WHERE id = $2`, [
      depositRequestId,
      msgRows[0].id,
    ]);

    return depositRequestService.runApprovalWithinTransaction(client, depositRequestId, {
      reviewedBy: null,
      source: "AUTO",
    });
  });
}

module.exports = { ingestBankMessage, attemptAutoVerify };
