-- referralService.js credits referral payouts with type 'REFERRAL', but
-- migration 015 only widened the CHECK constraint to allow
-- 'REFERRAL_BONUS' (a different string) and dropped 'REFERRAL' in the
-- process. Every referral payout was therefore failing the CHECK
-- constraint and rolling back the ENTIRE enclosing transaction — which
-- includes the invited user's deposit approval, since
-- checkAndRewardReferral() runs inside it.
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('DEPOSIT', 'TICKET', 'PRIZE', 'WITHDRAWAL', 'REFUND', 'BONUS', 'REFERRAL_BONUS', 'REFERRAL'));
