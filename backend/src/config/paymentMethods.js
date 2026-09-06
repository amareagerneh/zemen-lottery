// Placeholder receiving accounts shown to users during deposit.
// Replace these with your real CBE and Telebirr accounts before going live —
// override via env vars so you don't have to touch code to update them.
module.exports = {
  cbe: {
    bankName: "Commercial Bank of Ethiopia",
    accountName: process.env.CBE_ACCOUNT_NAME || "Zemen Lottery PLC",
    accountNumber: process.env.CBE_ACCOUNT_NUMBER || "1000123456789",
  },
  telebirr: {
    accountName: process.env.TELEBIRR_ACCOUNT_NAME || "Zemen Lottery PLC",
    phoneNumber: process.env.TELEBIRR_PHONE_NUMBER || "0912345678",
  },
};
