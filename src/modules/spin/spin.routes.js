"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./spin.controller");

const router = express.Router();

router.get(API_ROUTES.spin.settle, controller.settle);
router.post(API_ROUTES.spin.bet, controller.bet);
router.get(API_ROUTES.spin.history, controller.history);
router.get(API_ROUTES.spin.results, controller.results);
router.post(API_ROUTES.spin.addAdminResult, controller.addAdminResult);
router.get(API_ROUTES.spin.latestLogs, controller.latestLogs);
router.get(API_ROUTES.spin.latestAmounts, controller.latestAmounts);

module.exports = router;
