"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./plinko.controller");

const router = express.Router();

// These paths match routes/api.php in the supplied Laravel project.
router.post(API_ROUTES.plinko.bet, controller.bet);
router.post(API_ROUTES.plinko.betNew, controller.betNew);
router.get(API_ROUTES.plinko.indexList, controller.indexList);
router.post(API_ROUTES.plinko.indexList, controller.indexList);
router.get(API_ROUTES.plinko.result, controller.result);
router.post(API_ROUTES.plinko.result, controller.result);
router.post(API_ROUTES.plinko.multiplier, controller.multiplier);

module.exports = router;
