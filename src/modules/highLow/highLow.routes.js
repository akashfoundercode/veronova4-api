"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./highLow.controller");

const router = express.Router();

router.post(API_ROUTES.highLow.bet, controller.bet);
router.get(API_ROUTES.highLow.results, controller.results);
router.get(API_ROUTES.highLow.winAmount, controller.winAmount);
router.get(API_ROUTES.highLow.history, controller.history);
router.get(API_ROUTES.highLow.settle, controller.settle);

module.exports = router;
