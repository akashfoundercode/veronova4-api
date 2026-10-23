"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./mine.controller");

const router = express.Router();

// Keep the Laravel client URLs so the mobile app can switch its API host to Node.
router.post(API_ROUTES.mine.bet, controller.bet);
router.post(API_ROUTES.mine.cashout, controller.cashout);
router.get(API_ROUTES.mine.result, controller.result);
router.post(API_ROUTES.mine.result, controller.result);
router.get(API_ROUTES.mine.multiplier, controller.multipliers);

module.exports = router;
