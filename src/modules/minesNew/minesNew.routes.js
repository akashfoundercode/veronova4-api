"use strict";

const express = require("express");
const authenticate = require("../../middleware/authenticate");
const controller = require("./minesNew.controller");

const router = express.Router();

// 1. Core Gameplay APIs
router.post("/game/start", authenticate, controller.start);
router.post("/game/reveal", authenticate, controller.reveal);
router.post("/game/cashout", authenticate, controller.cashout);
router.get("/game/active", authenticate, controller.active);

// 2. Wallet APIs (Auth login already mounted via auth.routes.js at /api/auth/login)
router.get("/wallet/balance", authenticate, controller.walletBalance);
router.post("/wallet/add-funds", authenticate, controller.addFunds);

// 3. Leaderboard & History APIs
router.get("/leaderboard", controller.leaderboard);
router.get("/game/history", authenticate, controller.history);

module.exports = router;
