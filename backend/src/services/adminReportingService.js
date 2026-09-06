const { pool } = require("../config/db");

async function getUserStats() {
  const { rows: totalRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM users`);
  const { rows: depositedRows } = await pool.query(
    `SELECT COUNT(DISTINCT user_id)::int AS with_deposit FROM deposit_requests WHERE status = 'APPROVED'`
  );
  const total = totalRows[0].total;
  const withDeposit = depositedRows[0].with_deposit;
  return {
    totalUsers: total,
    usersWithDeposit: withDeposit,
    usersWithoutDeposit: total - withDeposit,
  };
}

const HAVING_CLAUSES = {
  ALL: "TRUE",
  DEPOSITED: "COALESCE(SUM(dr.amount) FILTER (WHERE dr.status = 'APPROVED'), 0) > 0",
  NOT_DEPOSITED: "COALESCE(SUM(dr.amount) FILTER (WHERE dr.status = 'APPROVED'), 0) = 0",
};

/**
 * @param {'ALL'|'DEPOSITED'|'NOT_DEPOSITED'} filter
 */
async function listUsers(filter = "ALL") {
  const having = HAVING_CLAUSES[filter] || HAVING_CLAUSES.ALL;
  // `having` is one of three fixed, hardcoded strings above — never
  // interpolated from user input — so this is safe despite not being
  // parameterized.
  const { rows } = await pool.query(`
    SELECT u.id, u.name, u.phone, u.role, u.created_at, u.referral_code,
           COALESCE(SUM(dr.amount) FILTER (WHERE dr.status = 'APPROVED'), 0) AS total_deposited,
           COUNT(dr.id) FILTER (WHERE dr.status = 'APPROVED') AS deposit_count
    FROM users u
    LEFT JOIN deposit_requests dr ON dr.user_id = u.id
    GROUP BY u.id
    HAVING ${having}
    ORDER BY u.created_at DESC
    LIMIT 500
  `);
  return rows;
}

module.exports = { getUserStats, listUsers };
