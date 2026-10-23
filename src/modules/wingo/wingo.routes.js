"use strict";

const express = require("express");
const controller = require("./wingo.controller");
const authenticate = require("../../middleware/authenticate");
const { API_ROUTES } = require("../../config/apiRoutes");

const router = express.Router();

router.get(API_ROUTES.wingo.gameSerialNo, controller.gameSerialNo);
router.get(API_ROUTES.wingo.fetchAdminSetResults, controller.fetchAdminSetResults);
router.get(API_ROUTES.wingo.winAmount, authenticate.optional, controller.winAmount);
router.get(API_ROUTES.wingo.results, controller.results);
router.get(API_ROUTES.wingo.lastFiveResult, controller.lastFiveResults);
router.get(API_ROUTES.wingo.lastResult, controller.lastResult);
router.get(API_ROUTES.wingo.getResults, controller.getResults);
router.get(API_ROUTES.wingo.cron, controller.cron);
router.get(API_ROUTES.wingo.cronNews, controller.cron);
router.post(API_ROUTES.wingo.autoResultInsert, controller.autoWingoResultInsert);
router.get(API_ROUTES.wingo.fetchHistory, controller.fetchHistory);
router.get(API_ROUTES.wingo.fetchHistoryByGame, controller.fetchHistory);
router.get("/fetch/:gameid", controller.fetchData);
router.get("/fetch", controller.fetchData);
router.post("/colour_prediction-store", controller.colourPredictionStore);
router.post("/colour_prediction_store", controller.colourPredictionStore);

module.exports = router;
