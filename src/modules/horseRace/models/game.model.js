const { pool } = require('../config/database');

class GameModel {
    /**
     * Generate concurrency-safe unique user game_code: GC20260921001, GC20260921002...
     */
    static async generateGameCode(connection) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePrefix = `GC${year}${month}${day}`;

        const [rows] = await connection.execute(
            'SELECT game_code FROM games WHERE game_code LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE',
            [`${datePrefix}%`]
        );

        let nextSequence = 1;
        if (rows.length > 0) {
            const lastCode = String(rows[0].game_code);
            const suffix = lastCode.startsWith(datePrefix)
                ? lastCode.slice(datePrefix.length)
                : lastCode.replace(/^[^\d]+/, '');
            const parsed = parseInt(suffix, 10);
            if (!isNaN(parsed)) {
                nextSequence = parsed + 1;
            }
        }

        const formattedSeq = String(nextSequence).padStart(3, '0');
        return `${datePrefix}${formattedSeq}`;
    }

    /**
     * Find a user's permanent game by user_id
     */
    static async findByUserId(userId, connection = pool) {
        try {
            const [rows] = await connection.execute(
                'SELECT id, user_id, game_code, status, created_at, updated_at FROM games WHERE user_id = ? LIMIT 1',
                [userId]
            );
            return rows[0] || null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Find game by ID
     */
    static async findById(id, connection = pool) {
        try {
            const [rows] = await connection.execute(
                'SELECT id, user_id, game_code, status, created_at, updated_at FROM games WHERE id = ? LIMIT 1',
                [id]
            );
            return rows[0] || null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Find game by game_code
     */
    static async findByGameCode(gameCode, connection = pool) {
        const [rows] = await connection.execute(
            'SELECT id, user_id, game_code, status, created_at, updated_at FROM games WHERE game_code = ? LIMIT 1',
            [gameCode]
        );
        return rows[0] || null;
    }

    /**
     * Concurrency-safe Get or Create Game for a specific user
     * Core Rule: ONE USER = ONE GAME
     */
    static async getOrCreateUserGame(userId) {
        // Fast path check without lock
        const existing = await this.findByUserId(userId);
        if (existing) {
            return existing;
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Row lock check within transaction
            const [lockedRows] = await connection.execute(
                'SELECT id, user_id, game_code, status, created_at, updated_at FROM games WHERE user_id = ? FOR UPDATE',
                [userId]
            );

            if (lockedRows.length > 0) {
                await connection.commit();
                return lockedRows[0];
            }

            // Generate unique game code (e.g. GC20260921001)
            const gameCode = await this.generateGameCode(connection);

            const [insertResult] = await connection.execute(
                'INSERT INTO games (user_id, game_code, status) VALUES (?, ?, ?)',
                [userId, gameCode, 'ACTIVE']
            );

            await connection.commit();

            return {
                id: insertResult.insertId,
                user_id: userId,
                game_code: gameCode,
                status: 'ACTIVE',
                created_at: new Date(),
                updated_at: new Date(),
            };
        } catch (error) {
            await connection.rollback();

            // Handle potential duplicate key race condition gracefully
            if (error.code === 'ER_DUP_ENTRY') {
                const retryGame = await this.findByUserId(userId);
                if (retryGame) return retryGame;
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Find all users with their permanent game codes and wallet info
     */
    static async findAllUsersWithGameCodes(options = {}, db = pool) {
        const { limit = 50, offset = 0, search } = options;
        const params = [];
        let searchSql = '';

        if (search) {
            searchSql = 'WHERE u.username LIKE ? OR u.name LIKE ? OR g.game_code LIKE ?';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        params.push(Number(limit), Number(offset));

        const [rows] = await db.query(
            `SELECT u.id AS user_id, u.username, u.name, u.email, u.role,
                    g.id AS game_id, g.game_code, g.status AS game_status,
                    w.id AS wallet_id, COALESCE(w.balance, 0) AS wallet_balance, w.currency AS wallet_currency,
                    u.created_at AS user_created_at
             FROM users u
             LEFT JOIN games g ON u.id = g.user_id
             LEFT JOIN wallets w ON u.id = w.user_id
             ${searchSql}
             ORDER BY u.id ASC
             LIMIT ? OFFSET ?`,
            params
        );
        return rows;
    }
}

module.exports = GameModel;
