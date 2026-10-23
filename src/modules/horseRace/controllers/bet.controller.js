const BetService = require('../services/bet.service');

async function placeBet(request, response, next) {
    try {
        const userId = request.user.id;
        const result = await BetService.placeBets(userId, request.body || {});
        return response.status(201).json(result);
    } catch (error) {
        return next(error);
    }
}

async function getMyCurrentBets(request, response, next) {
    try {
        const userId = request.user.id;
        const result = await BetService.getMyCurrentBets(userId, request.query || {});
        return response.json({
            success: true,
            ...result,
        });
    } catch (error) {
        return next(error);
    }
}

async function getMyBetHistory(request, response, next) {
    try {
        const userId = request.user.id;
        const result = await BetService.getMyBetHistory(userId, request.query || {});
        return response.json({
            success: true,
            ...result,
        });
    } catch (error) {
        return next(error);
    }
}

async function getLiveBetLedger(request, response, next) {
    try {
        const result = await BetService.getLiveBetLedger(request.query || {});
        return response.json({
            success: true,
            ...result,
        });
    } catch (error) {
        return next(error);
    }
}

async function getLiveRaceBetPool(request, response, next) {
    try {
        const userId = request.user ? request.user.id : null;
        const raceIdentifier = request.query.raceId || request.query.game_serial || request.query.gameSerial || request.params.id;
        const result = await BetService.getLiveRaceBetPool(raceIdentifier, userId);
        return response.json(result);
    } catch (error) {
        return next(error);
    }
}

async function cancelBet(request, response, next) {
    try {
        const userId = request.user.id;
        const options = {
            ...(request.query || {}),
            ...(request.body || {}),
            ...(request.params || {}),
        };
        const result = await BetService.cancelBet(userId, options);
        return response.json(result);
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    placeBet,
    cancelBet,
    getMyCurrentBets,
    getMyBetHistory,
    getLiveBetLedger,
    getLiveRaceBetPool,
};

