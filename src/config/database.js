"use strict";

const mysql = require("mysql2/promise");
const config = require("./index");

let pool;

function getPool() {
  if (pool) {
    return pool;
  }

  const {
    host,
    name,
    user,
    connectionLimit,
    ...databaseConfig
  } = config.database;

  if (!host || !name || !user) {
    throw new Error(
      "Database configuration is incomplete; set DB_HOST, DB_DATABASE, and DB_USERNAME",
    );
  }

  if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
    throw new Error("DB_CONNECTION_LIMIT must be a positive integer");
  }

  pool = mysql.createPool({
    ...databaseConfig,
    host,
    database: name,
    user,
    connectionLimit,
    charset: "utf8mb4",
    waitForConnections: true,
    queueLimit: 0,
    decimalNumbers: true,
  });

  return pool;
}

module.exports = { getPool };
