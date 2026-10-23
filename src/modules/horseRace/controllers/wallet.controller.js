const WalletService = require('../services/wallet.service');

async function getWallet(request, response, next) {
    try {
        const userId = request.user.id;
        const wallet = await WalletService.getWalletByUserId(userId);
        return response.json({
            success: true,
            balance: wallet.balance,
            coins: wallet.balance,
            displayBalance: wallet.displayBalance,
            totalWon: wallet.totalWon,
            displayTotalWon: wallet.displayTotalWon,
            totalInvested: wallet.totalInvested,
            netProfitLoss: wallet.netProfitLoss,
            wallet,
        });
    } catch (error) {
        return next(error);
    }
}

async function getTransactions(request, response, next) {
    try {
        const userId = request.user.id;
        const { page, limit, type, category, startDate, endDate } = request.query;

        // Validation for type filter if provided
        if (type && !['credit', 'debit'].includes(type.toLowerCase())) {
            return response.status(400).json({
                message: 'Invalid transaction type. Allowed values are "credit" or "debit"',
            });
        }

        const data = await WalletService.getTransactions(userId, {
            page,
            limit,
            type: type ? type.toLowerCase() : undefined,
            category,
            startDate,
            endDate,
        });

        return response.json({
            success: true,
            ...data,
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getWallet,
    getTransactions,
};

