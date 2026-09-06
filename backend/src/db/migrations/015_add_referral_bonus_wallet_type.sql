ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('DEPOSIT', 'TICKET', 'PRIZE', 'WITHDRAWAL', 'REFUND', 'BONUS', 'REFERRAL_BONUS'));
