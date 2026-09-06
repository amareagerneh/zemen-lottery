CREATE TABLE IF NOT EXISTS user_points (
  user_id          BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- Never decreases — used to compute the user's level.
  lifetime_points  INT NOT NULL DEFAULT 0,
  -- Decreases when spent on a spin — used to gate the 50-point spin.
  spendable_points INT NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
