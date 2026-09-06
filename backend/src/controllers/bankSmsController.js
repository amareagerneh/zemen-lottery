const bankSmsService = require("../services/bankSmsService");
const asyncHandler = require("../utils/asyncHandler");

const receiveSms = asyncHandler(async (req, res) => {
  const { text, sender, provider } = req.body;

  // 🔍 Log the incoming payload
  console.log("📩 [Controller] Received SMS:", { text, sender, provider });

  const result = await bankSmsService.ingest({ text, sender, provider });

  // 🔍 Log the result returned by the service
  console.log("✅ [Controller] Service result:", result);

  res.status(201).json(result);
});

module.exports = { receiveSms };