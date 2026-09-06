const crypto = require("crypto");
const { pool } = require("../config/db");
const { awardPoints } = require("./pointsService");
const { creditWithinTransaction } = require("./walletService");
const { REFERRAL_BONUS_AMOUNT, REFERRAL_BONUS_POINTS, REFERRAL_MIN_DEPOSIT } = require("../config/referral");
const ApiError = require("../utils/ApiError");

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, avoids confusion

function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Generates a unique referral code for a brand-new user. Called inside the
 * registration transaction, right after the user row is inserted.
 */
async function assignReferralCode(client, userId) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    try {
      await client.query(`UPDATE users SET referral_code = $1 WHERE id = $2`, [code, userId]);
      return code;
    } catch (err) {
      if (err.code === "23505") continue; // collision — vanishingly rare, just retry
      throw err;
    }
  }
  throw new Error("Could not generate a unique referral code");
}

/**
 * Links a new user to whoever invited them. Silently no-ops on a bad/self
 * code — an invalid referral code shouldn't block registration.
 */
async function linkReferral(client, newUserId, referralCodeInput) {
  if (!referralCodeInput || typeof referralCodeInput !== "string") return;
  const code = referralCodeInput.trim().toUpperCase();
  if (!code) return;

  const { rows } = await client.query(`SELECT id FROM users WHERE referral_code = $1`, [code]);
  if (rows.length === 0) return;
  const inviterId = rows[0].id;
  if (inviterId === newUserId) return;

  await client.query(`UPDATE users SET referred_by = $1 WHERE id = $2`, [inviterId, newUserId]);
  await client.query(
    `INSERT INTO referrals (inviter_id, invitee_id) VALUES ($1, $2)
     ON CONFLICT (invitee_id) DO NOTHING`,
    [inviterId, newUserId]
  );
}

/**
 * Called from inside depositRequestService.approve's transaction, right
 * after the deposit is credited. If this deposit is the invitee's
 * qualifying deposit (>= REFERRAL_MIN_DEPOSIT) and their referral is still
 * PENDING, pays the inviter their bonus ETB + points and marks it COMPLETED.
 * Safe to call on every approval — it's a no-op once already COMPLETED.
 */
async function checkAndRewardReferral(client, invitedUserId, depositAmount) {
  if (depositAmount < REFERRAL_MIN_DEPOSIT) return null;

  const { rows } = await client.query(
    `SELECT * FROM referrals WHERE invitee_id = $1 AND status = 'PENDING' FOR UPDATE`,
    [invitedUserId]
  );
  if (rows.length === 0) return null;
  const referral = rows[0];

   await client.query(
    `UPDATE referrals
     SET status = 'REWARDED', reward_amount = $1, reward_points = $2, completed_at = EXTRACT(EPOCH FROM now())::INTEGER
     WHERE id = $3`,
    [REFERRAL_BONUS_AMOUNT, REFERRAL_BONUS_POINTS, referral.id]
  );


  await creditWithinTransaction(
    client,
    referral.inviter_id,
    REFERRAL_BONUS_AMOUNT,
    "REFERRAL",
    `referral:${referral.id}`
  );
  await awardPoints(client, referral.inviter_id, REFERRAL_BONUS_POINTS);

  return {
    inviterId: referral.inviter_id,
    rewardAmount: REFERRAL_BONUS_AMOUNT,
    rewardPoints: REFERRAL_BONUS_POINTS,
  };
}

async function getMyReferralInfo(userId) {
  const { rows: userRows } = await pool.query(
    `SELECT referral_code FROM users WHERE id = $1`,
    [userId]
  );
  if (userRows.length === 0) throw new ApiError(404, "User not found");

  const { rows } = await pool.query(
    `SELECT r.status, r.reward_amount, r.reward_points, r.created_at, r.completed_at,
            u.name AS invitee_name
     FROM referrals r
     JOIN users u ON u.id = r.invitee_id
     WHERE r.inviter_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );

  const completed = rows.filter((r) => r.status === "COMPLETED");
  const totalEarned = completed.reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);

  return {
    referralCode: userRows[0].referral_code,
    bonusAmount: REFERRAL_BONUS_AMOUNT,
    bonusPoints: REFERRAL_BONUS_POINTS,
    minDeposit: REFERRAL_MIN_DEPOSIT,
    totalInvited: rows.length,
    totalCompleted: completed.length,
    totalEarned,
    referrals: rows,
  };
}

module.exports = { assignReferralCode, linkReferral, checkAndRewardReferral, getMyReferralInfo };
