"use strict";
//hello
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config();

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const databasePort = Number.parseInt(process.env.DB_PORT ?? "3306", 10);
const appUrl = (process.env.APP_URL ?? `http://127.0.0.1:${port}`).replace(/\/$/, "");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
  throw new Error("DB_PORT must be an integer between 1 and 65535");
}

module.exports = Object.freeze({
  port,
  database: Object.freeze({
    host: process.env.DB_HOST,
    port: databasePort,
    name: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD ?? "",
    connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT ?? "10", 10),
  }),
  horseRace: Object.freeze({
    jwtSecret: process.env.HORSE_JWT_SECRET ?? process.env.JWT_SECRET ?? "veronova_default_jwt_secret",
  }),
  resultsApiUrl:
    process.env.RESULTS_API_URL ??
    "https://root.usawin.vip/api/trx/results_by_periodno",
  wingoResultApiUrl:
    process.env.WINGO_RESULT_API_URL ??
    process.env.RESULTS_API_URL ??
    "https://root.usawin.vip/api/trx/results_by_periodno",
  aviator: Object.freeze({
    resultApiUrl:
      process.env.AVIATOR_RESULT_API_URL ??
      "https://root.veronova.co.in/Aviator/",
  }),
  wingo: Object.freeze({
    timerApiUrl:
      process.env.WINGO_TIMER_API_URL ??
      `http://127.0.0.1:${port}/api/cron_news/`,
  }),
  trx: Object.freeze({
    resultFeedUrl:
      process.env.TRX_RESULT_FEED_URL ??
      "https://vitalityherbal.life/api/v1/trx-auto-genrated-result",
    blockHashUrl:
      process.env.TRX_BLOCK_HASH_URL ??
      "https://api.gamebridge.co.in/seller/v1/get-block-hash",
    managerKey: process.env.TRX_MANAGER_KEY,
  }),
  appUrl,
  corsOrigins: (process.env.CORS_ORIGINS ?? process.env.APP_URL ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
});
