"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const authRoutes = require("./routes/auth.routes");
const gameRoutes = require("./routes/game.routes");
const raceRoutes = require("./routes/race.routes");
const walletRoutes = require("./routes/wallet.routes");
const horsesRoutes = require("./routes/horse.routes");
const betRoutes = require("./routes/bet.routes");
const adminRoutes = require("./routes/admin.routes");
const requireAuth = require("./middleware/auth.middleware");
const authController = require("./controllers/auth.controller");

const router = express.Router();
const { horseRace: horseRoutes } = API_ROUTES;
const prefix = horseRoutes.prefix;

router.use(`${prefix}${horseRoutes.auth.base}`, authRoutes);
router.post(`${prefix}${horseRoutes.logout}`, requireAuth, authController.logout);
router.get(`${prefix}${horseRoutes.logout}`, requireAuth, authController.logout);
router.use(`${prefix}${horseRoutes.game.base}`, gameRoutes);
router.use(`${prefix}${horseRoutes.game.pluralBase}`, gameRoutes);
router.use(`${prefix}${horseRoutes.race.legacyBase}`, raceRoutes);
router.use(`${prefix}${horseRoutes.race.base}`, raceRoutes);
router.use(`${prefix}${horseRoutes.wallet.base}`, walletRoutes);
router.use(`${prefix}${horseRoutes.wallet.pluralBase}`, walletRoutes);
router.use(`${prefix}${horseRoutes.horse.singularBase}`, horsesRoutes);
router.use(`${prefix}${horseRoutes.horse.base}`, horsesRoutes);
router.use(`${prefix}${horseRoutes.bet.singularBase}`, betRoutes);
router.use(`${prefix}${horseRoutes.bet.base}`, betRoutes);
router.use(`${prefix}${horseRoutes.admin.base}`, adminRoutes);

module.exports = router;
