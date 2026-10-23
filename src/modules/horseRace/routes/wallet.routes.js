const express = require('express');
const { optionalAuth } = require('../middleware/auth.middleware');
const { getWallet, getTransactions } = require('../controllers/wallet.controller');
const { API_ROUTES } = require('../../../config/apiRoutes');
const routes = API_ROUTES.horseRace.wallet;

const router = express.Router();

router.use(optionalAuth);

router.get(API_ROUTES.horseRace.root, (req, res, next) => {
    if (!req.user) {
        return res.json({
            success: true,
            wallet: { balance: 0, rawBalance: '0.00', currency: 'INR', status: 'guest' },
        });
    }
    return getWallet(req, res, next);
});

router.get(routes.me, (req, res, next) => {
    if (!req.user) {
        return res.json({
            success: true,
            wallet: { balance: 0, rawBalance: '0.00', currency: 'INR', status: 'guest' },
        });
    }
    return getWallet(req, res, next);
});

router.get(routes.transactions, (req, res, next) => {
    if (!req.user) {
        return res.json({
            success: true,
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
            hasMore: false,
            transactions: [],
        });
    }
    return getTransactions(req, res, next);
});

router.get(routes.ledger, (req, res, next) => {
    if (!req.user) {
        return res.json({
            success: true,
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
            hasMore: false,
            transactions: [],
        });
    }
    return getTransactions(req, res, next);
});

module.exports = router;
