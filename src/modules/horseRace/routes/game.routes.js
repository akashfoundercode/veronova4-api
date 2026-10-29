const express = require('express');
const router = express.Router();
const GameController = require('../controllers/game.controller');
const requireAuth = require('../middleware/auth.middleware');
const { optionalAuth, requireAdmin } = require('../middleware/auth.middleware');

const RaceController = require('../controllers/race.controller');
const { API_ROUTES } = require('../../../config/apiRoutes');
const routes = API_ROUTES.horseRace.game;

// Protected & Guest Routes (Supports Authenticated User JWT / Bearer & Guest)
router.post(routes.initialize, optionalAuth, GameController.initialize);
router.get(routes.initialize, optionalAuth, GameController.initialize);
router.get(routes.me, optionalAuth, GameController.getMyGame);
router.get(routes.users, requireAdmin, GameController.getAllUsers);
router.get(routes.all, requireAdmin, GameController.getAllUsers);

// Game Results
router.get(routes.results, RaceController.getPreviousGameResults);
router.get(routes.previousResults, RaceController.getPreviousGameResults);

module.exports = router;
