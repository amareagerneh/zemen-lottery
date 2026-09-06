CREATE TABLE IF NOT EXISTS tickets (
  id             BIGSERIAL PRIMARY KEY,
  game_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id        BIGINT NOT NULL REFERENCES users(id),
  ticket_number  INT NOT NULL,
  price          BIGINT NOT NULL,
  status         VARCHAR(10) NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'CANCELLED')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_tickets_game ON tickets(game_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);

ALTER TABLE games
  ADD CONSTRAINT fk_games_winner_ticket
  FOREIGN KEY (winner_ticket_id) REFERENCES tickets(id);
