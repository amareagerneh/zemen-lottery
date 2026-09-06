ALTER TABLE deposit_requests
  ADD COLUMN IF NOT EXISTS ocr_transaction_id VARCHAR(60),
  ADD COLUMN IF NOT EXISTS ocr_amount BIGINT,
  ADD COLUMN IF NOT EXISTS declared_reference VARCHAR(60),
  ADD COLUMN IF NOT EXISTS verification_source VARCHAR(10) NOT NULL DEFAULT 'MANUAL'
    CHECK (verification_source IN ('MANUAL', 'AUTO'));

CREATE INDEX IF NOT EXISTS idx_deposit_requests_ocr_txn ON deposit_requests(ocr_transaction_id);
