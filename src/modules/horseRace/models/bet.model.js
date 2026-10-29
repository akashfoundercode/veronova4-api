const { pool } = require('../config/database');

class BetModel {
    static formatRow(r) {
        if (!r) return null;
        return {
            id: r.id,
            user_id: r.user_id || r.userid,
            userId: r.user_id || r.userid,
            game_id: r.game_id,
            game_code: r.game_code || 'HORSE_RACE',
            race_id: r.race_id || r.games_no,
            raceId: r.race_id || r.games_no,
            game_serial: r.game_serial || r.games_no,
            gameSerial: r.game_serial || r.games_no,
            horse_id: r.horse_id || Number(r.number),
            horseId: r.horse_id || Number(r.number),
            horse_serial: r.horse_serial || Number(r.number),
            horseSerial: r.horse_serial || Number(r.number),
            horse_name: r.horse_name || `Horse #${r.number || ''}`,
            horseName: r.horse_name || `Horse #${r.number || ''}`,
            amount: Number(r.amount),
            odds: Number(r.odds || 10.0),
            potential_payout: Number(r.potential_payout || (r.amount * 10)),
            payout_amount: Number(r.payout_amount || r.win_amount || 0),
            status: (r.status === 0 || r.status === '0' || r.status === 'PENDING') ? 'PENDING' : String(r.status),
            created_at: r.created_at,
            updated_at: r.updated_at,
        };
    }

    static async create({
        userId,
        gameId = 11,
        gameCode = 'HORSE_RACE',
        raceId,
        gameSerial,
        horseId,
        horseSerial,
        horseName,
        amount,
        odds = 10.0,
        potentialPayout = 0,
        status = 'PENDING',
    }, db = pool) {
        const orderId = `${Date.now()}${Math.floor(10000 + Math.random() * 90000)}`;
        const numericAmount = Number(amount);
        const serialStr = String(horseSerial || horseId);
        const periodStr = String(gameSerial || raceId);

        let createdId = null;

        // 1. Try with all horse-race extended columns
        try {
            const [result] = await db.execute(
                `INSERT INTO bets (
                    user_id, userid, game_id, game_code, race_id, game_serial,
                    games_no, horse_id, horse_serial, number, horse_name, amount,
                    trade_amount, order_id, odds, potential_payout, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    userId,
                    gameId || 11,
                    gameCode,
                    raceId,
                    periodStr,
                    periodStr,
                    horseId,
                    horseSerial,
                    serialStr,
                    horseName,
                    numericAmount,
                    numericAmount,
                    orderId,
                    odds,
                    potentialPayout,
                    status === 'PENDING' ? 0 : status,
                ]
            );
            createdId = result?.insertId;
        } catch (_) {
            // 2. Try with core horse columns
            try {
                const [result] = await db.execute(
                    `INSERT INTO bets (
                        user_id, game_id, race_id, game_serial,
                        horse_id, horse_serial, number, amount,
                        odds, potential_payout, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        gameId || 11,
                        raceId,
                        periodStr,
                        horseId,
                        horseSerial,
                        serialStr,
                        numericAmount,
                        odds,
                        potentialPayout,
                        status,
                    ]
                );
                createdId = result?.insertId;
            } catch (_) {
                // 3. Fallback: Standard Veronova SQL dump schema
                try {
                    const [fallbackResult] = await db.execute(
                        `INSERT INTO bets (
                            userid, amount, trade_amount, number, games_no, game_id, order_id, status, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                        [
                            Number(userId),
                            numericAmount,
                            numericAmount,
                            serialStr,
                            periodStr,
                            Number(gameId) || 11,
                            orderId,
                        ]
                    );
                    createdId = fallbackResult?.insertId;
                } catch (_) {}
            }
        }

        if (createdId && createdId > 0) {
            try {
                const found = await this.findById(createdId, db);
                if (found) return found;
            } catch (_) {}
        }

        return {
            id: Number(createdId || Date.now()),
            user_id: Number(userId),
            userId: Number(userId),
            game_id: Number(gameId || 11),
            gameId: Number(gameId || 11),
            game_code: gameCode || 'HORSE_RACE',
            gameCode: gameCode || 'HORSE_RACE',
            race_id: Number(raceId),
            raceId: Number(raceId),
            game_serial: periodStr,
            gameSerial: periodStr,
            horse_id: Number(horseId),
            horseId: Number(horseId),
            horse_serial: Number(horseSerial || horseId),
            horseSerial: Number(horseSerial || horseId),
            horse_name: horseName || `Horse #${serialStr}`,
            horseName: horseName || `Horse #${serialStr}`,
            amount: numericAmount,
            odds: Number(odds || 10),
            potential_payout: Number(potentialPayout || (numericAmount * 10)),
            payout_amount: 0,
            status: 'PENDING',
            created_at: new Date(),
            updated_at: new Date(),
        };
    }

    static async findById(id, db = pool) {
        try {
            const [rows] = await db.execute(
                `SELECT * FROM bets WHERE id = ? LIMIT 1`,
                [id]
            );
            return this.formatRow(rows[0]);
        } catch (_) {}
        return null;
    }

    static async findByRaceAndUser(raceId, userId, db = pool) {
        try {
            const [rows] = await db.execute(
                `SELECT * FROM bets
                 WHERE (race_id = ? OR games_no = ?) AND (user_id = ? OR userid = ?)
                 ORDER BY id ASC`,
                [raceId, String(raceId), userId, userId]
            );
            return (rows || []).map(r => this.formatRow(r));
        } catch (_) {
            try {
                const [rows] = await db.execute(
                    `SELECT * FROM bets
                     WHERE games_no = ? AND userid = ?
                     ORDER BY id ASC`,
                    [String(raceId), userId]
                );
                return (rows || []).map(r => this.formatRow(r));
            } catch (_) {
                return [];
            }
        }
    }

    static async findByRaceId(raceId, db = pool) {
        try {
            const [rows] = await db.execute(
                `SELECT * FROM bets
                 WHERE race_id = ? OR games_no = ?
                 ORDER BY id ASC`,
                [raceId, String(raceId)]
            );
            return (rows || []).map(r => this.formatRow(r));
        } catch (_) {
            try {
                const [rows] = await db.execute(
                    `SELECT * FROM bets
                     WHERE games_no = ?
                     ORDER BY id ASC`,
                    [String(raceId)]
                );
                return (rows || []).map(r => this.formatRow(r));
            } catch (_) {
                return [];
            }
        }
    }

    static async findByUserId(userId, options = {}, db = pool) {
        const { limit = 20, offset = 0, status, raceId } = options;
        const params = [userId, userId];
        const whereClauses = ['(user_id = ? OR userid = ?)'];

        if (status) {
            whereClauses.push('(status = ? OR status = ?)');
            params.push(status, status === 'PENDING' ? 0 : status);
        }
        if (raceId) {
            whereClauses.push('(race_id = ? OR games_no = ?)');
            params.push(raceId, String(raceId));
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
        params.push(Number(limit), Number(offset));

        try {
            const [rows] = await db.query(
                `SELECT * FROM bets ${whereSql}
                 ORDER BY created_at DESC, id DESC
                 LIMIT ? OFFSET ?`,
                params
            );
            return (rows || []).map(r => this.formatRow(r));
        } catch (_) {
            return [];
        }
    }

    static async countByUserId(userId, options = {}, db = pool) {
        const { status, raceId } = options;
        const params = [userId, userId];
        const whereClauses = ['(user_id = ? OR userid = ?)'];

        if (status) {
            whereClauses.push('(status = ? OR status = ?)');
            params.push(status, status === 'PENDING' ? 0 : status);
        }
        if (raceId) {
            whereClauses.push('(race_id = ? OR games_no = ?)');
            params.push(raceId, String(raceId));
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        try {
            const [rows] = await db.query(
                `SELECT COUNT(*) AS total FROM bets ${whereSql}`,
                params
            );
            return Number(rows[0]?.total || 0);
        } catch (_) {
            return 0;
        }
    }

    static async getLiveBetLedger(options = {}, db = pool) {
        const { limit = 50, offset = 0, raceId, gameSerial, status } = options;
        const params = [];
        const whereClauses = [];

        if (raceId) {
            whereClauses.push('(b.race_id = ? OR b.games_no = ?)');
            params.push(raceId, String(raceId));
        }
        if (gameSerial) {
            whereClauses.push('(b.game_serial = ? OR b.games_no = ?)');
            params.push(gameSerial, String(gameSerial));
        }
        if (status) {
            whereClauses.push('(b.status = ? OR b.status = ?)');
            params.push(status, status === 'PENDING' ? 0 : status);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        params.push(Number(limit), Number(offset));

        try {
            const [rows] = await db.query(
                `SELECT b.*, u.username, u.name AS user_name, u.role AS user_role
                 FROM bets b
                 LEFT JOIN users u ON (b.user_id = u.id OR b.userid = u.id)
                 ${whereSql}
                 ORDER BY b.id DESC
                 LIMIT ? OFFSET ?`,
                params
            );
            return (rows || []).map(r => ({
                ...this.formatRow(r),
                username: r.username,
                userName: r.user_name,
                userRole: r.user_role,
            }));
        } catch (_) {
            return [];
        }
    }

    static async updateStatus(id, { status, payoutAmount = 0 }, db = pool) {
        try {
            await db.execute(
                'UPDATE bets SET status = ?, payout_amount = ?, win_amount = ? WHERE id = ?',
                [status, payoutAmount, payoutAmount, id]
            );
        } catch (_) {
            try {
                await db.execute(
                    'UPDATE bets SET status = ?, win_amount = ? WHERE id = ?',
                    [status === 'COMPLETED' ? 1 : status, payoutAmount, id]
                );
            } catch (_) {}
        }
        return this.findById(id, db);
    }

    static async updateAmount(id, newAmount, potentialPayout, db = pool) {
        try {
            await db.execute(
                'UPDATE bets SET amount = ?, trade_amount = ?, potential_payout = ? WHERE id = ?',
                [newAmount, newAmount, potentialPayout, id]
            );
        } catch (_) {
            try {
                await db.execute(
                    'UPDATE bets SET amount = ?, trade_amount = ? WHERE id = ?',
                    [newAmount, newAmount, id]
                );
            } catch (_) {}
        }
        return this.findById(id, db);
    }

    static async deleteById(id, db = pool) {
        try {
            const [result] = await db.execute('DELETE FROM bets WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (_) {
            return false;
        }
    }

    static async findPendingByRaceAndUser(raceId, userId, db = pool) {
        return this.findByRaceAndUser(raceId, userId, db);
    }
}

module.exports = BetModel;

