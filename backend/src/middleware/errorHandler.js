const ApiError = require("../utils/ApiError");
const multer = require("multer");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "Screenshot must be under 5MB" : err.message;
    return res.status(400).json({ error: message });
  }
  // fileFilter in upload.js throws a plain Error for disallowed file types.
  if (err.message && err.message.includes("Only JPG, PNG, or WEBP")) {
    return res.status(400).json({ error: err.message });
  }

  // Postgres unique_violation (e.g. duplicate phone, duplicate wallet_transactions reference)
  if (err.code === "23505") {
    return res.status(409).json({ error: "Duplicate request or resource already exists" });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

module.exports = errorHandler;
