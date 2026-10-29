const AnalyticsService = require('../services/analytics.service');
const { socketService } = require('../services/socket.service');
const { raceEngine } = require('../services/raceEngine');

class AdminController {
    /**
     * GET /api/admin/analytics
     * GET /api/admin/metrics
     * Returns real-time Active Players, Today's Bets, Payouts, GGR, Platform Liability & Live Pot
     */
    static async getAnalytics(req, res, next) {
        try {
            const activePlayers = socketService.getActivePlayersCount();
            const metrics = await AnalyticsService.getPlatformMetrics(activePlayers);
            return res.status(200).json({
                success: true,
                ...metrics,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/race/force-winner
     * Set forced winning horse for current active race OR future game_serial
     */
    static async setForcedWinner(req, res, next) {
        try {
            const { gameSerial, game_serial, horseSerial, horse_serial, horseId, horse_id, horseName, reason } = req.body || {};
            const targetSerial = gameSerial || game_serial;
            const targetHorseSerial = horseSerial ?? horse_serial;
            const targetHorseId = horseId ?? horse_id;

            if (!targetHorseSerial && !targetHorseId) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide horseSerial (1-12) or horseId to set as winner',
                });
            }

            const result = await raceEngine.setForcedWinner({
                gameSerial: targetSerial,
                horseSerial: targetHorseSerial,
                horseId: targetHorseId,
                horseName,
                reason,
            });

            if (result.success && raceEngine.forcedCurrentWinner) {
                socketService.syncForcedWinner(raceEngine.forcedCurrentWinner);
                socketService.broadcastLiveRaceSnapshot().catch(() => {});
            }

            return res.status(result.success ? 200 : (result.locked ? 409 : 400)).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/race/extend-time
     * Extend current running race time by extra seconds
     */
    static async extendRaceTime(req, res, next) {
        try {
            const { extraSeconds, extra_seconds } = req.body || {};
            const seconds = extraSeconds || extra_seconds || 5;

            const result = await raceEngine.extendRaceTime({ extraSeconds: seconds });
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/race/scheduled-winners
     * List all current & future pre-scheduled winners
     */
    static async getScheduledWinners(req, res, next) {
        try {
            const result = await raceEngine.getScheduledWinners();
            return res.status(200).json({
                success: true,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/admin/race/force-winner/:gameSerial
     * Cancel forced winner override for a specific game serial
     */
    /**
     * DELETE /api/admin/race/force-winner/:gameSerial
     * Cancel forced winner override for a specific game serial
     */
    static async clearForcedWinner(req, res, next) {
        try {
            const gameSerial = req.params.gameSerial || req.query.gameSerial;
            const result = await raceEngine.clearForcedWinner(gameSerial);
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/wallets/bonus-all
     * Credit coins to ALL users simultaneously
     */
    static async giveCoinsToAllUsers(req, res, next) {
        try {
            const { amount = 10, category = 'bonus', description = 'Admin Bonus Coins' } = req.body || {};
            const WalletService = require('../services/wallet.service');
            const result = await WalletService.creditAllUsers({
                amount: Number(amount),
                category,
                description,
            });

            return res.status(200).json({
                success: true,
                message: `Successfully credited ${amount} coins to all ${result.creditedCount} users`,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/wallets/adjust
     * POST /api/admin/wallets/credit
     * POST /api/admin/wallets/debit
     * Manually credit or debit a specific user's wallet
     */
    static async adjustUserBalance(req, res, next) {
        try {
            const { pool } = require('../config/database');
            const WalletService = require('../services/wallet.service');
            let { userId, user_id, username, type, amount, category = 'manual', description } = req.body || {};

            let targetUserId = userId || user_id;

            // If username provided, resolve userId
            if (!targetUserId && username) {
                const [rows] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [username, username]);
                if (rows.length > 0) {
                    targetUserId = rows[0].id;
                } else {
                    return res.status(404).json({
                        success: false,
                        message: `User with username/email "${username}" not found`,
                    });
                }
            }

            if (!targetUserId) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide userId or username',
                });
            }

            // Determine type if called from /credit or /debit route
            if (req.path.includes('/credit')) {
                type = 'credit';
            } else if (req.path.includes('/debit')) {
                type = 'debit';
            }

            if (!type || !['credit', 'debit'].includes(type.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Transaction type must be "credit" or "debit"',
                });
            }

            const numericAmount = Number(amount);
            if (isNaN(numericAmount) || numericAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be a positive number',
                });
            }

            const autoDesc = description || `Admin Manual ${type.toUpperCase()}: ₹${numericAmount.toFixed(2)}`;

            const result = await WalletService.changeBalance({
                userId: Number(targetUserId),
                type: type.toLowerCase(),
                amount: numericAmount,
                category,
                description: autoDesc,
            });

            return res.status(200).json({
                success: true,
                message: `Successfully ${type.toLowerCase()}ed ₹${numericAmount.toFixed(2)} for User #${targetUserId}`,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/jackpot/force
     * Force / Pre-schedule Jackpot multiplier (2X, 3X, 4X, RANDOM, or N) for live, future race, or time
     */
    static async setJackpot(req, res, next) {
        try {
            const {
                gameSerial,
                game_serial,
                roundsAfter,
                roundOffset,
                afterSeconds,
                scheduledAt,
                scheduledTime,
                multiplier,
                reason,
            } = req.body || {};

            if (multiplier === undefined || multiplier === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide jackpot multiplier: 2 (2X), 3 (3X), 4 (4X), "RANDOM", or "N" (Nothing/1X)',
                    allowedValues: ['N', '2', '3', '4', 2, 3, 4, 'RANDOM'],
                });
            }

            // A plain multiplier selection is the jackpot panel's ON action: keep it
            // active for every new race until explicitly turned OFF. Preserve the
            // one-off scheduling API when a race/offset/time is explicitly supplied.
            if (!gameSerial && !game_serial && !roundsAfter && !roundOffset && !afterSeconds && !scheduledAt && !scheduledTime) {
                const result = await raceEngine.configureContinuousJackpot({
                    enabled: true,
                    mode: 'CONTINUOUS',
                    multiplier,
                });
                return res.status(200).json(result);
            }

            const result = await raceEngine.setForcedJackpot({
                gameSerial: gameSerial || game_serial,
                roundsAfter,
                roundOffset,
                afterSeconds,
                scheduledAt,
                scheduledTime,
                multiplier,
                reason,
            });

            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }


    /**
     * DELETE /api/admin/jackpot/force/:gameSerial
     * Cancel forced jackpot override for a game serial
     */
    static async clearJackpot(req, res, next) {
        try {
            const gameSerial = req.params.gameSerial || req.query.gameSerial;
            const result = await raceEngine.clearForcedJackpot(gameSerial);
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/jackpot/config
     * Configure automatic rare jackpot trigger settings and control modes:
     * - mode: 'EVERY_ROUND' | 'ROUND_INTERVAL' | 'TIME_INTERVAL' | 'PROBABILITY' | 'MANUAL' | 'DISABLED'
     * - targetMultiplier: 2 | 3 | 4 | 'RANDOM'
     * - intervalRounds: number (e.g. 5 rounds)
     * - intervalSeconds: number (e.g. 180 seconds)
     * - probabilityPercent / probability: number (e.g. 10%)
     * - allowedMultipliers: [2, 3, 4]
     * - enabled: boolean
     */
    static async configureJackpot(req, res, next) {
        try {
            const { continuous, enabled, mode, multiplier, durationSeconds, rounds } = req.body || {};
            if (continuous === true || ['CONTINUOUS', 'DURATION', 'ROUNDS', 'OFF'].includes(String(mode || '').toUpperCase()) || enabled === false) {
                const result = await raceEngine.configureContinuousJackpot({ enabled, mode, multiplier, durationSeconds, rounds });
                return res.status(200).json(result);
            }
            const {
                targetMultiplier,
                intervalRounds,
                intervalSeconds,
                probabilityPercent,
                probability,
                allowedMultipliers,
            } = req.body || {};

            const result = raceEngine.updateJackpotConfig({
                enabled,
                mode,
                targetMultiplier,
                intervalRounds,
                intervalSeconds,
                probabilityPercent,
                probability,
                allowedMultipliers,
            });
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/jackpot/status
     * Get active race jackpot, config and upcoming scheduled jackpots
     */
    static async getJackpotStatus(req, res, next) {
        try {
            const result = await raceEngine.getJackpotStatus();
            return res.status(200).json({
                success: true,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/jackpot/config
     * Returns Jackpot configuration for frontend
     */
    static async getJackpotConfig(req, res, next) {
        try {
            const status = await raceEngine.getJackpotStatus();
            return res.status(200).json({
                success: true,
                ...status.config,
                activeRaceJackpot: status.activeRaceJackpot,
                scheduledJackpots: status.scheduledJackpots,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/wallets/transactions
     * GET /api/admin/wallets/ledger
     * Returns all system wallet transactions for Admin Audit Feed
     */
    static async getAllTransactions(req, res, next) {
        try {
            const { pool } = require('../config/database');
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const offset = (page - 1) * limit;

            const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM wallet_transactions');
            const total = countRows[0]?.total || 0;

            const [rows] = await pool.query(
                `SELECT wt.id, wt.wallet_id, wt.user_id, u.username, u.name AS user_name,
                        wt.type, wt.category, wt.amount, wt.balance_before, wt.balance_after,
                        wt.reference_id, wt.reference_type, wt.description, wt.status, wt.created_at
                 FROM wallet_transactions wt
                 LEFT JOIN users u ON wt.user_id = u.id
                 ORDER BY wt.id DESC
                 LIMIT ? OFFSET ?`,
                [limit, offset]
            );

            const transactions = rows.map((r) => ({
                id: Number(r.id),
                transactionId: Number(r.id),
                walletId: Number(r.wallet_id),
                userId: Number(r.user_id),
                username: r.username || `User #${r.user_id}`,
                name: r.user_name || null,
                type: r.type,
                category: r.category,
                amount: Number(Number(r.amount).toFixed(2)),
                displayAmount: `${r.type === 'credit' ? '+' : '-'}₹${Number(r.amount).toFixed(2)}`,
                balanceBefore: Number(Number(r.balance_before).toFixed(2)),
                balanceAfter: Number(Number(r.balance_after).toFixed(2)),
                displayBalance: `₹${Number(r.balance_after).toFixed(2)}`,
                referenceId: r.reference_id,
                referenceType: r.reference_type,
                description: r.description,
                status: r.status,
                createdAt: r.created_at,
            }));

            const totalPages = Math.ceil(total / limit) || 1;

            return res.status(200).json({
                success: true,
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages,
                transactions,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AdminController;
module.exports.AdminController = AdminController;
