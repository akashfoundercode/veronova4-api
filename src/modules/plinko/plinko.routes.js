"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./plinko.controller");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

// ---------------------------------------------------------------------------
// Legacy Plinko routes (matching Laravel routes/api.php)
// ---------------------------------------------------------------------------
router.post(API_ROUTES.plinko.bet, authenticate, controller.bet);
router.post(API_ROUTES.plinko.betNew, authenticate, controller.betNew);
router.get(API_ROUTES.plinko.indexList, controller.indexList);
router.post(API_ROUTES.plinko.indexList, controller.indexList);
router.get(API_ROUTES.plinko.result, authenticate, controller.result);
router.post(API_ROUTES.plinko.result, authenticate, controller.result);
router.post(API_ROUTES.plinko.multiplier, authenticate, controller.multiplier);

// ---------------------------------------------------------------------------
// Plinko Arcade Player routes (supports both /api/plinko/... and /plinko/...)
// ---------------------------------------------------------------------------

// Config (Public multipliers, chips, min/max bet)
router.get(["/plinko/config", "/api/plinko/config"], controller.getConfig);

// 1. Game Session Handshake: POST /api/plinko/session/init
router.post([API_ROUTES.plinko.sessionInit, `/api${API_ROUTES.plinko.sessionInit}`], authenticate, controller.sessionInit);

// 2. Place Bet / Drop Ball: POST /api/plinko/bet/drop
router.post([API_ROUTES.plinko.betDrop, `/api${API_ROUTES.plinko.betDrop}`], authenticate, controller.betDrop);

// 3. Settle Bet (Outcome): POST /api/plinko/bet/settle
router.post([API_ROUTES.plinko.betSettle, `/api${API_ROUTES.plinko.betSettle}`], authenticate, controller.betSettle);

// 4. My Bet History: GET /api/plinko/bets/my-history
router.get([API_ROUTES.plinko.myHistory, `/api${API_ROUTES.plinko.myHistory}`], authenticate, controller.myHistory);
router.post([API_ROUTES.plinko.myHistory, `/api${API_ROUTES.plinko.myHistory}`], authenticate, controller.myHistory);

// 5. Live Bets Stream: GET /api/plinko/bets/live
router.get([API_ROUTES.plinko.liveBets, `/api${API_ROUTES.plinko.liveBets}`], controller.liveBets);

// 6. Cashout / Ascend: POST /api/plinko/game/action
router.post([API_ROUTES.plinko.gameAction, `/api${API_ROUTES.plinko.gameAction}`], authenticate, controller.gameAction);

// ---------------------------------------------------------------------------
// Plinko Admin Management routes
// ---------------------------------------------------------------------------
router.get(["/admin/plinko/settings", "/api/admin/plinko/settings", "/admin/plinko_settings"], authenticate.optional, controller.adminGetSettings);
router.post(["/admin/plinko/settings", "/api/admin/plinko/settings", "/admin/plinko_settings"], authenticate.optional, controller.adminUpdateSettings);
router.post(["/admin/plinko/control", "/api/admin/plinko/control", "/admin/plinko_control"], authenticate.optional, controller.adminSetControl);
router.get(["/admin/plinko/bets", "/api/admin/plinko/bets", "/admin/plinko_bets", "/admin/plinko/history"], authenticate.optional, controller.adminGetBets);
router.get(["/admin/plinko/dashboard", "/api/admin/plinko/dashboard", "/admin/plinko_dashboard"], authenticate.optional, controller.adminGetDashboard);

module.exports = router;
