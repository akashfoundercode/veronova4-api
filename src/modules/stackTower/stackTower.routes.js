"use strict";

const express = require("express");
const controller = require("./stackTower.controller");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

// 1. Place Bet / Start Game
router.post("/stack_tower_bet", authenticate.optional, controller.bet);
router.post("/stack-tower-bet", authenticate.optional, controller.bet);
router.post("/stack-tower/bet", authenticate.optional, controller.bet);
router.post("/stack_tower/bet", authenticate.optional, controller.bet);
router.post("/bet", authenticate.optional, controller.bet);

// 2. Cash Out
router.post("/stack_tower_cashout", authenticate.optional, controller.cashout);
router.post("/stack-tower-cashout", authenticate.optional, controller.cashout);
router.post("/stack-tower/cashout", authenticate.optional, controller.cashout);
router.post("/stack_tower/cashout", authenticate.optional, controller.cashout);
router.post("/cashout", authenticate.optional, controller.cashout);

// 3. Game Over / Miss
router.post("/stack_tower_game_over", authenticate.optional, controller.gameOver);
router.post("/stack-tower-game-over", authenticate.optional, controller.gameOver);
router.post("/stack-tower/game-over", authenticate.optional, controller.gameOver);
router.post("/stack_tower/game-over", authenticate.optional, controller.gameOver);
router.post("/game-over", authenticate.optional, controller.gameOver);
router.post("/game_over", authenticate.optional, controller.gameOver);

// 4. Bet History (Accepts both GET and POST)
router.get("/stack_tower_history", authenticate.optional, controller.history);
router.post("/stack_tower_history", authenticate.optional, controller.history);
router.get("/stack-tower-history", authenticate.optional, controller.history);
router.post("/stack-tower-history", authenticate.optional, controller.history);
router.get("/stack-tower/history", authenticate.optional, controller.history);
router.post("/stack-tower/history", authenticate.optional, controller.history);
router.get("/stack_tower/history", authenticate.optional, controller.history);
router.post("/stack_tower/history", authenticate.optional, controller.history);
router.get("/history", authenticate.optional, controller.history);
router.post("/history", authenticate.optional, controller.history);

// 5. Game Config
router.get("/stack_tower_config", controller.config);
router.get("/stack-tower-config", controller.config);
router.get("/stack-tower/config", controller.config);
router.get("/stack_tower/config", controller.config);
router.get("/config", controller.config);

module.exports = router;

