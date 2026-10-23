const { pool } = require('../config/database');

class BetModel {
    static async create({
        userId,
        gameId = null,
        gameCode = null,
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
        const [result] = await db.execute(
            `INSERT INTO bets (
                user_id, game_id, game_code, race_id, game_serial,
                horse_id, horse_serial, horse_name, amount,
                odds, potential_payout, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                gameId,
                gameCode,
                raceId,
                gameSerial,
                horseId,
                horseSerial,
                horseName,
                amount,
                odds,
                potentialPayout,
                status,
            ]
        );
        return this.findById(result.insertId, db);
    }

    static async findById(id, db = pool) {
        const [rows] = await db.execute(
            `SELECT id, user_id, game_id, game_code, race_id, game_serial,
                    horse_id, horse_serial, horse_name, amount, odds,
                    potential_payout, status, payout_amount, created_at, updated_at
             FROM bets WHERE id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    }

    static async findByRaceAndUser(raceId, userId, db = pool) {
        const [rows] = await db.execute(
            `SELECT id, user_id, game_id, game_code, race_id, game_serial,
                    horse_id, horse_serial, horse_name, amount, odds,
                    potential_payout, status, payout_amount, created_at, updated_at
             FROM bets
             WHERE race_id = ? AND user_id = ?
             ORDER BY id ASC`,
            [raceId, userId]
        );
        return rows;
    }

    static async findByRaceId(raceId, db = pool) {
        const [rows] = await db.execute(
            `SELECT id, user_id, game_id, game_code, race_id, game_serial,
                    horse_id, horse_serial, horse_name, amount, odds,
                    potential_payout, status, payout_amount, created_at, updated_at
             FROM bets
             WHERE race_id = ?
             ORDER BY id ASC`,
            [raceId]
        );
        return rows;
    }

    static async findByUserId(userId, options = {}, db = pool) {
        const { limit = 20, offset = 0, status, raceId } = options;
        const params = [userId];
        const whereClauses = ['user_id = ?'];

        if (status) {
            whereClauses.push('status = ?');
            params.push(status);
        }
        if (raceId) {
            whereClauses.push('race_id = ?');
            params.push(raceId);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
        params.push(Number(limit), Number(offset));

        const [rows] = await db.query(
            `SELECT id, user_id, game_id, game_code, race_id, game_serial,
                    horse_id, horse_serial, horse_name, amount, odds,
                    potential_payout, status, payout_amount, created_at, updated_at
             FROM bets ${whereSql}
             ORDER BY created_at DESC, id DESC
             LIMIT ? OFFSET ?`,
            params
        );
        return rows;
    }

    static async countByUserId(userId, options = {}, db = pool) {
        const { status, raceId } = options;
        const params = [userId];
        const whereClauses = ['user_id = ?'];

        if (status) {
            whereClauses.push('status = ?');
            params.push(status);
        }
        if (raceId) {
            whereClauses.push('race_id = ?');
            params.push(raceId);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        const [rows] = await db.query(
            `SELECT COUNT(*) AS total FROM bets ${whereSql}`,
            params
        );
        return Number(rows[0]?.total || 0);
    }

    static async getLiveBetLedger(options = {}, db = pool) {
        const { limit = 50, offset = 0, raceId, gameSerial, status } = options;
        const params = [];
        const whereClauses = [];

        if (raceId) {
            whereClauses.push('b.race_id = ?');
            params.push(raceId);
        }
        if (gameSerial) {
            whereClauses.push('b.game_serial = ?');
            params.push(gameSerial);
        }
        if (status) {
            whereClauses.push('b.status = ?');
            params.push(status);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        params.push(Number(limit), Number(offset));

        const [rows] = await db.query(
            `SELECT b.id, b.user_id, u.username, u.name AS user_name, u.role AS user_role,
                    b.game_id, b.game_code, b.race_id, b.game_serial,
                    b.horse_id, b.horse_serial, b.horse_name, h.image_url AS horse_image_url,
                    b.amount, b.odds, b.potential_payout, b.status, b.payout_amount,
                    b.created_at, b.updated_at
             FROM bets b
             LEFT JOIN users u ON b.user_id = u.id
             LEFT JOIN horses h ON b.horse_id = h.id
             ${whereSql}
             ORDER BY b.id DESC
             LIMIT ? OFFSET ?`,
            params
        );
        return rows;
    }

    static async updateStatus(id, { status, payoutAmount = 0 }, db = pool) {
        await db.execute(
            'UPDATE bets SET status = ?, payout_amount = ? WHERE id = ?',
            [status, payoutAmount, id]
        );
        return this.findById(id, db);
    }

    static async updateAmount(id, newAmount, potentialPayout, db = pool) {
        await db.execute(
            'UPDATE bets SET amount = ?, potential_payout = ? WHERE id = ?',
            [newAmount, potentialPayout, id]
        );
        return this.findById(id, db);
    }

    static async deleteById(id, db = pool) {
        const [result] = await db.execute('DELETE FROM bets WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    static async findPendingByRaceAndUser(raceId, userId, db = pool) {
        const [rows] = await db.execute(
            `SELECT id, user_id, game_id, game_code, race_id, game_serial,
                    horse_id, horse_serial, horse_name, amount, odds,
                    potential_payout, status, payout_amount, created_at, updated_at
             FROM bets
             WHERE race_id = ? AND user_id = ? AND status = 'PENDING'
             ORDER BY id ASC`,
            [raceId, userId]
        );
        return rows;
    }
}

module.exports = BetModel;

