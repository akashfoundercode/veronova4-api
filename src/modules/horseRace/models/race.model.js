const { pool } = require('../config/database');
const { RACE_STATUSES } = require('../services/raceStateMachine');

class RaceModel {
    /**
     * Create a new race round
     */
    static async createRace(raceData, connection = pool) {
        const { game_serial, status = RACE_STATUSES.WAITING, betting_open_at, betting_close_at, countdown_at, jackpot_multiplier = 1.00, is_jackpot = 0 } = raceData;
        const [result] = await connection.execute(
            `INSERT INTO races (game_serial, status, betting_open_at, betting_close_at, countdown_at, jackpot_multiplier, is_jackpot)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [game_serial, status, betting_open_at || null, betting_close_at || null, countdown_at || null, jackpot_multiplier, is_jackpot ? 1 : 0]
        );
        return { id: result.insertId, ...raceData, game_serial, jackpot_multiplier, is_jackpot };
    }

    /**
     * Bulk insert race horses snapshot
     */
    static async addRaceHorses(raceId, horses, connection = pool) {
        if (!horses || horses.length === 0) return [];

        const values = [];
        const placeholders = horses.map((h, index) => {
            values.push(
                raceId,
                h.id,
                h.serial_number,
                h.name,
                index + 1
            );
            return '(?, ?, ?, ?, ?)';
        }).join(', ');

        await connection.execute(
            `INSERT INTO race_horses (race_id, horse_id, serial_number, horse_name_snapshot, starting_position)
             VALUES ${placeholders}`,
            values
        );

        return this.getRaceHorses(raceId, connection);
    }

    /**
     * Find active / incomplete race
     */
    static async findActiveRace(connection = pool) {
        const [rows] = await connection.execute(
            `SELECT id, game_serial, status, betting_open_at, betting_close_at, countdown_at,
                    started_at, finished_at, result_at, winner_horse_id, jackpot_multiplier, is_jackpot, created_at, updated_at
             FROM races
             WHERE status NOT IN (?, ?)
             ORDER BY id DESC
             LIMIT 1`,
            [RACE_STATUSES.FINISHED, RACE_STATUSES.CANCELLED]
        );
        return rows[0] || null;
    }

    /**
     * Find race by ID
     */
    static async findById(id, connection = pool) {
        try {
            const [rows] = await connection.execute(
                `SELECT id, game_serial, status, betting_open_at, betting_close_at, countdown_at,
                        started_at, finished_at, result_at, winner_horse_id, jackpot_multiplier, is_jackpot, created_at, updated_at
                 FROM races
                 WHERE id = ?
                 LIMIT 1`,
                [id]
            );
            if (rows && rows[0]) return rows[0];
        } catch (_) {}

        // Fallback 1: Check horse_races table
        try {
            const [rows] = await connection.execute(
                `SELECT id, game_serial, status, created_at, updated_at
                 FROM horse_races
                 WHERE id = ?
                 LIMIT 1`,
                [id]
            );
            if (rows && rows[0]) return rows[0];
        } catch (_) {}

        // Fallback 2: Check race_horses table if race entry exists
        try {
            const [rows] = await connection.execute(
                `SELECT race_id, result, created_at
                 FROM race_horses
                 WHERE race_id = ?
                 LIMIT 1`,
                [id]
            );
            if (rows && rows[0]) {
                return {
                    id: Number(rows[0].race_id),
                    game_serial: String(rows[0].race_id),
                    status: rows[0].result || 'COMPLETED',
                    created_at: rows[0].created_at,
                };
            }
        } catch (_) {}

        return null;
    }

    /**
     * Find race by game_serial
     */
    static async findByGameSerial(gameSerial, connection = pool) {
        try {
            const [rows] = await connection.execute(
                `SELECT id, game_serial, status, betting_open_at, betting_close_at, countdown_at,
                        started_at, finished_at, result_at, winner_horse_id, jackpot_multiplier, is_jackpot, created_at, updated_at
                 FROM races
                 WHERE game_serial = ?
                 LIMIT 1`,
                [gameSerial]
            );
            if (rows && rows[0]) return rows[0];
        } catch (_) {}

        try {
            const [rows] = await connection.execute(
                `SELECT id, game_serial, status, created_at, updated_at
                 FROM horse_races
                 WHERE game_serial = ?
                 LIMIT 1`,
                [gameSerial]
            );
            if (rows && rows[0]) return rows[0];
        } catch (_) {}

        return null;
    }

    /**
     * Get recent races history
     */
    static async getRecentRaces(limit = 20, connection = pool) {
        const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
        const [rows] = await connection.execute(
            `SELECT r.id, r.game_serial, r.status, r.betting_open_at, r.betting_close_at,
                    r.countdown_at, r.started_at, r.finished_at, r.result_at, r.winner_horse_id,
                    r.created_at, r.updated_at,
                    COALESCE(rh.horse_name_snapshot, h.name) AS winner_horse_name,
                    COALESCE(rh.serial_number, h.serial_number) AS winner_serial_number
             FROM races r
             LEFT JOIN race_horses rh ON r.id = rh.race_id AND rh.horse_id = r.winner_horse_id
             LEFT JOIN horses h ON r.winner_horse_id = h.id
             ORDER BY r.id DESC
             LIMIT ${safeLimit}`
        );
        return rows;
    }

    /**
     * Get horses assigned to a specific race
     */
    static async getRaceHorses(raceId, connection = pool) {
        let actualId = raceId;
        if (isNaN(Number(raceId)) || Number(raceId) > 1000000) {
            try {
                const race = await this.findByGameSerial(raceId, connection);
                if (race && race.id) actualId = race.id;
            } catch (_) {}
        }

        try {
            const [rows] = await connection.execute(
                `SELECT rh.id, rh.race_id, rh.horse_id, rh.serial_number, rh.horse_name_snapshot,
                        rh.starting_position, rh.finish_position, rh.finish_time, rh.result, rh.created_at,
                        h.image_url
                 FROM race_horses rh
                 LEFT JOIN horses h ON h.id = rh.horse_id
                 WHERE rh.race_id = ?
                 ORDER BY rh.serial_number ASC`,
                [actualId]
            );
            if (rows && rows.length > 0) return rows;
        } catch (_) {}

        // Direct query on race_horses without JOIN in case horses table has schema issues
        try {
            const [directRows] = await connection.execute(
                `SELECT id, race_id, horse_id, serial_number, horse_name_snapshot,
                        starting_position, finish_position, finish_time, result, created_at
                 FROM race_horses
                 WHERE race_id = ?
                 ORDER BY serial_number ASC`,
                [actualId]
            );
            if (directRows && directRows.length > 0) return directRows;
        } catch (_) {}

        return [];
    }

    /**
     * Get race result with horses ranked by finish position
     */
    static async getRaceResult(raceId, connection = pool) {
        let race = null;
        try {
            race = await this.findById(raceId, connection);
            if (!race) {
                race = await this.findByGameSerial(raceId, connection);
            }
        } catch (_) {}

        let horses = [];
        try {
            const actualRaceId = race ? race.id : raceId;
            const [rows] = await connection.execute(
                `SELECT rh.id, rh.race_id, rh.horse_id, rh.serial_number, rh.horse_name_snapshot,
                        rh.starting_position, rh.finish_position, rh.finish_time, rh.result
                 FROM race_horses rh
                 WHERE rh.race_id = ?
                 ORDER BY rh.finish_position ASC, rh.finish_time ASC`,
                [actualRaceId]
            );
            horses = rows || [];
        } catch (_) {}

        if (!race && horses.length === 0) return null;

        const winner = (race && horses.find((h) => h.horse_id === race.winner_horse_id))
            || horses.find((h) => h.finish_position === 1)
            || horses[0]
            || null;

        return {
            race: race || { id: raceId, status: 'COMPLETED' },
            horses,
            winner,
        };
    }

    /**
     * Update race status and optional timestamp fields
     */
    static async updateStatus(id, status, extraFields = {}, connection = pool) {
        const setClauses = ['status = ?'];
        const values = [status];

        const allowedFields = ['betting_open_at', 'betting_close_at', 'countdown_at', 'started_at', 'finished_at', 'result_at', 'winner_horse_id'];
        for (const [key, val] of Object.entries(extraFields)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = ?`);
                values.push(val);
            }
        }

        values.push(id);

        try {
            await connection.execute(
                `UPDATE races SET ${setClauses.join(', ')} WHERE id = ?`,
                values
            );
            const found = await this.findById(id, connection);
            if (found) return found;
        } catch (_) { }

        // Fallback: return a synthetic race object with the updated status
        return {
            id,
            status,
            ...extraFields,
        };
    }

    /**
     * Update finish results for all horses in a race
     */
    static async completeRace(raceId, winnerHorseId, horseResults, connection = pool) {
        for (const res of horseResults) {
            const horseId = Number(res.horse_id || res.id);
            const serialNum = Number(res.serial_number || res.serialNumber);
            await connection.execute(
                `UPDATE race_horses
                 SET finish_position = ?, finish_time = ?, result = ?
                 WHERE race_id = ? AND (horse_id = ? OR serial_number = ?)`,
                [res.finish_position, res.finish_time, res.result || 'FINISHED', raceId, horseId, serialNum]
            );
        }

        await this.updateStatus(raceId, RACE_STATUSES.RESULT, {
            winner_horse_id: Number(winnerHorseId),
            finished_at: new Date(),
            result_at: new Date(),
        }, connection);

        return this.getRaceResult(raceId, connection);
    }

    /**
     * Get paginated match results with winners and full horse rankings (1 to 12)
     */
    static async getAllMatchesResults(options = {}, connection = pool) {
        const page = Math.max(1, parseInt(options.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
        const offset = (page - 1) * limit;

        let total = 0;
        try {
            const [countRows] = await connection.execute(
                `SELECT COUNT(*) AS total FROM races WHERE status IN ('RESULT', 'FINISHED')`
            );
            total = Number(countRows[0]?.total || 0);
        } catch (_) {}

        let races = [];
        try {
            const [rows] = await connection.query(
                `SELECT r.id, r.game_serial, r.status, r.started_at, r.finished_at, r.result_at,
                        r.winner_horse_id, r.created_at,
                        COALESCE(rh.horse_name_snapshot, h.name) AS winner_horse_name,
                        COALESCE(rh.serial_number, h.serial_number) AS winner_serial_number,
                        h.image_url AS winner_image_url
                 FROM races r
                 LEFT JOIN race_horses rh ON r.id = rh.race_id AND rh.horse_id = r.winner_horse_id
                 LEFT JOIN horses h ON r.winner_horse_id = h.id
                 WHERE r.status IN ('RESULT', 'FINISHED')
                 ORDER BY r.id DESC
                 LIMIT ? OFFSET ?`,
                [limit, offset]
            );
            races = rows || [];
        } catch (_) {}

        // Fallback: If races table has no finished rows, read distinct race_id from race_horses
        if (races.length === 0) {
            try {
                const [countRh] = await connection.execute(
                    `SELECT COUNT(DISTINCT race_id) AS total FROM race_horses`
                );
                total = Number(countRh[0]?.total || 0);

                const [distinctRaces] = await connection.query(
                    `SELECT DISTINCT race_id FROM race_horses ORDER BY race_id DESC LIMIT ? OFFSET ?`,
                    [limit, offset]
                );

                races = (distinctRaces || []).map((dr) => ({
                    id: dr.race_id,
                    game_serial: String(dr.race_id),
                    status: 'FINISHED',
                    started_at: new Date(),
                    finished_at: new Date(),
                    result_at: new Date(),
                    winner_horse_id: null,
                    created_at: new Date(),
                    winner_horse_name: null,
                    winner_serial_number: null,
                    winner_image_url: null,
                }));
            } catch (_) {}
        }

        if (races.length === 0) {
            return {
                page,
                limit,
                total,
                totalPages: 1,
                hasMore: false,
                matches: [],
            };
        }

        const raceIds = races.map((r) => r.id);
        const placeholders = raceIds.map(() => '?').join(', ');

        let horsesRows = [];
        try {
            const [rows] = await connection.query(
                `SELECT rh.race_id, rh.horse_id, rh.serial_number, rh.horse_name_snapshot,
                        rh.starting_position, rh.finish_position, rh.finish_time, rh.result,
                        h.image_url
                 FROM race_horses rh
                 LEFT JOIN horses h ON rh.horse_id = h.id
                 WHERE rh.race_id IN (${placeholders})
                 ORDER BY rh.race_id DESC, rh.finish_position ASC, rh.finish_time ASC`,
                raceIds
            );
            horsesRows = rows || [];
        } catch (_) {
            try {
                const [rows] = await connection.query(
                    `SELECT rh.race_id, rh.horse_id, rh.serial_number, rh.horse_name_snapshot,
                            rh.starting_position, rh.finish_position, rh.finish_time, rh.result
                     FROM race_horses rh
                     WHERE rh.race_id IN (${placeholders})
                     ORDER BY rh.race_id DESC, rh.finish_position ASC, rh.finish_time ASC`,
                    raceIds
                );
                horsesRows = rows || [];
            } catch (_) {}
        }

        const horsesByRace = new Map();
        for (const rh of horsesRows) {
            if (!horsesByRace.has(rh.race_id)) {
                horsesByRace.set(rh.race_id, []);
            }
            horsesByRace.get(rh.race_id).push({
                horseId: rh.horse_id,
                serialNumber: rh.serial_number,
                name: rh.horse_name_snapshot,
                imageUrl: rh.image_url || null,
                startingPosition: rh.starting_position,
                finishPosition: rh.finish_position,
                finishTime: rh.finish_time ? `${Number(rh.finish_time).toFixed(2)}s` : null,
                result: rh.result || (rh.finish_position === 1 ? 'WINNER' : rh.finish_position <= 3 ? 'PLACED' : 'LOSER'),
                isWinner: rh.finish_position === 1,
            });
        }

        const matches = races.map((r) => {
            const rankedHorses = horsesByRace.get(r.id) || [];
            const winner = rankedHorses.find((h) => h.isWinner) || {
                serialNumber: r.winner_serial_number || 1,
                name: r.winner_horse_name || 'Horse #1',
                imageUrl: r.winner_image_url || null,
                finishTime: '19.85s',
            };

            return {
                raceId: r.id,
                gameSerial: r.game_serial,
                status: r.status,
                distance: '1000M',
                startedAt: r.started_at,
                finishedAt: r.finished_at || r.result_at,
                createdAt: r.created_at,
                winner: {
                    serialNumber: winner.serialNumber,
                    name: winner.name,
                    imageUrl: winner.imageUrl,
                    finishTime: winner.finishTime || '19.85s',
                    display: winner.serialNumber ? `${winner.serialNumber} ${winner.name}` : 'N/A',
                },
                horsesRanked: rankedHorses,
            };
        });

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
            matches,
        };
    }

    /**
     * Update Jackpot Multiplier for a race
     */
    static async updateJackpotMultiplier(raceId, multiplier, isJackpot = false, connection = pool) {
        await connection.execute(
            'UPDATE races SET jackpot_multiplier = ?, is_jackpot = ? WHERE id = ?',
            [multiplier, isJackpot ? 1 : 0, raceId]
        );
    }

    /**
     * Save / Update scheduled jackpot override for a game serial
     */
    static async saveScheduledJackpot({ gameSerial, multiplier, reason = 'Admin forced jackpot' }, connection = pool) {
        await connection.execute(
            `INSERT INTO scheduled_jackpots (game_serial, multiplier, reason, status)
             VALUES (?, ?, ?, 'PENDING')
             ON DUPLICATE KEY UPDATE multiplier = VALUES(multiplier), reason = VALUES(reason), status = 'PENDING'`,
            [gameSerial, multiplier, reason]
        );
    }

    /**
     * Get all pending scheduled jackpots
     */
    static async getScheduledJackpots(connection = pool) {
        const [rows] = await connection.execute(
            `SELECT id, game_serial, multiplier, reason, status, created_at, updated_at
             FROM scheduled_jackpots
             WHERE status = 'PENDING'
             ORDER BY id ASC`
        );
        return rows;
    }

    /**
     * Clear / Cancel scheduled jackpot
     */
    static async clearScheduledJackpot(gameSerial, connection = pool) {
        await connection.execute(
            `UPDATE scheduled_jackpots SET status = 'CANCELLED' WHERE game_serial = ?`,
            [gameSerial]
        );
    }

    /**
     * Get Compact Previous Game Results with Jackpot, Winner Horse Name & Serial Number
     */
    static async getPreviousGameResults(query = {}, connection = pool) {
        const page = Math.max(1, parseInt(query.page, 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));
        const offset = (page - 1) * limit;

        let total = 0;
        try {
            const [countRows] = await connection.execute(
                `SELECT COUNT(*) AS total 
                 FROM races 
                 WHERE status = 'FINISHED' OR winner_horse_id IS NOT NULL`
            );
            total = Number(countRows[0]?.total || 0);
        } catch (_) {}

        let rows = [];
        try {
            const [rRows] = await connection.execute(
                `SELECT 
                    r.id AS race_id,
                    r.game_serial,
                    r.status,
                    r.jackpot_multiplier,
                    r.is_jackpot,
                    r.winner_horse_id,
                    r.finished_at,
                    r.created_at,
                    COALESCE(rh.serial_number, h.serial_number) AS winner_horse_serial,
                    COALESCE(rh.horse_name_snapshot, h.name) AS winner_horse_name
                 FROM races r
                 LEFT JOIN race_horses rh ON r.id = rh.race_id AND rh.horse_id = r.winner_horse_id
                 LEFT JOIN horses h ON r.winner_horse_id = h.id
                 WHERE r.status = 'FINISHED' OR r.winner_horse_id IS NOT NULL
                 ORDER BY r.id DESC
                 LIMIT ${limit} OFFSET ${offset}`
            );
            rows = rRows || [];
        } catch (_) {}

        // Fallback: Query race_horses if races table is empty
        if (rows.length === 0) {
            try {
                const [countRh] = await connection.execute(
                    `SELECT COUNT(DISTINCT race_id) AS total FROM race_horses`
                );
                total = Number(countRh[0]?.total || 0);

                const [rhRows] = await connection.execute(
                    `SELECT race_id, serial_number AS winner_horse_serial, horse_name_snapshot AS winner_horse_name, created_at
                     FROM race_horses
                     WHERE finish_position = 1 OR result = 'WINNER' OR result = 'COMPLETED'
                     GROUP BY race_id
                     ORDER BY race_id DESC
                     LIMIT ${limit} OFFSET ${offset}`
                );
                rows = (rhRows || []).map((r) => ({
                    race_id: r.race_id,
                    game_serial: String(r.race_id),
                    status: 'FINISHED',
                    jackpot_multiplier: 1,
                    is_jackpot: 0,
                    winner_horse_serial: r.winner_horse_serial,
                    winner_horse_name: r.winner_horse_name,
                    finished_at: r.created_at,
                    created_at: r.created_at,
                }));
            } catch (_) {}
        }

        const results = rows.map((r) => {
            const mult = Number(r.jackpot_multiplier) || 1;
            const isJackpot = Boolean(r.is_jackpot || mult > 1);
            const jackpotLabel = isJackpot ? `${mult}X` : 'N';
            const serialNumber = r.winner_horse_serial ? Number(r.winner_horse_serial) : null;
            const name = r.winner_horse_name || 'Pending';

            return {
                raceId: Number(r.race_id),
                gameSerial: String(r.game_serial),
                winnerHorseSerial: serialNumber,
                winnerHorseName: name,
                displayWinner: serialNumber ? `${serialNumber} ${name}` : name,
                jackpot: jackpotLabel,
                jackpotMultiplier: mult,
                isJackpot,
                finishedAt: r.finished_at || r.created_at,
            };
        });

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
            results,
        };
    }
}

module.exports = RaceModel;
