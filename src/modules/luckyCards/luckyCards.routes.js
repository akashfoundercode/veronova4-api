"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const { createController } = require("./luckyCards.controller");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/requireAdmin");

const router = express.Router();
const lucky12 = createController(12);
const lucky16 = createController(16);

router.post(API_ROUTES.lucky12.bet, authenticate, lucky12.bet);
router.get(API_ROUTES.lucky12.history, authenticate, lucky12.history);
router.get(API_ROUTES.lucky12.results, lucky12.results);
router.get(API_ROUTES.lucky12.latestLogs, lucky12.latestLogs);
router.get(API_ROUTES.lucky12.latestAmounts, lucky12.latestAmounts);
router.post(API_ROUTES.lucky12.adminPrediction, authenticate, requireAdmin, lucky12.addAdminResult);
router.get(API_ROUTES.lucky12.adminPanel, authenticate, requireAdmin, lucky12.adminPanel);
router.post(API_ROUTES.lucky12.adminResult, authenticate, requireAdmin, lucky12.addAdminResult);
router.get(API_ROUTES.lucky12.settle, lucky12.settle);

router.post(API_ROUTES.lucky16.bet, authenticate, lucky16.bet);
router.get(API_ROUTES.lucky16.history, authenticate, lucky16.history);
router.get(API_ROUTES.lucky16.results, lucky16.results);
router.get(API_ROUTES.lucky16.latestLogs, lucky16.latestLogs);
router.get(API_ROUTES.lucky16.latestAmounts, lucky16.latestAmounts);
router.post(API_ROUTES.lucky16.adminPrediction, authenticate, requireAdmin, lucky16.addAdminResult);
router.get(API_ROUTES.lucky16.adminPanel, authenticate, requireAdmin, lucky16.adminPanel);
router.post(API_ROUTES.lucky16.adminResult, authenticate, requireAdmin, lucky16.addAdminResult);
router.get(API_ROUTES.lucky16.settle, lucky16.settle);

module.exports = router;
