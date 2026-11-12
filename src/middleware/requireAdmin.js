"use strict";

function requireAdmin(req, res, next) {
  const user = req.user;
  const isSuperAdmin =
    Number(user?.id) === 1 &&
    (user?.role_id === undefined || Number(user.role_id) === 1) &&
    (user?.verification === undefined || Number(user.verification) === 2);

  if (!isSuperAdmin) {
    return res.status(403).json({
      status: 403,
      message: "Administrator access is required.",
    });
  }
  return next();
}

module.exports = requireAdmin;
