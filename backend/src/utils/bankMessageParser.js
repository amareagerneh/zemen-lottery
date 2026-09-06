// Best-effort regex extraction for CBE and Telebirr transaction messages.
//
// IMPORTANT: these patterns are written to match commonly-seen formats but
// have NOT been validated against a live corpus of real messages. Before
// relying on auto-verification in production, feed a handful of real CBE
// and Telebirr SMS texts through `parseBankMessage` and adjust the regexes
// below to match — wording/formatting varies by bank and can change without
// notice.

const AMOUNT_PATTERNS = [
  /(?:ETB|Birr)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr)/i,
];

const TRANSACTION_ID_PATTERNS = [
  /(?:Transaction\s*(?:No|ID|Number)|Ref(?:erence)?(?:\s*No)?|TxID)[:\s]+([A-Z0-9]{6,})/i,
  /\b(FT[A-Z0-9]{8,})\b/i, // common CBE transaction-number prefix
];

const NAME_PATTERNS = [/from\s+([A-Za-z][A-Za-z .]{2,40}?)(?:[.,\n]|\s+on\s|\s+Ref)/i];

function extractFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function parseAmount(text) {
  const raw = extractFirst(text, AMOUNT_PATTERNS);
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "");
  const value = Math.round(parseFloat(cleaned));
  return Number.isFinite(value) ? value : null;
}

/**
 * @param {string} text - raw SMS body or OCR'd screenshot text
 * @returns {{ transactionId: string|null, amount: number|null, name: string|null }}
 */
function parseBankMessage(text) {
  if (!text) return { transactionId: null, amount: null, name: null };
  return {
    transactionId: extractFirst(text, TRANSACTION_ID_PATTERNS)?.toUpperCase() || null,
    amount: parseAmount(text),
    name: extractFirst(text, NAME_PATTERNS),
  };
}

module.exports = { parseBankMessage };
