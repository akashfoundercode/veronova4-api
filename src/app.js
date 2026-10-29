"use strict";

const express = require("express");
const path = require("node:path");
const config = require("./config");
const { API_PREFIX, API_ROUTES, API_V1_PREFIX } = require("./config/apiRoutes");
const apiRoutes = require("./routes");
const adminRoutes = require("./modules/admin/admin.routes");
const authRoutes = require("./modules/auth/auth.routes");
const wingoRoutes = require("./modules/wingo/wingo.routes");
const aviatorRoutes = require("./modules/aviator/aviator.routes");
const trxRoutes = require("./modules/trx/trx.routes");
const gameRoutes = require("./modules/games/game.routes");
const mineRoutes = require("./modules/mine/mine.routes");
const plinkoRoutes = require("./modules/plinko/plinko.routes");
const kenoRoutes = require("./modules/keno/keno.routes");
const spinRoutes = require("./modules/spin/spin.routes");
const luckyCardRoutes = require("./modules/luckyCards/luckyCards.routes");
const tripleChanceRoutes = require("./modules/tripleChance/tripleChance.routes");
const highLowRoutes = require("./modules/highLow/highLow.routes");
const chickenRoutes = require("./modules/chicken/chicken.routes");
const funTargetRoutes = require("./modules/funTarget/funTarget.routes");
const blockchainLotteryRoutes = require("./modules/blockchainLottery/blockchainLottery.routes");
const teenPattiRoutes = require("./modules/teenPatti/teenPatti.routes");
const titliRoutes = require("./modules/titli/titli.routes");
const miniRouletteRoutes = require("./modules/miniRoulette/miniRoulette.routes");
const jackpotRoutes = require("./modules/jackpot/jackpot.routes");
const balloonRoutes = require("./modules/balloon/balloon.routes");
const jiliRoutes = require("./modules/jili/jili.routes");
const horseRaceRoutes = require("./modules/horseRace/horseRace.routes");
const customerServiceRoutes = require("./modules/customerService/customerService.routes");
const paymentRoutes = require("./modules/payment/payment.routes");
const authenticate = require("./middleware/authenticate");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const clean = origin.replace(/\/$/, "");
  if (config.corsOrigins.includes("*") || config.corsOrigins.includes(clean)) {
    return true;
  }
  // Allow all localhost and 127.0.0.1 development origins (any port)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(clean)) {
    return true;
  }
  // Allow project domains & subdomains
  if (/^https?:\/\/([a-z0-9-]+\.)*(wingo4all\.site|veronova\.co\.in|usawin\.vip)(:\d+)?$/i.test(clean)) {
    return true;
  }
  return false;
}

app.disable("x-powered-by");
app.use((req, res, next) => {
  const requestOrigin = req.get("origin");
  const allowedOrigin = requestOrigin && isAllowedOrigin(requestOrigin) ? requestOrigin : "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  if (allowedOrigin !== "*") {
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  const requestedHeaders = req.get("access-control-request-headers");
  const defaultHeaders =
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, token, token_id, app_id, user-id, userid, user_id, id, device-type, platform";
  res.setHeader(
    "Access-Control-Allow-Headers",
    requestedHeaders ? `${requestedHeaders}, ${defaultHeaders}` : defaultHeaders,
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use("/public/api", chickenRoutes);
app.use("/public", chickenRoutes);
app.use(
  API_ROUTES.horseRace.uploads,
  express.static(path.join(process.cwd(), "uploads", "horses")),
);
app.use(API_PREFIX, authRoutes);
app.use(authRoutes);
app.use(API_PREFIX, adminRoutes);
app.use(adminRoutes);
app.use(API_PREFIX, gameRoutes);
app.use(gameRoutes);
app.use(API_PREFIX, wingoRoutes);
app.use(wingoRoutes);
app.use(API_PREFIX, aviatorRoutes);
app.use("/Aviator", aviatorRoutes);
app.use("/aviator", aviatorRoutes);
app.use(aviatorRoutes);
app.use(API_PREFIX, trxRoutes);
app.use(API_PREFIX, mineRoutes);
app.use(API_PREFIX, plinkoRoutes);
app.use(API_PREFIX, kenoRoutes);
app.use(API_PREFIX, spinRoutes);
app.use(API_PREFIX, luckyCardRoutes);
app.use(API_PREFIX, tripleChanceRoutes);
app.use(API_PREFIX, highLowRoutes);
app.use(API_PREFIX, chickenRoutes);
app.use("/public/api", chickenRoutes);
app.use("/public", chickenRoutes);
app.use(chickenRoutes);
app.use(API_PREFIX, funTargetRoutes);
app.use(API_PREFIX, blockchainLotteryRoutes);
app.use(API_PREFIX, teenPattiRoutes);
app.use(API_PREFIX, titliRoutes);
app.use(API_PREFIX, miniRouletteRoutes);
app.use(API_PREFIX, jackpotRoutes);
app.use(API_PREFIX, balloonRoutes);
app.use(API_PREFIX, jiliRoutes);
app.use(
  "/uploads/customer_service",
  authenticate,
  express.static(path.join(process.cwd(), "uploads", "customer_service")),
);
app.use(API_PREFIX, customerServiceRoutes);
app.use(customerServiceRoutes);
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads")),
);
app.use(API_PREFIX, paymentRoutes);
app.use(paymentRoutes);
app.use(API_PREFIX, horseRaceRoutes);
app.use(horseRaceRoutes);
app.use(API_V1_PREFIX, apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
