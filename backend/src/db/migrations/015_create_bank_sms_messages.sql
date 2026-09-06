-- Every SMS forwarded by the Android bridge phone is logged here, whether
-- or not it ended up matching a pending deposit — useful for debugging the
-- parser and for an audit trail of what triggered an auto-approval.
CREATE TABLE IF NOT EXISTS bank_sms_messages (
  id                       BIGSERIAL PRIMARY KEY,
  provider                 VARCHAR(10) CHECK (provider IN ('CBE', 'TELEBIRR', 'UNKNOWN')),
  raw_text                 TEXT NOT NULL,
  sender_phone             VARCHAR(30),
  parsed_amount            BIGINT,
  parsed_name              VARCHAR(120),
  parsed_ref               VARCHAR(64),
  matched_deposit_request_id BIGINT REFERENCES deposit_requests(id),
  status                   VARCHAR(10) NOT NULL DEFAULT 'UNMATCHED'
                              CHECK (status IN ('MATCHED', 'UNMATCHED', 'UNPARSEABLE')),
  received_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_sms_ref ON bank_sms_messages(parsed_ref);
CREATE INDEX IF NOT EXISTS idx_bank_sms_status ON bank_sms_messages(status);
