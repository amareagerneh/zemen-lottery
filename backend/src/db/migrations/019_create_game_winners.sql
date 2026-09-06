CREATE TABLE IF NOT EXISTS game_winners (
  id           BIGSERIAL PRIMARY KEY,
  game_id      BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rank         INT NOT NULL,
  ticket_id    BIGINT NOT NULL REFERENCES tickets(id),
  user_id      BIGINT NOT NULL REFERENCES users(id),
  prize_amount BIGINT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A game can only have one winner per rank, and a ticket can only win once.
  UNIQUE (game_id, rank),
  UNIQUE (game_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_game_winners_game ON game_winners(game_id);
