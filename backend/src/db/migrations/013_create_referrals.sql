ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by BIGINT REFERENCES users(id);

CREATE TABLE IF NOT EXISTS referrals (
  id             BIGSERIAL PRIMARY KEY,
  inviter_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- One row per invitee — a user can only ever have been referred once.
  invitee_id     BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status         VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
  reward_amount  BIGINT,
  reward_points  INT,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id);

-- Referral payouts show up in the inviter's wallet ledger as their own type.
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('DEPOSIT', 'TICKET', 'PRIZE', 'WITHDRAWAL', 'REFUND', 'BONUS', 'REFERRAL'));
