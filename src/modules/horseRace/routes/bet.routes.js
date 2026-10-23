const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const { optionalAuth } = require('../middleware/auth.middleware');
const {
    placeBet,
    cancelBet,
    getMyCurrentBets,
    getMyBetHistory,
    getLiveBetLedger,
    getLiveRaceBetPool,
} = require('../controllers/bet.controller');

const router = express.Router();
const { API_ROUTES } = require('../../../config/apiRoutes');
const routes = API_ROUTES.horseRace.bet;

// Live Horse Bet Pool / Breakdown per horse (Frontend chip counters & Admin)
router.get(routes.pool, optionalAuth, getLiveRaceBetPool);
router.get(routes.livePool, optionalAuth, getLiveRaceBetPool);
router.get(routes.breakdown, optionalAuth, getLiveRaceBetPool);

// Public / Semi-public live ledger stream endpoints
router.get(routes.liveLedger, getLiveBetLedger);
router.get(routes.live, getLiveBetLedger);

// GET Bets endpoints (Graceful fallback if guest / not logged in)
router.get(API_ROUTES.horseRace.root, optionalAuth, (req, res, next) => {
    if (!req.user) {
        return res.json({
            success: true,
            total: 0,
            bets: [],
            totalBetAmount: 0,
            summary: { totalInvested: 0, totalWon: 0, netProfitLoss: 0, displayNet: '₹0.00' },
            history: [],
        });
    }
    return getMyBetHistory(req, res, next);
});

router.get(routes.current, optionalAuth, (req, res, next) => {
    if (!req.user) {
        return res.json({
            success: true,
            raceActive: false,
            totalBetAmount: 0,
            bets: [],
        });
    }
    return getMyCurrentBets(req, res, next);
});

router.get(routes.history, optionalAuth, (req, res, next) => {
    if (!req.user) {
        return res.json({
            success: true,
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
            hasMore: false,
            summary: { totalInvested: 0, totalWon: 0, netProfitLoss: 0, displayNet: '₹0.00' },
            history: [],
        });
    }
    return getMyBetHistory(req, res, next);
});

// Protected bet placement (Requires Authentication)
router.post(API_ROUTES.horseRace.root, requireAuth, placeBet);
router.post(routes.place, requireAuth, placeBet);

// Bet Cancellation, Removal & Minus (-) during BETTING phase (Instant Wallet Refund)
router.post(routes.cancel, requireAuth, cancelBet);
router.post(routes.remove, requireAuth, cancelBet);
router.post(routes.minus, requireAuth, cancelBet);
router.post(routes.undo, requireAuth, cancelBet);
router.post(routes.clear, requireAuth, cancelBet);
router.delete(routes.cancel, requireAuth, cancelBet);
router.delete(routes.remove, requireAuth, cancelBet);
router.delete(routes.id, requireAuth, (req, res, next) => {
    req.params.betId = req.params.id;
    return cancelBet(req, res, next);
});
router.delete(API_ROUTES.horseRace.root, requireAuth, cancelBet);

module.exports = router;
