CREATE TABLE IF NOT EXISTS game_prize_tiers (
  id           BIGSERIAL PRIMARY KEY,
  game_id      BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rank         INT NOT NULL,
  prize_amount BIGINT NOT NULL CHECK (prize_amount > 0),
  UNIQUE (game_id, rank)
);
