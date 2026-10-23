"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./keno.controller");

const router = express.Router();

router.post(API_ROUTES.keno.bet, controller.placeBet);
router.get(API_ROUTES.keno.cron, controller.settleRound);
router.post(API_ROUTES.keno.result, controller.results);
router.post(API_ROUTES.keno.betHistory, controller.betHistory);
router.post(API_ROUTES.keno.multiplier, controller.multipliers);
router.post(API_ROUTES.keno.winAmount, controller.winAmount);

module.exports = router;
