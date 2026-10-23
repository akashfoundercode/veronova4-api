const GameService = require('../services/game.service');

class GameController {
    /**
     * POST /api/games/initialize
     * Initializes or returns the authenticated user's permanent Game
     */
    static async initialize(req, res, next) {
        try {
            const userId = req.user && req.user.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const game = await GameService.initializeUserGame(userId);
            return res.status(200).json({
                success: true,
                message: 'Game session initialized successfully',
                game,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/games/me
     * Returns the authenticated user's permanent Game
     */
    static async getMyGame(req, res, next) {
        try {
            const userId = req.user && req.user.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const game = await GameService.getUserGame(userId);
            return res.status(200).json({
                success: true,
                game,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/games/users (or /api/games/all)
     * Returns all registered users with their game codes and wallets
     */
    static async getAllUsers(req, res, next) {
        try {
            const result = await GameService.getAllUsersGames(req.query || {});
            return res.status(200).json({
                success: true,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = GameController;
