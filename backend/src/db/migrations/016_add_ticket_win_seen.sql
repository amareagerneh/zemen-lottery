-- Lets the frontend show a one-time "Congratulations, you won!" popup the
-- next time a winner logs in, without re-showing it on every subsequent
-- visit.
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS win_seen BOOLEAN NOT NULL DEFAULT false;
