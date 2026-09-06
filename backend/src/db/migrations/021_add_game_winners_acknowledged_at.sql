-- Lets the frontend show a one-time "you won!" popup on login for each
-- prize, without re-showing it on every subsequent login.
ALTER TABLE game_winners
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
