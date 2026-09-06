CREATE TABLE IF NOT EXISTS spin_history (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  points_spent  INT NOT NULL,
  reward_amount BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spin_history_user ON spin_history(user_id);
