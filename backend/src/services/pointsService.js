const crypto = require("crypto");
const { pool, withTransaction } = require("../config/db");
const { creditWithinTransaction } = require("./walletService");
const ApiError = require("../utils/ApiError");

const SPIN_COST_POINTS = 50;
const POINTS_PER_LEVEL = 100;
const POINTS_PER_100_ETB_DEPOSITED = 1;

// Fixed wheel segments, in display order — the frontend Wheel component
// renders these exact wedges so the spin animation always lands on
// whichever index the backend actually drew. Lower `weight` = rarer.
const SPIN_SEGMENTS = [
  { amount: 5, weight: 24 },
  { amount: 10, weight: 20 },
  { amount: 15, weight: 16 },
  { amount: 20, weight: 13 },
  { amount: 10, weight: 20 },
  { amount: 25, weight: 10 },
  { amount: 5, weight: 24 },
  { amount: 50, weight: 3 },
];

async function ensureRow(userId, client = pool) {
  await client.query(
    `INSERT INTO user_points (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

function computeLevel(lifetimePoints) {
  return Math.floor(lifetimePoints / POINTS_PER_LEVEL) + 1;
}

async function getPoints(userId) {
  await ensureRow(userId);
  const { rows } = await pool.query(
    `SELECT lifetime_points, spendable_points FROM user_points WHERE user_id = $1`,
    [userId]
  );
  const row = rows[0];
  const lifetimePoints = Number(row.lifetime_points);
  const spendablePoints = Number(row.spendable_points);

  return {
    lifetimePoints,
    spendablePoints,
    level: computeLevel(lifetimePoints),
    pointsIntoLevel: lifetimePoints % POINTS_PER_LEVEL,
    pointsPerLevel: POINTS_PER_LEVEL,
    spinCost: SPIN_COST_POINTS,
    canSpin: spendablePoints >= SPIN_COST_POINTS,
    spinSegments: SPIN_SEGMENTS.map((s) => s.amount),
  };
}

/**
 * Generic point grant — both lifetime and spendable go up. Used for
 * anything that isn't a deposit (currently: referral bonuses). Must be
 * called with the same `client`/transaction as whatever triggered it.
 */
async function awardPoints(client, userId, points) {
  if (points <= 0) return 0;
  await ensureRow(userId, client);
  await client.query(
    `UPDATE user_points
     SET lifetime_points = lifetime_points + $1,
         spendable_points = spendable_points + $1,
         updated_at = now()
     WHERE user_id = $2`,
    [points, userId]
  );
  return points;
}

/**
 * Awards points for an approved deposit. MUST be called with the same
 * `client` (and therefore the same transaction) as the deposit's wallet
 * credit, so a crash between the two can't award points for money that
 * was never actually credited, or vice versa.
 * Rule: 1 point per 100 ETB deposited, rounded down.
 */
async function awardDepositPoints(client, userId, depositAmount) {
  const points = Math.floor(depositAmount / 100) * POINTS_PER_100_ETB_DEPOSITED;
  return awardPoints(client, userId, points);
}

/**
 * Picks a segment index with a cryptographically secure weighted draw —
 * same reasoning as the ticket draw: it decides a real money payout, so
 * Math.random is never acceptable here.
 */
function pickSegmentIndex() {
  const totalWeight = SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  const roll = crypto.randomInt(0, totalWeight);
  let acc = 0;
  for (let i = 0; i < SPIN_SEGMENTS.length; i++) {
    acc += SPIN_SEGMENTS[i].weight;
    if (roll < acc) return i;
  }
  return SPIN_SEGMENTS.length - 1;
}

/**
 * Spends 50 spendable points for a wheel spin, credited to the wallet as
 * a BONUS ledger entry.
 */
async function spin(userId) {
  return withTransaction(async (client) => {
    await ensureRow(userId, client);

    const { rows } = await client.query(
      `SELECT spendable_points FROM user_points WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    const spendable = Number(rows[0].spendable_points);
    if (spendable < SPIN_COST_POINTS) {
      throw new ApiError(
        400,
        `You need ${SPIN_COST_POINTS} points to spin (you have ${spendable})`
      );
    }

    const segmentIndex = pickSegmentIndex();
    const reward = SPIN_SEGMENTS[segmentIndex].amount;

    await client.query(
      `UPDATE user_points
       SET spendable_points = spendable_points - $1, updated_at = now()
       WHERE user_id = $2`,
      [SPIN_COST_POINTS, userId]
    );

    const { rows: spinRows } = await client.query(
      `INSERT INTO spin_history (user_id, points_spent, reward_amount)
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, SPIN_COST_POINTS, reward]
    );
    const spinId = spinRows[0].id;

    // Reference ties this ledger entry to the specific spin row, so it
    // can never be credited twice even if something retried this call.
    await creditWithinTransaction(client, userId, reward, "BONUS", `spin:${spinId}`);

    return { reward, spinId, segmentIndex };
  });
}

module.exports = {
  getPoints,
  awardPoints,
  awardDepositPoints,
  spin,
  SPIN_COST_POINTS,
  SPIN_SEGMENTS,
};
