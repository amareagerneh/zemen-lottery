const ApiError = require("../utils/ApiError");

// Must run after requireAuth.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new ApiError(403, "Admin access required"));
  }
  next();
}

module.exports = requireAdmin;
