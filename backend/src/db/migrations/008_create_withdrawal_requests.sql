CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id),
  amount            BIGINT NOT NULL CHECK (amount > 0),
  -- Snapshot of the payout destination at request time, so a later profile
  -- edit can't change where an already-submitted withdrawal gets sent.
  method            VARCHAR(10) NOT NULL CHECK (method IN ('BANK', 'TELEBIRR')),
  account_snapshot  JSONB NOT NULL,
  status            VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED')),
  admin_note        TEXT,
  reviewed_by       BIGINT REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
