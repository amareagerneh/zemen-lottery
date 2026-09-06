// The Android phone/app that reads the admin's incoming CBE/Telebirr SMS
// notifications posts them to POST /api/bank-sms. It's a device, not a
// logged-in user, so it authenticates with this shared secret instead of a
// JWT — see middleware/bridgeAuth.js.
const BANK_SMS_API_KEY = process.env.BANK_SMS_API_KEY || "";

// Informational only (shown in the admin dashboard / README) — the phone
// number the bridge device's SIM card receives bank SMS on.
const BANK_SMS_PHONE_NUMBER = process.env.BANK_SMS_PHONE_NUMBER || "";

function isConfigured() {
  return Boolean(BANK_SMS_API_KEY);
}

module.exports = { BANK_SMS_API_KEY, BANK_SMS_PHONE_NUMBER, isConfigured };
