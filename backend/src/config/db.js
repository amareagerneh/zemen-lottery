const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

// Load .env here directly rather than relying on server.js having done it
// first — this file can also be required by src/db/migrate.js, and we want
// a clear error either way, not a silent "vars are undefined" failure.
const envPath = path.resolve(__dirname, "../../.env");
require("dotenv").config({ path: envPath });

/**
 * Build pg connection config.
 *
 * Prefers discrete PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT vars when
 * present, because a DATABASE_URL connection string breaks silently if the
 * password contains characters like @ : / # ? that aren't percent-encoded
 * (very common with default Postgres passwords on Windows/pgAdmin). When
 * that happens, pg ends up with an undefined/non-string password and fails
 * with the cryptic "SASL: ... password must be a string" error instead of
 * a clear "wrong password" error.
 *
 * Falls back to DATABASE_URL if the discrete vars aren't set.
 */
function buildConfig() {
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, PGSSLMODE, DATABASE_URL } = process.env;

  // Supabase (and most managed Postgres) require SSL. Default to requiring
  // it unless explicitly disabled — set PGSSLMODE=disable for a plain
  // local Postgres install that doesn't have SSL configured.
  const ssl = PGSSLMODE === "disable" ? false : { rejectUnauthorized: false };

  if (PGHOST && PGUSER && PGDATABASE) {
    if (typeof PGPASSWORD !== "string") {
      throw new Error(
        "PGPASSWORD is not set (or not a string) in your .env file. " +
          "Set PGPASSWORD=your_actual_password, even if it's empty (PGPASSWORD=)."
      );
    }
    return {
      host: PGHOST,
      port: PGPORT ? Number(PGPORT) : 5432,
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      ssl,
    };
  }

  if (!DATABASE_URL) {
    const envExists = fs.existsSync(envPath);
    throw new Error(
      `No database config found. Looked for .env at: ${envPath}\n` +
        (envExists
          ? "That file exists, but none of PGHOST/PGUSER/PGDATABASE or DATABASE_URL are set inside it. Check for typos in the variable names."
          : "That file does NOT exist. Copy backend/.env.example to backend/.env (same folder), then fill in your Postgres credentials.")
    );
  }

  return { connectionString: DATABASE_URL, ssl };
}

const pool = new Pool({
  ...buildConfig(),
  // Keep pool modest for a raffle app's write-heavy, short transactions.
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  // Unexpected errors on idle clients (e.g. connection dropped by DB).
  console.error("Unexpected PG pool error", err);
  process.exit(1);
});

/**
 * Run a callback inside a single DB transaction.
 * Handles BEGIN/COMMIT/ROLLBACK and always releases the client.
 * This is the ONLY way wallet/ticket mutations should touch the DB —
 * it guarantees row locks (FOR UPDATE) taken inside `fn` are released
 * atomically with the write they protect.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTransaction };
