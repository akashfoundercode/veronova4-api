"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./tripleChance.controller");

const router = express.Router();

router.post(API_ROUTES.tripleChance.bet, controller.bet);
router.get(API_ROUTES.tripleChance.history, controller.history);
router.get(API_ROUTES.tripleChance.results, controller.results);
router.get(API_ROUTES.tripleChance.settle, controller.settle);
router.get(API_ROUTES.tripleChance.winAmount, controller.winAmount);

module.exports = router;
