const express = require('express');
const router = express.Router();
const RaceController = require('../controllers/race.controller');

const requireAuth = require('../middleware/auth.middleware');
const { optionalAuth } = require('../middleware/auth.middleware');
const { placeBet, cancelBet, getMyCurrentBets, getLiveRaceBetPool } = require('../controllers/bet.controller');
const { API_ROUTES } = require('../../../config/apiRoutes');
const routes = API_ROUTES.horseRace.race;

// Read-only Global Race Endpoints (Accessible by all users & devices)
router.get(routes.current, RaceController.getCurrentRace);
router.get(routes.currentPool, optionalAuth, getLiveRaceBetPool);
router.get(routes.pool, optionalAuth, getLiveRaceBetPool);
router.get(routes.livePool, optionalAuth, getLiveRaceBetPool);

// Finish / Result Screen Summary (Tailored for Logged In & Guest users)
router.get(routes.resultScreen, optionalAuth, RaceController.getFinishScreenResult);
router.get(routes.currentResult, optionalAuth, RaceController.getFinishScreenResult);

// Authenticated Betting & Minus Endpoints on Current Race
router.post(routes.bet, requireAuth, placeBet);
router.post(routes.betCancel, requireAuth, cancelBet);
router.post(routes.betMinus, requireAuth, cancelBet);
router.post(routes.cancel, requireAuth, cancelBet);
router.post(routes.minus, requireAuth, cancelBet);
router.delete(routes.bet, requireAuth, cancelBet);
router.delete(routes.cancel, requireAuth, cancelBet);
router.get(routes.myBets, requireAuth, getMyCurrentBets);

// Previous Game Results (Compact: Jackpot, Winner Horse Name & Serial Number)
router.get(routes.previousResults, RaceController.getPreviousGameResults);
router.get(routes.results, RaceController.getPreviousGameResults);
router.get(routes.previousGames, RaceController.getPreviousGameResults);

// All Matches Results / History (Winners, Serial Numbers, Full Horse Ranking)
router.get(routes.matchesResults, RaceController.getAllMatchesResults);
router.get(routes.history, RaceController.getAllMatchesResults);

// Parameterized Race Endpoints
router.get(routes.idResultScreen, optionalAuth, RaceController.getFinishScreenResult);
router.get(routes.idResult, RaceController.getRaceResult);
router.get(routes.idHorses, RaceController.getRaceHorses);
router.get(routes.id, RaceController.getRaceById);
router.get(API_ROUTES.horseRace.root, RaceController.getRaces);

module.exports = router;
