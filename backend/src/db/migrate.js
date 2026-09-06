/**
 * Minimal migration runner. Applies every .sql file in ./migrations
 * that hasn't already been recorded in the `_migrations` table, in
 * filename order. Good enough for this project's scale; swap for
 * node-pg-migrate or similar if the schema grows a lot.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await pool.query("SELECT name FROM _migrations")).rows.map((r) => r.name)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    console.log(`Applying ${file}...`);
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`Failed applying ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log("Migrations up to date.");
  await pool.end();
}

run();
