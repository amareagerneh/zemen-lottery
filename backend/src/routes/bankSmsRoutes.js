const express = require("express");
const requireBridgeKey = require("../middleware/bridgeAuth");
const { receiveSms } = require("../controllers/bankSmsController");

const router = express.Router();

// Not JWT-gated — see middleware/bridgeAuth.js. This is a rare public
// endpoint by design, protected by a long shared secret header instead.
router.post("/", requireBridgeKey, receiveSms);

module.exports = router;
