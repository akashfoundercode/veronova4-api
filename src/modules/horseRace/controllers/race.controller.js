const { raceEngine } = require('../services/raceEngine');
const RaceModel = require('../models/race.model');

class RaceController {
    /**
     * GET /api/races/current
     * Returns the currently running global Race (Shared by all users across all devices)
     */
    static async getCurrentRace(req, res, next) {
        try {
            const state = raceEngine.getCurrentState();
            return res.status(200).json({
                success: true,
                race: state,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/races/:id
     * Returns details of a specific race
     */
    static async getRaceById(req, res, next) {
        try {
            const raceId = Number(req.params.id);
            if (isNaN(raceId)) {
                return res.status(400).json({ success: false, message: 'Invalid race ID' });
            }

            const race = await RaceModel.findById(raceId);
            if (!race) {
                return res.status(404).json({ success: false, message: 'Race not found' });
            }

            const horses = await RaceModel.getRaceHorses(raceId);

            return res.status(200).json({
                success: true,
                race: {
                    id: race.id,
                    gameSerial: race.game_serial,
                    status: race.status,
                    bettingOpenAt: race.betting_open_at,
                    bettingCloseAt: race.betting_close_at,
                    countdownAt: race.countdown_at,
                    startedAt: race.started_at,
                    finishedAt: race.finished_at,
                    resultAt: race.result_at,
                    winnerHorseId: race.winner_horse_id,
                    horses,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/races/previous-results
     * GET /api/races/results
     * Returns compact list of past races with jackpot multiplier and winning horse serial & name
     */
    static async getPreviousGameResults(req, res, next) {
        try {
            const data = await RaceModel.getPreviousGameResults(req.query);
            return res.status(200).json({
                success: true,
                ...data,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/races/matches-results
     * GET /api/races/history
     * Returns all completed game matches with serial numbers, winners and full horse ranking (1 to 12)
     */
    static async getAllMatchesResults(req, res, next) {
        try {
            const data = await RaceModel.getAllMatchesResults(req.query);
            return res.status(200).json({
                success: true,
                ...data,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/races
     * Returns recent global races history
     */
    static async getRaces(req, res, next) {
        try {
            const limit = req.query.limit || 20;
            const races = await RaceModel.getRecentRaces(limit);
            return res.status(200).json({
                success: true,
                races,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/races/:id/horses
     * Returns horses participating in a specific race
     */
    static async getRaceHorses(req, res, next) {
        try {
            const raceId = Number(req.params.id);
            if (isNaN(raceId)) {
                return res.status(400).json({ success: false, message: 'Invalid race ID' });
            }

            const horses = await RaceModel.getRaceHorses(raceId);
            return res.status(200).json({
                success: true,
                raceId,
                horses,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/races/:id/result
     * Returns final outcome and ranking of a finished race
     */
    static async getRaceResult(req, res, next) {
        try {
            const raceId = Number(req.params.id);
            if (isNaN(raceId)) {
                return res.status(400).json({ success: false, message: 'Invalid race ID' });
            }

            const result = await RaceModel.getRaceResult(raceId);
            if (!result) {
                return res.status(404).json({ success: false, message: 'Race result not found' });
            }

            return res.status(200).json({
                success: true,
                result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/races/result-screen
     * GET /api/races/:id/result-screen
     * Returns tailored Finish Screen result summary (Track Record 1000M, Winner, User Outcome [NO BET / WON / LOSE], Auto Next Race Timer, User Balance)
     */
    static async getFinishScreenResult(req, res, next) {
        try {
            const BetService = require('../services/bet.service');
            const raceIdentifier = req.params.id || req.query.game_serial || req.query.gameSerial;
            const userId = req.user?.id || null;
            const summary = await BetService.getFinishScreenResult(userId, raceIdentifier);
            return res.status(200).json(summary);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = RaceController;

