"use strict";

const express = require("express");
const controller = require("./wingo.controller");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/requireAdmin");
const { API_ROUTES } = require("../../config/apiRoutes");

const router = express.Router();

router.get(API_ROUTES.wingo.gameSerialNo, controller.gameSerialNo);
router.get(API_ROUTES.wingo.bets, authenticate, requireAdmin, controller.liveBets);
router.get(API_ROUTES.wingo.betHistory, authenticate, requireAdmin, controller.adminBetHistory);
router.get(API_ROUTES.admin.wingoLive, authenticate, requireAdmin, controller.livePools);
router.get(API_ROUTES.admin.wingoLiveGame, authenticate, requireAdmin, controller.livePools);
router.get(API_ROUTES.wingo.fetchAdminSetResults, authenticate, requireAdmin, controller.fetchAdminSetResults);
router.get(API_ROUTES.wingo.winAmount, authenticate.optional, controller.winAmount);
router.get(API_ROUTES.wingo.results, controller.results);
router.get(API_ROUTES.wingo.lastFiveResult, controller.lastFiveResults);
router.get(API_ROUTES.wingo.lastResult, controller.lastResult);
router.get(API_ROUTES.wingo.getResults, controller.getResults);
router.get(API_ROUTES.wingo.providerResult, controller.getResults);
router.get(API_ROUTES.wingo.cron, controller.cron);
router.get(API_ROUTES.wingo.cronNews, controller.cron);
router.get("/cron_news/:game_id", controller.cron);
router.get("/cron_news/:game_id/", controller.cron);
router.get("/crone/:game_id", controller.cron);
router.get("/crone/:game_id/", controller.cron);
router.get("/cron/:game_id", controller.cron);
router.get("/cron/:game_id/", controller.cron);
router.post(API_ROUTES.wingo.autoResultInsert, authenticate, requireAdmin, controller.autoWingoResultInsert);
router.get(API_ROUTES.wingo.fetchHistory, controller.fetchHistory);
router.get(API_ROUTES.wingo.fetchHistoryByGame, controller.fetchHistory);
router.get("/fetch/:gameid", controller.fetchData);
router.get("/fetch", controller.fetchData);
router.post("/colour_prediction-store", authenticate, requireAdmin, controller.colourPredictionStore);
router.post("/colour_prediction_store", authenticate, requireAdmin, controller.colourPredictionStore);

module.exports = router;
