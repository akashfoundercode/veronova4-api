        const { raceEngine } = require('../services/raceEngine');
        const RaceModel = require('../models/race.model');

        class RaceController {
            /**
             * Flexibly resolve target race from req.params, req.query, or req.body.
             * Supports:
             * - Numeric race ID (e.g. 459)
             * - String game serial (e.g. "20261028001")
             * - "current" / "live" keywords
             * - Query params (?race_id=459, ?id=459, ?game_serial=...)
             */
            static async resolveRaceTarget(req) {
                let raw = req.params?.id;

                // If path parameter is omitted, placeholder, or keyword
                if (!raw || raw === 'undefined' || raw === 'null' || raw === ':id' || raw === 'horses' || raw === 'result' || raw === 'results') {
                    raw = req.query?.race_id || req.query?.raceId || req.query?.id || req.query?.game_serial || req.query?.gameSerial
                       || req.body?.race_id || req.body?.raceId || req.body?.id || req.body?.game_serial || req.body?.gameSerial;
                }

                // If no identifier provided or requesting current/live race
                if (!raw || raw === 'current' || raw === 'live') {
                    const state = raceEngine.getCurrentState();
                    if (state && (state.id || state.raceId)) {
                        return { race: state, raceId: state.id || state.raceId, isCurrent: true };
                    }
                    try {
                        const activeRace = await RaceModel.findActiveRace();
                        if (activeRace) {
                            return { race: activeRace, raceId: activeRace.id, isCurrent: true };
                        }
                    } catch (_) {}
                    return { race: null, raceId: null, isCurrent: true };
                }

                const rawStr = String(raw).trim();

                // 1. Check current running race
                const state = raceEngine.getCurrentState();
                if (state && (String(state.id) === rawStr || String(state.raceId) === rawStr || String(state.gameSerial) === rawStr)) {
                    return { race: state, raceId: state.id || state.raceId, isCurrent: true };
                }

                // 2. Lookup in database by numeric ID (e.g. 459)
                const numericId = Number(rawStr);
                if (!isNaN(numericId) && numericId > 0) {
                    try {
                        const raceById = await RaceModel.findById(numericId);
                        if (raceById) {
                            return { race: raceById, raceId: raceById.id, isCurrent: false };
                        }
                    } catch (_) {}
                }

                // 3. Lookup in database by game_serial (e.g. '20261026001')
                try {
                    const raceBySerial = await RaceModel.findByGameSerial(rawStr);
                    if (raceBySerial) {
                        return { race: raceBySerial, raceId: raceBySerial.id, isCurrent: false };
                    }
                } catch (_) {}

                // 4. Check previousRace in memory
                if (raceEngine.previousRace && (String(raceEngine.previousRace.id) === rawStr || String(raceEngine.previousRace.game_serial) === rawStr)) {
                    return { race: raceEngine.previousRace, raceId: raceEngine.previousRace.id, isCurrent: false };
                }

                return { race: null, raceId: !isNaN(numericId) && numericId > 0 ? numericId : null, raw: rawStr };
            }

            /**
             * GET /api/races/current
             * Returns the currently running global Race (Shared by all users across all devices)
             */
            static async getCurrentRace(req, res, next) {
                try {
                    if (!raceEngine.currentRace || !raceEngine.isRunning) {
                        if (!raceEngine.isRunning) {
                            await raceEngine.start().catch(() => {});
                        } else {
                            await raceEngine.recoverOrCreateRace().catch(() => {});
                        }
                    }
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
                    const rawParam = req.params?.id;
                    if (rawParam === 'horses') {
                        return RaceController.getRaceHorses(req, res, next);
                    }
                    if (rawParam === 'result' || rawParam === 'results') {
                        return RaceController.getRaceResult(req, res, next);
                    }
                    if (rawParam === 'current' || rawParam === 'live') {
                        return RaceController.getCurrentRace(req, res, next);
                    }
                    if (rawParam === 'matches' || rawParam === 'match' || rawParam === 'all-matches' || rawParam === 'matches-results') {
                        return RaceController.getAllMatchesResults(req, res, next);
                    }
                    if (rawParam === 'result-screen' || rawParam === 'finish-screen') {
                        return RaceController.getFinishScreenResult(req, res, next);
                    }

                    const target = await RaceController.resolveRaceTarget(req);
                    if (!target.race) {
                        if (target.raceId) {
                            let horses = [];
                            try {
                                horses = await RaceModel.getRaceHorses(target.raceId);
                            } catch (_) {}
                            if (horses && horses.length > 0) {
                                return res.status(200).json({
                                    success: true,
                                    race: {
                                        id: target.raceId,
                                        gameSerial: String(target.raceId),
                                        status: 'COMPLETED',
                                        horses,
                                    },
                                });
                            }
                        }

                        // If request was for current/live race or raw identifier was omitted
                        if (target.isCurrent || !req.params?.id || req.params.id === 'undefined') {
                            if (!raceEngine.isRunning) {
                                await raceEngine.start().catch(() => {});
                            } else {
                                await raceEngine.recoverOrCreateRace().catch(() => {});
                            }
                            const state = raceEngine.getCurrentState();
                            return res.status(200).json({
                                success: true,
                                race: state,
                            });
                        }

                        return res.status(404).json({ success: false, message: 'Race not found' });
                    }

                    const race = target.race;
                    const raceId = target.raceId || race.id || race.raceId;
                    let horses = [];
                    try {
                        horses = await RaceModel.getRaceHorses(raceId);
                    } catch (_) {}

                    if ((!horses || horses.length === 0) && race.horses) {
                        horses = race.horses;
                    }

                    return res.status(200).json({
                        success: true,
                        race: {
                            id: race.id || race.raceId,
                            gameSerial: race.game_serial || race.gameSerial,
                            status: race.status,
                            bettingOpenAt: race.betting_open_at || race.bettingOpenAt,
                            bettingCloseAt: race.betting_close_at || race.bettingCloseAt,
                            countdownAt: race.countdown_at || race.countdownAt,
                            startedAt: race.started_at || race.startedAt,
                            finishedAt: race.finished_at || race.finishedAt,
                            resultAt: race.result_at || race.resultAt,
                            winnerHorseId: race.winner_horse_id || race.winnerHorseId,
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
                    let data = { results: [], total: 0, totalPages: 1 };
                    try {
                        data = await RaceModel.getPreviousGameResults(req.query);
                    } catch (_) { }
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
                    let data = { results: [], total: 0, totalPages: 1 };
                    try {
                        data = await RaceModel.getAllMatchesResults(req.query);
                    } catch (_) { }
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
                    let races = [];
                    try {
                        races = await RaceModel.getRecentRaces(limit);
                    } catch (_) { }
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
             * GET /api/races/horses
             * Returns horses participating in a specific race or current race
             */
            static async getRaceHorses(req, res, next) {
                try {
                    const target = await RaceController.resolveRaceTarget(req);
                    const raceId = target.raceId || (target.race ? (target.race.id || target.race.raceId) : null);

                    let horses = [];
                    if (raceId) {
                        try {
                            horses = await RaceModel.getRaceHorses(raceId);
                        } catch (_) {}
                    }

                    if ((!horses || horses.length === 0) && target.race?.horses) {
                        horses = target.race.horses;
                    }

                    // Fallback to active race horses if nothing found
                    if (!horses || horses.length === 0) {
                        const state = raceEngine.getCurrentState();
                        if (state?.horses && state.horses.length > 0) {
                            horses = state.horses;
                        }
                    }

                    return res.status(200).json({
                        success: true,
                        raceId: raceId || (target.race ? target.race.id : null),
                        horses: horses || [],
                    });
                } catch (error) {
                    next(error);
                }
            }

            /**
             * GET /api/races/:id/result
             * GET /api/races/result
             * Returns final outcome and ranking of a finished race
             */
            static async getRaceResult(req, res, next) {
                try {
                    const target = await RaceController.resolveRaceTarget(req);
                    const raceId = target.raceId || (target.race ? (target.race.id || target.race.raceId) : null);

                    let result = null;
                    if (raceId) {
                        try {
                            result = await RaceModel.getRaceResult(raceId);
                        } catch (_) {}
                    }

                    if (!result && target.race) {
                        result = {
                            race: target.race,
                            horses: target.race.horses || [],
                            winner: target.race.winner || null,
                        };
                    }

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
                    const raceIdentifier = req.params.id || req.query.race_id || req.query.raceId || req.query.id || req.query.game_serial || req.query.gameSerial;
                    const userId = req.user?.id || null;
                    const summary = await BetService.getFinishScreenResult(userId, raceIdentifier);
                    return res.status(200).json(summary);
                } catch (error) {
                    next(error);
                }
            }
        }

        module.exports = RaceController;

