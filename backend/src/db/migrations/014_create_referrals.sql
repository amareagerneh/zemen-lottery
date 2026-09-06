CREATE TABLE IF NOT EXISTS referrals (
  id                             BIGSERIAL PRIMARY KEY,
  inviter_id                     BIGINT NOT NULL REFERENCES users(id),
  -- One signup can only ever be "the referral" for a single inviter.
  invitee_id                     BIGINT NOT NULL UNIQUE REFERENCES users(id),
  status                         VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                                    CHECK (status IN ('PENDING', 'REWARDED')),
  reward_amount                  BIGINT,
  points_awarded                 INT,
  triggering_deposit_request_id  BIGINT REFERENCES deposit_requests(id),
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  rewarded_at                    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id);
