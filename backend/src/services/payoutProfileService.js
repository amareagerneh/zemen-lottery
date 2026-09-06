const { pool } = require("../config/db");
const ApiError = require("../utils/ApiError");

async function getProfile(userId) {
  const { rows } = await pool.query(
    `SELECT account_holder_name, bank_name, bank_account_number, telebirr_phone, updated_at
     FROM payout_profiles WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function upsertProfile(userId, { accountHolderName, bankName, bankAccountNumber, telebirrPhone }) {
  if (!accountHolderName || accountHolderName.trim().length < 2) {
    throw new ApiError(400, "Account holder name is required");
  }
  const hasBank = bankName && bankAccountNumber;
  const hasTelebirr = !!telebirrPhone;
  if (!hasBank && !hasTelebirr) {
    throw new ApiError(400, "Provide either bank details or a Telebirr number");
  }

  const { rows } = await pool.query(
    `INSERT INTO payout_profiles (user_id, account_holder_name, bank_name, bank_account_number, telebirr_phone, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       account_holder_name = EXCLUDED.account_holder_name,
       bank_name = EXCLUDED.bank_name,
       bank_account_number = EXCLUDED.bank_account_number,
       telebirr_phone = EXCLUDED.telebirr_phone,
       updated_at = now()
     RETURNING account_holder_name, bank_name, bank_account_number, telebirr_phone, updated_at`,
    [userId, accountHolderName.trim(), bankName || null, bankAccountNumber || null, telebirrPhone || null]
  );
  return rows[0];
}

module.exports = { getProfile, upsertProfile };
