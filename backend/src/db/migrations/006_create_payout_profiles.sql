CREATE TABLE IF NOT EXISTS payout_profiles (
  user_id             BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_holder_name VARCHAR(120) NOT NULL,
  bank_name           VARCHAR(80),
  bank_account_number VARCHAR(40),
  telebirr_phone      VARCHAR(20),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payout_has_a_method CHECK (
    bank_account_number IS NOT NULL OR telebirr_phone IS NOT NULL
  )
);
