CREATE TABLE IF NOT EXISTS games (
  id               BIGSERIAL PRIMARY KEY,
  name              VARCHAR(120) NOT NULL,
  ticket_price      BIGINT NOT NULL CHECK (ticket_price > 0),
  max_tickets       INT NOT NULL CHECK (max_tickets > 1),
  prize_amount      BIGINT NOT NULL CHECK (prize_amount > 0),
  status            VARCHAR(10) NOT NULL DEFAULT 'OPEN'
                      CHECK (status IN ('OPEN', 'FULL', 'DRAWING', 'COMPLETED', 'CANCELLED')),
  winner_ticket_id  BIGINT, -- FK added after tickets table exists
  created_by        BIGINT REFERENCES users(id),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
