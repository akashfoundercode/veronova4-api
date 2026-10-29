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
  const raceController = require("./controllers/race.controller");

  const router = express.Router();
  const { horseRace: horseRoutes } = API_ROUTES;
  const prefix = horseRoutes.prefix;

  function mountSubRoutes(base = "") {
    router.use(`${base}${horseRoutes.auth.base}`, authRoutes);
    router.post(`${base}${horseRoutes.logout}`, requireAuth, authController.logout);
    router.get(`${base}${horseRoutes.logout}`, requireAuth, authController.logout);
    router.use(`${base}${horseRoutes.game.base}`, gameRoutes);
    router.use(`${base}${horseRoutes.game.pluralBase}`, gameRoutes);
    router.use(`${base}${horseRoutes.race.legacyBase}`, raceRoutes);
    router.use(`${base}${horseRoutes.race.base}`, raceRoutes);
    router.use(`${base}${horseRoutes.wallet.base}`, walletRoutes);
    router.use(`${base}${horseRoutes.wallet.pluralBase}`, walletRoutes);
    router.use(`${base}${horseRoutes.horse.singularBase}`, horsesRoutes);
    router.use(`${base}${horseRoutes.horse.base}`, horsesRoutes);
    router.use(`${base}${horseRoutes.bet.singularBase}`, betRoutes);
    router.use(`${base}${horseRoutes.bet.base}`, betRoutes);
    router.use(`${base}${horseRoutes.admin.base}`, adminRoutes);

    // Direct game/race level aliases
    router.get(`${base}/current`, raceController.getCurrentRace);
    router.get(`${base}/current-race`, raceController.getCurrentRace);
    router.get(`${base}/results`, raceController.getPreviousGameResults);
    router.get(`${base}/previous-results`, raceController.getPreviousGameResults);
    router.get(`${base}/history`, raceController.getAllMatchesResults);

    // Direct race_horses & race endpoint aliases
    router.get(`${base}/race_horses`, raceController.getRaceHorses);
    router.get(`${base}/race-horses`, raceController.getRaceHorses);
    router.get(`${base}/race_horses/:id`, raceController.getRaceHorses);
    router.get(`${base}/race-horses/:id`, raceController.getRaceHorses);
    router.get(`${base}/races/horses`, raceController.getRaceHorses);
    router.get(`${base}/races/result`, raceController.getRaceResult);
    router.get(`${base}/race/horses`, raceController.getRaceHorses);
    router.get(`${base}/race/result`, raceController.getRaceResult);
  }

  // 1. Mount with prefix "/horse-race" (e.g. /api/horse-race/races/current and /horse-race/races/current)
  mountSubRoutes(prefix);

  // 2. Mount direct aliases without prefix (e.g. /races/current, /race/current, /game/initialize, /horses, etc.)
  mountSubRoutes("");

  module.exports = router;
