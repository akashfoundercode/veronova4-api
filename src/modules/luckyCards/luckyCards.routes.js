"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const { createController } = require("./luckyCards.controller");

const router = express.Router();
const lucky12 = createController(12);
const lucky16 = createController(16);

router.post(API_ROUTES.lucky12.bet, lucky12.bet);
router.get(API_ROUTES.lucky12.history, lucky12.history);
router.get(API_ROUTES.lucky12.results, lucky12.results);
router.get(API_ROUTES.lucky12.latestLogs, lucky12.latestLogs);
router.get(API_ROUTES.lucky12.latestAmounts, lucky12.latestAmounts);
router.post(API_ROUTES.lucky12.adminPrediction, lucky12.addAdminResult);
router.get(API_ROUTES.lucky12.adminPanel, lucky12.adminPanel);
router.post(API_ROUTES.lucky12.adminResult, lucky12.addAdminResult);
router.get(API_ROUTES.lucky12.settle, lucky12.settle);

router.post(API_ROUTES.lucky16.bet, lucky16.bet);
router.get(API_ROUTES.lucky16.history, lucky16.history);
router.get(API_ROUTES.lucky16.results, lucky16.results);
router.get(API_ROUTES.lucky16.latestLogs, lucky16.latestLogs);
router.get(API_ROUTES.lucky16.latestAmounts, lucky16.latestAmounts);
router.post(API_ROUTES.lucky16.adminPrediction, lucky16.addAdminResult);
router.get(API_ROUTES.lucky16.adminPanel, lucky16.adminPanel);
router.post(API_ROUTES.lucky16.adminResult, lucky16.addAdminResult);
router.get(API_ROUTES.lucky16.settle, lucky16.settle);

module.exports = router;
