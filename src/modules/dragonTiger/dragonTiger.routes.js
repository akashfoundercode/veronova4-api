"use strict";

const express = require("express");
const authenticate = require("../../middleware/authenticate");
const controller = require("./dragonTiger.controller");

const router = express.Router();

// User Game Routes
router.post("/dragon/bet", authenticate, controller.placeBet);
router.post("/dragon_bet", authenticate, controller.placeBet);
router.post("/dragon-tiger/bet", authenticate, controller.placeBet);

router.get("/dragon/results", controller.getResults);
router.get("/dragon_results", controller.getResults);
router.get("/dragon-tiger/results", controller.getResults);

router.get("/dragon/current-round", controller.getCurrentRound);
router.get("/dragon/status", controller.getCurrentRound);
router.get("/dragon-tiger/current-round", controller.getCurrentRound);

router.get("/dragon/bet-history", authenticate, controller.betHistory);
router.post("/dragon/bet-history", authenticate, controller.betHistory);

// Admin Control & Live Monitoring Routes
router.post("/admin/dragon/control", controller.adminControl);
router.post("/admin/dragon-tiger/control", controller.adminControl);
router.post("/api/admin/dragon/control", controller.adminControl);
router.post("/api/admin/dragon-tiger/control", controller.adminControl);
router.get("/admin/dragon/control", controller.adminControl);
router.get("/api/admin/dragon/control", controller.adminControl);

router.get("/admin/dragon/bets", controller.adminLiveBets);
router.get("/admin/dragon-tiger/bets", controller.adminLiveBets);

module.exports = router;
