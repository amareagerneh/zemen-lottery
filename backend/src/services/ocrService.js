const Tesseract = require("tesseract.js");

/**
 * Runs OCR on an image buffer and returns raw extracted text.
 *
 * Accuracy caveat: this reads a phone-screenshot of a payment confirmation
 * screen — varying fonts, resolutions, and dark/light themes across CBE's
 * and Telebirr's own apps mean OCR quality will be inconsistent. Treat this
 * as a best-effort signal, not a guarantee. When it fails to find a usable
 * transaction ID, the deposit correctly falls back to manual admin review
 * rather than blocking or guessing.
 *
 * First call in a process downloads Tesseract's English language data
 * (~4MB) if not already cached — expect the very first OCR after a cold
 * start to be slower than subsequent ones.
 */
async function extractTextFromImage(buffer) {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng");
    return text || "";
  } catch (err) {
    console.warn("OCR failed, falling back to manual review:", err.message);
    return "";
  }
}

module.exports = { extractTextFromImage };
