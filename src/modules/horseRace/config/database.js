"use strict";

const { getPool } = require("../../../config/database");
const config = require("../../../config");

// Horse-race data lives alongside the rest of the application data in DB_DATABASE.
// Keep the compatibility exports because socket.service and existing callers use them.
function isHorseDatabaseConfigured(databaseConfig = config.database) {
  return Boolean(
    databaseConfig.host &&
      databaseConfig.name &&
      databaseConfig.user &&
      Number.isInteger(databaseConfig.connectionLimit) &&
      databaseConfig.connectionLimit > 0,
  );
}

function getHorsePool() {
  return getPool();
}

module.exports = { pool: new Proxy({}, {
  get(_target, property) {
    if (property in _target) return _target[property];
    const sharedPool = getHorsePool();
    const value = sharedPool[property];
    return typeof value === "function" ? value.bind(sharedPool) : value;
  },
  set(_target, property, value) {
    _target[property] = value;
    return true;
  },
}), getHorsePool, isHorseDatabaseConfigured };
