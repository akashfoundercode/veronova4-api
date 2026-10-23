"use strict";

function getPublicError(error) {
  if (
    error.message ===
    "Database configuration is incomplete; set DB_HOST, DB_DATABASE, and DB_USERNAME"
  ) {
    return {
      statusCode: 500,
      code: "DATABASE_CONFIGURATION_ERROR",
      message:
        "Database is not configured. Copy .env.example to .env, set DB_HOST, DB_DATABASE, DB_USERNAME, and DB_PASSWORD, then restart the API.",
    };
  }

  const databaseErrors = {
    HORSE_RACE_DATABASE_CONFIGURATION_ERROR:
      "Set HORSE_DB_DATABASE to a schema different from DB_DATABASE and verify the MySQL connection settings.",
    HORSE_RACE_JWT_CONFIGURATION_ERROR:
      "Set HORSE_JWT_SECRET or JWT_SECRET before using horse-race authentication.",
    ECONNREFUSED: "Database connection refused. Check DB_HOST and DB_PORT in .env.",
    ENOTFOUND: "Database host was not found. Check DB_HOST in .env.",
    ER_ACCESS_DENIED_ERROR:
      "Database rejected the configured user. Check DB_USERNAME and DB_PASSWORD in .env.",
    ER_BAD_DB_ERROR:
      "Database was not found. Check DB_DATABASE in .env.",
    ER_NO_SUCH_TABLE:
      "A required table is missing from the selected database. Check DB_DATABASE and the supplied SQL dump.",
    ER_BAD_FIELD_ERROR:
      "A database field does not match the expected SQL dump schema. Verify the selected database without renaming its fields.",
  };

  if (databaseErrors[error.code]) {
    return {
      statusCode: 500,
      code: "DATABASE_CONFIGURATION_ERROR",
      message: databaseErrors[error.code],
    };
  }

  if (typeof error.code === "string" && error.code.startsWith("ER_")) {
    return {
      statusCode: 500,
      code: "DATABASE_OPERATION_FAILED",
      message: `Database operation failed (${error.code}). Verify the existing database schema and connection settings.`,
    };
  }

  const statusCode =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  return {
    statusCode,
    code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : error.code,
    message:
      statusCode === 500 ? "An unexpected error occurred" : error.message,
  };
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const publicError = getPublicError(error);
  if (publicError.statusCode === 500) {
    console.error(error);
  }

  return res.status(publicError.statusCode).json({
    error: { code: publicError.code, message: publicError.message },
  });
}

errorHandler.getPublicError = getPublicError;

module.exports = errorHandler;
