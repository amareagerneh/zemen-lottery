CREATE TABLE IF NOT EXISTS wallets (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  -- Stored in cents/lowest-denomination-equivalent as integer to avoid float rounding.
  -- ETB has no subunit in practice here, so this stores whole ETB as BIGINT.
  balance    BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
