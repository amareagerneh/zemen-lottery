ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by BIGINT REFERENCES users(id);

-- New users get a code at registration time (see authController.js).
-- Backfill existing users who predate this feature.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM users WHERE referral_code IS NULL LOOP
    UPDATE users
    SET referral_code = upper(substr(md5(random()::text || r.id::text || clock_timestamp()::text), 1, 8))
    WHERE id = r.id;
  END LOOP;
END $$;
