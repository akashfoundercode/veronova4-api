const express = require('express');
const router = express.Router();
const AdminControllerModule = require('../controllers/admin.controller');
const AdminController = AdminControllerModule.AdminController || AdminControllerModule.default || AdminControllerModule;
const requireAuth = require('../middleware/auth.middleware');
const AdminAuthController = require('../controllers/adminAuth.controller');
const requireAdmin = requireAuth.requireAdmin;

const { getLiveRaceBetPool } = require('../controllers/bet.controller');
const { API_ROUTES } = require('../../../config/apiRoutes');
const routes = API_ROUTES.horseRace.admin;

function registerRoute(method, path, ...handlers) {
    const invalidHandlerIndex = handlers.findIndex((handler) => typeof handler !== 'function');
    if (invalidHandlerIndex !== -1) {
        throw new TypeError(`Invalid handler for admin route ${method.toUpperCase()} /api/admin${path} (handler ${invalidHandlerIndex + 1}); check controller exports and deploy matching route/controller files.`);
    }
    router[method](path, ...handlers);
}

registerRoute('post', routes.auth.login, AdminAuthController.login);
registerRoute('post', routes.auth.forgotPassword, AdminAuthController.forgotPassword);
registerRoute('post', routes.auth.resetPassword, AdminAuthController.resetPassword);
registerRoute('post', routes.auth.logout, requireAdmin, AdminAuthController.logout);
registerRoute('get', routes.auth.me, requireAdmin, AdminAuthController.me);

router.use(requireAdmin);

registerRoute('get', routes.analytics, AdminController.getAnalytics);
registerRoute('get', routes.metrics, AdminController.getAnalytics);
registerRoute('get', routes.liveRaceBets, getLiveRaceBetPool);
registerRoute('get', routes.racePool, getLiveRaceBetPool);
registerRoute('get', routes.livePot, getLiveRaceBetPool);

// Live & Future Race Control Routes
registerRoute('post', routes.forceWinner, AdminController.setForcedWinner);
registerRoute('post', routes.extendRaceTime, AdminController.extendRaceTime);
registerRoute('get', routes.scheduledWinners, AdminController.getScheduledWinners);
registerRoute('delete', routes.forceWinnerForGame, AdminController.clearForcedWinner);
registerRoute('delete', routes.forceWinner, AdminController.clearForcedWinner);

// Wallet Bonus / Airdrop & Manual Balance Adjustment Routes
registerRoute('post', routes.bonusAll, AdminController.giveCoinsToAllUsers);
registerRoute('post', routes.airdrop, AdminController.giveCoinsToAllUsers);
registerRoute('post', routes.walletAdjust, AdminController.adjustUserBalance);
registerRoute('post', routes.walletCredit, AdminController.adjustUserBalance);
registerRoute('post', routes.walletDebit, AdminController.adjustUserBalance);
registerRoute('get', routes.walletTransactions, AdminController.getAllTransactions);
registerRoute('get', routes.walletLedger, AdminController.getAllTransactions);
registerRoute('get', routes.walletTransactionsSingular, AdminController.getAllTransactions);
registerRoute('get', routes.walletLedgerSingular, AdminController.getAllTransactions);

// Jackpot Admin Management Routes (2X, 3X, 4X... NX & Rare Probability)
registerRoute('post', routes.jackpotForce, AdminController.setJackpot);
registerRoute('post', routes.jackpotConfig, AdminController.configureJackpot);
registerRoute('post', routes.jackpotMode, AdminController.configureJackpot);
registerRoute('get', routes.jackpotConfig, AdminController.getJackpotConfig);
registerRoute('get', routes.jackpotStatus, AdminController.getJackpotStatus);
registerRoute('delete', routes.jackpotForceForGame, AdminController.clearJackpot);
registerRoute('delete', routes.jackpotForce, AdminController.clearJackpot);

module.exports = router;
