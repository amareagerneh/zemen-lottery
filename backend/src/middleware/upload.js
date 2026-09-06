const multer = require("multer");

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, or WEBP images are allowed"));
  }
  cb(null, true);
}

// memoryStorage: file lands in req.file.buffer, never touches disk.
// Deliberate — Render's free-tier filesystem is ephemeral and gets wiped
// on every redeploy/restart, so anything written to disk here would
// eventually vanish. The buffer goes straight to Cloudinary instead.
const uploadDepositScreenshot = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = { uploadDepositScreenshot };
