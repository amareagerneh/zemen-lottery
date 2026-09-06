const { pool } = require("../config/db");
const { parseBankSms, namesLooselyMatch } = require("../utils/smsParser");
const depositRequestService = require("./depositRequestService");

async function ingest({ text, sender, provider: providerHint }) {
  if (!text || typeof text !== "string") {
    const err = new Error("`text` is required");
    err.statusCode = 400;
    throw err;
  }

  // Pass senderHint as the third argument
  const parsed = parseBankSms(text, providerHint, sender);
  const { provider, amount, ref, name } = parsed;

  console.log("📥 [Service] ingest called with:", {
    text,
    sender,
    providerHint,
    parsed,
  });

  let matchedRequestId = null;
  let matchStrategy = null;
  let status = "UNPARSEABLE";

  if (amount) {
    status = "UNMATCHED";

    // --- Strategy 1: exact reference match ---
    // --- Strategy 1: exact transaction reference match ---
    if (ref) {
      const { rows } = await pool.query(
        `SELECT id, amount
     FROM deposit_requests
     WHERE status = 'PENDING'
       AND method = $1
       AND lower(transaction_ref) = lower($2)
     LIMIT 2`,
        [provider, ref],
      );

      if (rows.length === 1 && Number(rows[0].amount) === amount) {
        matchedRequestId = rows[0].id;
        matchStrategy = "reference";
      }
    }

    // --- Strategy 2: amount + payer-name fallback ---
    if (!matchedRequestId && name) {
      const { rows } = await pool.query(
        `SELECT id, sender_name FROM deposit_requests
         WHERE status = 'PENDING'
           AND method = $1
           AND amount = $2
           AND created_at > now() - interval '48 hours'`,
        [provider, amount],
      );
      const candidates = rows.filter(
        (r) => r.sender_name && namesLooselyMatch(r.sender_name, name),
      );
      if (candidates.length === 1) {
        matchedRequestId = candidates[0].id;
        matchStrategy = "amount+name";
      }
    }

    if (matchedRequestId) {
      try {
        // Note: approve expects adminId as second param; we pass null for auto
        await depositRequestService.approve(matchedRequestId, null, {
          auto: true,
        });
        status = "MATCHED";
      } catch (err) {
        matchedRequestId = null;
        matchStrategy = null;
        status = "UNMATCHED";
      }
    }
  }

  const { rows: logRows } = await pool.query(
    `INSERT INTO bank_sms_messages
       (provider, raw_text, sender_phone, parsed_amount, parsed_name, parsed_ref,
        matched_deposit_request_id, match_strategy, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      provider || "UNKNOWN",
      text,
      sender || null,
      amount,
      name,
      ref,
      matchedRequestId,
      matchStrategy,
      status,
    ],
  );

  return {
    logId: logRows[0].id,
    status,
    matchedRequestId,
    matchStrategy,
    parsed,
  };
}

async function listRecent(limit = 100) {
  const { rows } = await pool.query(
    `SELECT * FROM bank_sms_messages ORDER BY received_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

module.exports = { ingest, listRecent };
