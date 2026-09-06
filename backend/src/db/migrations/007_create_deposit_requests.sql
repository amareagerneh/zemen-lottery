CREATE TABLE IF NOT EXISTS deposit_requests (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  amount          BIGINT NOT NULL CHECK (amount > 0),
  method          VARCHAR(10) NOT NULL CHECK (method IN ('CBE', 'TELEBIRR')),
  screenshot_path TEXT NOT NULL,
  status          VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_note      TEXT,
  reviewed_by     BIGINT REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
