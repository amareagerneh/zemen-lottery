ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS fee_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount BIGINT;

UPDATE withdrawal_requests SET net_amount = amount - fee_amount WHERE net_amount IS NULL;

ALTER TABLE withdrawal_requests ALTER COLUMN net_amount SET NOT NULL;
