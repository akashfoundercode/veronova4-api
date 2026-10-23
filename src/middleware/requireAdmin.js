"use strict";

function requireAdmin(req, res, next) {
  const user = req.user;
  if (
    Number(user?.id) !== 1 ||
    Number(user?.role_id) !== 1 ||
    Number(user?.verification) !== 2
  ) {
    return res.status(403).json({
      status: 403,
      message: "Administrator access is required.",
    });
  }
  return next();
}

module.exports = requireAdmin;
