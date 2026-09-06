ALTER TABLE bank_sms_messages
  ADD COLUMN IF NOT EXISTS match_strategy VARCHAR(20);
