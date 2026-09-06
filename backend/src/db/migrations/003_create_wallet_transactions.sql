CREATE TABLE IF NOT EXISTS wallet_transactions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(12) NOT NULL CHECK (type IN ('DEPOSIT', 'TICKET', 'PRIZE', 'WITHDRAWAL', 'REFUND')),
  -- Signed amount: deposits/prizes/refunds positive, tickets/withdrawals negative.
  amount     BIGINT NOT NULL,
  -- External idempotency key (payment provider tx id, or internal game/ticket id).
  -- Unique per type so retried webhooks can't double-credit a deposit,
  -- and so a ticket purchase can't be double-charged.
  reference  VARCHAR(120) NOT NULL,
  status     VARCHAR(10) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_type_reference
  ON wallet_transactions(type, reference);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id);
