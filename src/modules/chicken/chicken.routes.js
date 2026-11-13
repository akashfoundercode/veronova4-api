"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./chicken.controller");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/requireAdmin");

const router = express.Router();

// User REST APIs
router.post(API_ROUTES.chicken.bet, authenticate.optional, controller.bet);
router.get(API_ROUTES.chicken.values, controller.values);
router.get(API_ROUTES.chicken.history, authenticate.optional, controller.history);
router.post(API_ROUTES.chicken.history, authenticate.optional, controller.history);
router.post(API_ROUTES.chicken.cashout, authenticate.optional, controller.cashout);
router.get(API_ROUTES.chicken.multiplier, authenticate.optional, controller.multiplier);
router.get(API_ROUTES.chicken.rules, controller.rules);

// Admin Actions
router.get("/admin/multiplier", authenticate, requireAdmin, controller.adminMultiplierList);
router.post("/updateRoastMultiplier", authenticate, requireAdmin, controller.updateRoastMultiplier);
router.post("/add_multiplier", authenticate, requireAdmin, controller.addMultiplier);
router.post("/multiplier_update", authenticate, requireAdmin, controller.updateMultiplier);
router.post("/multiplier_delete", authenticate, requireAdmin, controller.deleteMultiplier);
router.delete("/multiplier_delete", authenticate, requireAdmin, controller.deleteMultiplier);
router.post("/updateGameRules", authenticate, requireAdmin, controller.updateGameRules);
router.post("/updateBetValues", authenticate, requireAdmin, controller.updateBetValues);

// Admin & Legacy Bet History APIs
router.get(API_ROUTES.chicken.bet, authenticate.optional, controller.adminHistory);
router.get("/betHistory", authenticate.optional, controller.history);
router.post("/betHistory", authenticate.optional, controller.history);
router.get("/bet_history", authenticate.optional, controller.history);
router.post("/bet_history", authenticate.optional, controller.history);
router.get("/bet-history", authenticate.optional, controller.history);
router.post("/bet-history", authenticate.optional, controller.history);
router.get("/admin/chicken/history", authenticate.optional, controller.adminHistory);
router.post("/admin/chicken/history", authenticate.optional, controller.adminHistory);
router.get("/admin/chicken/bets", authenticate.optional, controller.adminHistory);
router.post("/admin/chicken/bets", authenticate.optional, controller.adminHistory);
router.get("/admin/chicken-bets", authenticate.optional, controller.adminHistory);
router.post("/admin/chicken-bets", authenticate.optional, controller.adminHistory);
router.get("/admin/chicken", authenticate.optional, controller.adminHistory);
router.post("/admin/chicken", authenticate.optional, controller.adminHistory);
router.get("/chicken/history", authenticate.optional, controller.history);
router.post("/chicken/history", authenticate.optional, controller.history);
router.get("/chicken/bets", authenticate.optional, controller.history);
router.post("/chicken/bets", authenticate.optional, controller.history);
router.get("/chicken/bet_history", authenticate.optional, controller.history);
router.post("/chicken/bet_history", authenticate.optional, controller.history);
router.get("/chicken/betHistory", authenticate.optional, controller.history);
router.post("/chicken/betHistory", authenticate.optional, controller.history);
router.get("/chicken_bets", authenticate.optional, controller.adminHistory);
router.post("/chicken_bets", authenticate.optional, controller.adminHistory);
router.get("/chicken_bets_history", authenticate.optional, controller.adminHistory);
router.post("/chicken_bets_history", authenticate.optional, controller.adminHistory);

// User All Details / Activity History
router.get("/user-all-details/:id", authenticate.optional, controller.userAllDetails);
router.post("/user-all-details/:id", authenticate.optional, controller.userAllDetails);
router.get("/all_details/:id", authenticate.optional, controller.userAllDetails);
router.post("/all_details/:id", authenticate.optional, controller.userAllDetails);
router.get("/all_bet_history/:id", authenticate.optional, controller.userAllDetails);
router.post("/all_bet_history/:id", authenticate.optional, controller.userAllDetails);

module.exports = router;
