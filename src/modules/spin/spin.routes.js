"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./spin.controller");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/requireAdmin");

const router = express.Router();

router.get(API_ROUTES.spin.settle, controller.settle);
router.post(API_ROUTES.spin.bet, authenticate, controller.bet);
router.get(API_ROUTES.spin.history, authenticate, controller.history);
router.get(API_ROUTES.spin.results, controller.results);
router.post(API_ROUTES.spin.addAdminResult, authenticate, requireAdmin, controller.addAdminResult);
router.get(API_ROUTES.spin.latestLogs, controller.latestLogs);
router.get(API_ROUTES.spin.latestAmounts, controller.latestAmounts);

module.exports = router;
