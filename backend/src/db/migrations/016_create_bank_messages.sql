CREATE TABLE IF NOT EXISTS bank_messages (
  id                        BIGSERIAL PRIMARY KEY,
  method                    VARCHAR(10) NOT NULL CHECK (method IN ('CBE', 'TELEBIRR')),
  raw_message               TEXT NOT NULL,
  extracted_transaction_id  VARCHAR(60),
  extracted_amount          BIGINT,
  extracted_name            TEXT,
  matched_deposit_request_id BIGINT REFERENCES deposit_requests(id),
  received_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_messages_txn ON bank_messages(extracted_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_messages_unmatched ON bank_messages(matched_deposit_request_id)
  WHERE matched_deposit_request_id IS NULL;
