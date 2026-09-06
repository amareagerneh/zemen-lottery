const autoVerificationService = require("../services/autoVerificationService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const ingestBankMessage = asyncHandler(async (req, res) => {
  const { method, message } = req.body;
  if (!["CBE", "TELEBIRR"].includes(method)) {
    throw new ApiError(400, "Method must be CBE or TELEBIRR");
  }
  if (!message || typeof message !== "string" || message.trim().length < 5) {
    throw new ApiError(400, "message is required");
  }

  const result = await autoVerificationService.ingestBankMessage(method, message.trim());
  res.status(201).json(result);
});

module.exports = { ingestBankMessage };
