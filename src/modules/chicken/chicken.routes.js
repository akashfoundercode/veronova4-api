"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./chicken.controller");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

// User REST APIs
router.post(API_ROUTES.chicken.bet, authenticate.optional, controller.bet);
router.get(API_ROUTES.chicken.values, controller.values);
router.get(API_ROUTES.chicken.history, authenticate.optional, controller.history);
router.post(API_ROUTES.chicken.cashout, authenticate.optional, controller.cashout);
router.get(API_ROUTES.chicken.multiplier, authenticate.optional, controller.multiplier);
router.get(API_ROUTES.chicken.rules, controller.rules);

// Admin Actions
router.get("/admin/multiplier", controller.adminMultiplierList);
router.post("/updateRoastMultiplier", controller.updateRoastMultiplier);
router.post("/add_multiplier", controller.addMultiplier);
router.post("/multiplier_update", controller.updateMultiplier);
router.post("/multiplier_delete", controller.deleteMultiplier);
router.delete("/multiplier_delete", controller.deleteMultiplier);
router.post("/updateGameRules", controller.updateGameRules);
router.post("/updateBetValues", controller.updateBetValues);

module.exports = router;
