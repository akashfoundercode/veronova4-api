"use strict";

const express = require("express");
const controller = require("./aviator.controller");
const { API_ROUTES } = require("../../config/apiRoutes");

const router = express.Router();

router.post(API_ROUTES.aviator.bet, controller.bet);
router.get(API_ROUTES.aviator.betNew, controller.betNew);
router.post(API_ROUTES.aviator.cashout, controller.cashout);
router.post(API_ROUTES.aviator.history, controller.history);
router.get(API_ROUTES.aviator.lastFiveResult, controller.lastFiveResult);
router.get(API_ROUTES.aviator.betCancel, controller.betCancel);
router.get(API_ROUTES.aviator.telemetry, controller.telemetry);
router.get(API_ROUTES.aviator.drops, controller.drops);
router.get("/aviator_telemetry", controller.telemetry);
router.get("/aviator_drop_history", controller.drops);
router.get("/aviator/overview", controller.telemetry);

module.exports = router;
