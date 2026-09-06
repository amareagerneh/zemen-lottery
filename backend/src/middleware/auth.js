const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Attach only what's needed; never trust anything else from the token.
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

module.exports = requireAuth;
