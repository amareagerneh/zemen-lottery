// Configurable via env so you can tune the business rules without a
// code change/redeploy of logic, just an env var update + restart.
const WITHDRAWAL_FEE_PERCENT = Number(process.env.WITHDRAWAL_FEE_PERCENT || 10);
const MIN_WITHDRAWAL_AMOUNT = Number(process.env.MIN_WITHDRAWAL_AMOUNT || 100);

function calculateWithdrawalFee(amount) {
  const fee = Math.round((amount * WITHDRAWAL_FEE_PERCENT) / 100);
  return { fee, net: amount - fee };
}

module.exports = { WITHDRAWAL_FEE_PERCENT, MIN_WITHDRAWAL_AMOUNT, calculateWithdrawalFee };
