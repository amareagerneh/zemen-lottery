// Invite-a-friend program. Override via env vars.
const REFERRAL_BONUS_AMOUNT = Number(process.env.REFERRAL_BONUS_AMOUNT || 10); // ETB paid to inviter
const REFERRAL_BONUS_POINTS = Number(process.env.REFERRAL_BONUS_POINTS || 5); // points paid to inviter
const REFERRAL_MIN_DEPOSIT = Number(process.env.REFERRAL_MIN_DEPOSIT || 100); // qualifying deposit, ETB

module.exports = { REFERRAL_BONUS_AMOUNT, REFERRAL_BONUS_POINTS, REFERRAL_MIN_DEPOSIT };
