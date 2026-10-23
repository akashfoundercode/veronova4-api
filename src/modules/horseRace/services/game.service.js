const GameModel = require('../models/game.model');

class GameService {
    /**
     * Initialize or retrieve existing game for an authenticated user.
     * Guaranteed: ONE USER = ONE GAME across multiple devices.
     */
    static async initializeUserGame(userId) {
        if (!userId) {
            const error = new Error('User ID is required to initialize game');
            error.statusCode = 400;
            throw error;
        }

        const game = await GameModel.getOrCreateUserGame(userId);
        return this.formatGameResponse(game);
    }

    /**
     * Get the authenticated user's permanent game
     */
    static async getUserGame(userId) {
        if (!userId) {
            const error = new Error('User ID is required');
            error.statusCode = 400;
            throw error;
        }

        const game = await GameModel.findByUserId(userId);
        if (!game) {
            const error = new Error('Game not found for this user. Please initialize game first.');
            error.statusCode = 404;
            throw error;
        }

        return this.formatGameResponse(game);
    }

    /**
     * Get all users with their permanent game codes and wallet data
     */
    static async getAllUsersGames(options = {}) {
        const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 50));
        const page = Math.max(1, parseInt(options.page, 10) || 1);
        const offset = (page - 1) * limit;

        const rows = await GameModel.findAllUsersWithGameCodes({
            limit,
            offset,
            search: options.search,
        });

        return {
            total: rows.length,
            users: rows.map((u) => ({
                userId: Number(u.user_id),
                username: u.username,
                name: u.name,
                email: u.email,
                role: u.role,
                game: u.game_id ? {
                    id: Number(u.game_id),
                    gameCode: u.game_code,
                    status: u.game_status,
                } : null,
                wallet: u.wallet_id ? {
                    id: Number(u.wallet_id),
                    balance: Number(Number(u.wallet_balance).toFixed(2)),
                    displayBalance: `₹${Number(u.wallet_balance).toFixed(2)}`,
                    currency: u.wallet_currency,
                } : null,
                createdAt: u.user_created_at,
            })),
        };
    }

    /**
     * Format consistent JSON output for User Game Session
     */
    static formatGameResponse(game) {
        return {
            id: Number(game.id),
            gameCode: String(game.game_code || game.game_serial || ''),
            userId: Number(game.user_id),
            status: game.status,
            createdAt: game.created_at,
            updatedAt: game.updated_at,
        };
    }
}

module.exports = GameService;

