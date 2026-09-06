const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = "zemen-lottery/deposit-screenshots";

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Uploads a screenshot buffer (from multer's memoryStorage) to Cloudinary
 * as an "authenticated" asset — NOT publicly reachable by its URL alone.
 * That matters because these are payment proofs; type: "authenticated"
 * means Cloudinary refuses to serve the image unless the URL is signed
 * (see getSignedUrl below), so a leaked/guessed URL doesn't leak the image.
 */
function uploadScreenshotBuffer(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        public_id: publicId,
        type: "authenticated",
        resource_type: "image",
        overwrite: false,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

/**
 * Builds a short-lived signed URL for an authenticated asset. Only ever
 * called from the admin-gated screenshot route — the signature itself is
 * what Cloudinary checks, not our JWT, so treat this URL as a bearer
 * credential and don't cache/log it beyond the single response.
 */
function getSignedUrl(publicId, expiresInSeconds = 120) {
  return cloudinary.url(`${FOLDER}/${publicId}`, {
    type: "authenticated",
    sign_url: true,
    secure: true,
    resource_type: "image",
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
}

module.exports = { uploadScreenshotBuffer, getSignedUrl, isConfigured };
