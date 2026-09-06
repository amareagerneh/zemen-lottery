-- Users now enter the transaction reference/ID from their bank or Telebirr
-- receipt when submitting a deposit. That's the field the SMS bridge
-- matches against, so it must be unique per method to stop the same real
-- transaction being submitted (and auto-approved) more than once.
ALTER TABLE deposit_requests
  ADD COLUMN IF NOT EXISTS transaction_ref TEXT,
  ADD COLUMN IF NOT EXISTS sender_name     VARCHAR(120),
  ADD COLUMN IF NOT EXISTS auto_verified   BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_deposit_requests_method_ref
  ON deposit_requests (method, lower(transaction_ref))
  WHERE transaction_ref IS NOT NULL;
