"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./plinko.controller");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

// These paths match routes/api.php in the supplied Laravel project.
router.post(API_ROUTES.plinko.bet, authenticate, controller.bet);
router.post(API_ROUTES.plinko.betNew, authenticate, controller.betNew);
router.get(API_ROUTES.plinko.indexList, controller.indexList);
router.post(API_ROUTES.plinko.indexList, controller.indexList);
router.get(API_ROUTES.plinko.result, authenticate, controller.result);
router.post(API_ROUTES.plinko.result, authenticate, controller.result);
router.post(API_ROUTES.plinko.multiplier, authenticate, controller.multiplier);

module.exports = router;
