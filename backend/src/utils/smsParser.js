const AMOUNT_PATTERNS = [
  /received\s+ETB\s*\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /received\s+([\d,]+(?:\.\d{1,2})?)\s*ETB\b/i,
  /ETB\s*\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*ETB\b/i,
];

function parseAmount(text) {
  for (const pattern of AMOUNT_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const cleaned = m[1].replace(/,/g, "");
      const value = Math.round(parseFloat(cleaned));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
}

const CBE_REF_RE = /\bFT[0-9A-Z]{8,13}\b/i;
const TELEBIRR_REF_PATTERNS = [
  /transaction\s+number\s+(?:is\s+)?([A-Z0-9]{6,20})/i,
  /transaction\s*(?:no\.?|id)\s*[:\-]?\s*([A-Z0-9]{6,20})/i,
  /\bTB[0-9]{6,15}\b/i,
];

function parseCbeName(text) {
  const parenMatch = text.match(/from\s+account\s+[^\s(]+\s*\(([^)]+)\)/i);
  if (parenMatch) return parenMatch[1].trim();

  const plainMatch = text.match(/\bfrom\s+([A-Za-z.\s]{2,60}?)(?:\s+to\b|\s+your\b|[.,]|$)/i);
  if (plainMatch) return plainMatch[1].trim();

  return null;
}

function parseCbe(text) {
  const amount = parseAmount(text);
  // Handles "Ref no: FT24116CKXLS", "Reference: XYZ123", "Transaction ID:
  // ABC123XYZ", etc. The optional "no|number|id" word after the label
  // handles "Ref no:" style phrasing without accidentally capturing "no"
  // itself as the reference (hence the {5,20} minimum length below, which
  // also filters out short noise words).
  const refMatch = text.match(
    /(?:transaction\s*(?:id|number)?|reference|ref)\s*(?:no\.?|number|id)?[\s:#-]*([A-Z0-9-]{5,20})/i
  );
  const ref = refMatch ? refMatch[1].toUpperCase() : null;
  const name = parseCbeName(text);

  return { provider: "CBE", amount, ref, name };
}

function parseTelebirrName(text) {
  const withPhoneMatch = text.match(/\bfrom\s+([A-Za-z.\s]{2,60}?)\s*[(\d]/i);
  if (withPhoneMatch) return withPhoneMatch[1].trim();

  const toAccountMatch = text.match(/\bfrom\s+([A-Za-z0-9.\s]{2,60}?)\s+to\b/i);
  if (toAccountMatch) return toAccountMatch[1].trim();

  return null;
}

function parseTelebirr(text) {
  const amount = parseAmount(text);

  let ref = null;
  for (const pattern of TELEBIRR_REF_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      ref = (m[1] || m[0]).toUpperCase();
      break;
    }
  }

  const name = parseTelebirrName(text);

  return { provider: "TELEBIRR", amount, ref, name };
}

function detectProvider(text, senderHint) {
  const lower = text.toLowerCase();
  const senderLower = (senderHint || "").toLowerCase();

  if (senderLower.includes("telebirr")) return "TELEBIRR";
  if (senderLower.includes("cbe")) return "CBE";

  if (lower.includes("telebirr")) return "TELEBIRR";
  if (lower.includes("cbe") || lower.includes("commercial bank")) return "CBE";
  if (CBE_REF_RE.test(text)) return "CBE";
  return "TELEBIRR";
}

function parseBankSms(text, hintProvider, senderHint) {
  const provider =
    hintProvider && ["CBE", "TELEBIRR"].includes(hintProvider.toUpperCase())
      ? hintProvider.toUpperCase()
      : detectProvider(text, senderHint);

  return provider === "CBE" ? parseCbe(text) : parseTelebirr(text);
}

function namesLooselyMatch(a, b) {
  if (!a || !b) return false;
  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  const wordsA = new Set(norm(a));
  const wordsB = norm(b);
  return wordsB.some((w) => wordsA.has(w));
}

module.exports = { parseBankSms, parseAmount, namesLooselyMatch };