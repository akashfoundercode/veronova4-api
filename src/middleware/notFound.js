"use strict";

const AppError = require("../shared/errors/AppError");

function notFound(req, res, next) {
  next(new AppError(404, "ROUTE_NOT_FOUND", "Route not found"));
}

module.exports = notFound;
