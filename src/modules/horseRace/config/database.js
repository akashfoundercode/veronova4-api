"use strict";

const mysql = require("mysql2/promise");
const config = require("../../../config");

let pool;

function isHorseDatabaseConfigured(
  databaseConfig = config.database,
  horseRaceConfig = config.horseRace,
) {
  const { host, user, connectionLimit, name } = databaseConfig;
  const horseDatabase = horseRaceConfig.database;

  return Boolean(
    host &&
      user &&
      horseDatabase &&
      horseDatabase !== name &&
      Number.isInteger(connectionLimit) &&
      connectionLimit > 0,
  );
}

function getHorsePool() {
  if (pool) return pool;

  const { host, user, password, port, connectionLimit } = config.database;
  const database = config.horseRace.database;
  if (!isHorseDatabaseConfigured()) {
    const error = new Error(
      "Horse-race database configuration is incomplete or not isolated; set DB_HOST, DB_USERNAME, and a HORSE_DB_DATABASE different from DB_DATABASE",
    );
    error.code = "HORSE_RACE_DATABASE_CONFIGURATION_ERROR";
    throw error;
  }

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    connectionLimit,
    charset: "utf8mb4",
    waitForConnections: true,
    queueLimit: 0,
    decimalNumbers: true,
  });
  return pool;
}

const poolProxy = new Proxy(
  {},
  {
    get(_target, property) {
      const databasePool = getHorsePool();
      const value = databasePool[property];
      return typeof value === "function" ? value.bind(databasePool) : value;
    },
  },
);

module.exports = { pool: poolProxy, getHorsePool, isHorseDatabaseConfigured };
