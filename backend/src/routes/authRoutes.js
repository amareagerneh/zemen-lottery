const express = require("express");
const { register, login, telegramLogin } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/telegram", telegramLogin);

module.exports = router;
