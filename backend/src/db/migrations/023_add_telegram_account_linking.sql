-- Lets a user exist purely as a Telegram account (bot / Mini App), with
-- no phone/password at all — this app is now bot-first, so most users
-- will never go through the phone+password flow at all. That flow still
-- works (kept for admin access), so these columns are relaxed to
-- nullable rather than removed.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_id       BIGINT UNIQUE,
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(64);

ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
