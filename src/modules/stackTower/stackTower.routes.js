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

// 6. User Stats (Modes breakdown, bets count & tower built stats for Frontend)
router.get("/stack_tower_user_stats", authenticate.optional, controller.userStats);
router.post("/stack_tower_user_stats", authenticate.optional, controller.userStats);
router.get("/stack-tower-user-stats", authenticate.optional, controller.userStats);
router.post("/stack-tower-user-stats", authenticate.optional, controller.userStats);
router.get("/stack-tower/user-stats", authenticate.optional, controller.userStats);
router.post("/stack-tower/user-stats", authenticate.optional, controller.userStats);
router.get("/stack_tower/user-stats", authenticate.optional, controller.userStats);
router.get("/user-stats", authenticate.optional, controller.userStats);
router.get("/user_stats", authenticate.optional, controller.userStats);
router.get("/stats", authenticate.optional, controller.userStats);
router.post("/stats", authenticate.optional, controller.userStats);

// 7. Admin Panel Stats (Aggregated mode breakdown, turnover, house profit & top builders)
router.get("/admin/stats", authenticate.optional, controller.adminStats);
router.post("/admin/stats", authenticate.optional, controller.adminStats);
router.get("/admin/stack-tower/stats", authenticate.optional, controller.adminStats);
router.post("/admin/stack-tower/stats", authenticate.optional, controller.adminStats);
router.get("/admin/stack_tower_stats", authenticate.optional, controller.adminStats);
router.post("/admin/stack_tower_stats", authenticate.optional, controller.adminStats);
router.get("/stack-tower/admin/stats", authenticate.optional, controller.adminStats);
router.post("/stack-tower/admin/stats", authenticate.optional, controller.adminStats);
router.get("/stack_tower_admin_stats", authenticate.optional, controller.adminStats);
router.post("/stack_tower_admin_stats", authenticate.optional, controller.adminStats);

// 8. Admin Force Obstacle Drop (Drop obstacle on active round to topple tower and cause loss)
router.post("/admin/drop-obstacle", authenticate.optional, controller.dropObstacle);
router.post("/admin/drop_obstacle", authenticate.optional, controller.dropObstacle);
router.post("/admin/stack-tower/drop-obstacle", authenticate.optional, controller.dropObstacle);
router.post("/stack-tower/admin/drop-obstacle", authenticate.optional, controller.dropObstacle);
router.post("/stack_tower_drop_obstacle", authenticate.optional, controller.dropObstacle);
router.post("/stack-tower-drop-obstacle", authenticate.optional, controller.dropObstacle);
router.post("/drop-obstacle", authenticate.optional, controller.dropObstacle);
router.post("/drop_obstacle", authenticate.optional, controller.dropObstacle);

// 9. Round Status Check (Real-time check for obstacle drops / status)
router.get("/stack_tower_round_status", authenticate.optional, controller.roundStatus);
router.get("/stack-tower/round-status", authenticate.optional, controller.roundStatus);
router.get("/round-status", authenticate.optional, controller.roundStatus);
router.get("/round_status", authenticate.optional, controller.roundStatus);
router.post("/stack-tower/round-status", authenticate.optional, controller.roundStatus);
router.post("/round-status", authenticate.optional, controller.roundStatus);

module.exports = router;

