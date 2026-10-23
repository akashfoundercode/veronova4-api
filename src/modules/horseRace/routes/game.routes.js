const express = require('express');
const router = express.Router();
const GameController = require('../controllers/game.controller');
const requireAuth = require('../middleware/auth.middleware');
const requireAdmin = requireAuth.requireAdmin;

const RaceController = require('../controllers/race.controller');
const { API_ROUTES } = require('../../../config/apiRoutes');
const routes = API_ROUTES.horseRace.game;

// Protected Routes (Require Authenticated User JWT)
router.post(routes.initialize, requireAuth, GameController.initialize);
router.get(routes.me, requireAuth, GameController.getMyGame);
router.get(routes.users, requireAdmin, GameController.getAllUsers);
router.get(routes.all, requireAdmin, GameController.getAllUsers);

// Game Results
router.get(routes.results, RaceController.getPreviousGameResults);
router.get(routes.previousResults, RaceController.getPreviousGameResults);

module.exports = router;
