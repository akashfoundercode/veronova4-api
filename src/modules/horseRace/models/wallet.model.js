const { pool } = require('../config/database');

class WalletModel {
    static async findByUserId(userId, db = pool) {
        try {
            const [rows] = await db.execute(
                'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE user_id = ? LIMIT 1',
                [userId]
            );
            if (rows && rows[0]) return rows[0];
        } catch (_) {}

        // Fallback: Check users table for balance
        try {
            const [userRows] = await db.execute(
                'SELECT id, wallet, winning_wallet FROM users WHERE id = ? LIMIT 1',
                [userId]
            );
            if (userRows && userRows[0]) {
                const bal = Number(userRows[0].wallet || 0);
                return {
                    id: userRows[0].id,
                    user_id: userRows[0].id,
                    balance: bal,
                    currency: 'INR',
                    status: 'active',
                };
            }
        } catch (_) {}

        return null;
    }

    static async findById(walletId, db = pool) {
        try {
            const [rows] = await db.execute(
                'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE id = ? LIMIT 1',
                [walletId]
            );
            if (rows && rows[0]) return rows[0];
        } catch (_) {}

        try {
            const [userRows] = await db.execute(
                'SELECT id, wallet FROM users WHERE id = ? LIMIT 1',
                [walletId]
            );
            if (userRows && userRows[0]) {
                return {
                    id: userRows[0].id,
                    user_id: userRows[0].id,
                    balance: Number(userRows[0].wallet || 0),
                    currency: 'INR',
                    status: 'active',
                };
            }
        } catch (_) {}

        return null;
    }

    static async findByUserIdForUpdate(userId, db) {
        try {
            const [rows] = await db.execute(
                'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE user_id = ? LIMIT 1 FOR UPDATE',
                [userId]
            );
            if (rows && rows[0]) return rows[0];
        } catch (_) {}

        try {
            const [userRows] = await db.execute(
                'SELECT id, wallet, winning_wallet FROM users WHERE id = ? FOR UPDATE',
                [userId]
            );
            if (userRows && userRows[0]) {
                return {
                    id: userRows[0].id,
                    user_id: userRows[0].id,
                    balance: Number(userRows[0].wallet || 0),
                    currency: 'INR',
                    status: 'active',
                };
            }
        } catch (_) {}

        return null;
    }

    static async create(userId, balance = '0.0000', currency = 'INR', status = 'active', db = pool) {
        try {
            const [result] = await db.execute(
                'INSERT INTO wallets (user_id, balance, currency, status) VALUES (?, ?, ?, ?)',
                [userId, balance, currency, status]
            );
            return this.findById(result.insertId, db);
        } catch (_) {}

        return {
            id: userId,
            user_id: userId,
            balance: Number(balance),
            currency,
            status,
        };
    }

    static async updateBalance(walletId, newBalance, db = pool) {
        try {
            await db.execute(
                'UPDATE wallets SET balance = ? WHERE id = ?',
                [newBalance, walletId]
            );
        } catch (_) {}

        try {
            await db.execute(
                'UPDATE users SET wallet = ? WHERE id = ?',
                [newBalance, walletId]
            );
        } catch (_) {}
    }

    static async createTransaction(txData, db = pool) {
        try {
            await db.execute(
                `INSERT INTO wallet_transactions (
                    wallet_id, user_id, type, category, amount, balance_before, balance_after,
                    reference_id, reference_type, description, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    txData.walletId || txData.userId,
                    txData.userId,
                    txData.type,
                    txData.category || 'manual',
                    txData.amount,
                    txData.balanceBefore,
                    txData.balanceAfter,
                    txData.referenceId,
                    txData.referenceType,
                    txData.description,
                    txData.status || 'completed',
                ]
            );
        } catch (_) {}
    }

    static async getTransactionsByUserId(userId, options = {}, db = pool) {
        const {
            limit = 20,
            offset = 0,
            type,
            category,
            startDate,
            endDate,
        } = options;

        const params = [userId];
        const whereClauses = ['user_id = ?'];

        if (type && (type === 'credit' || type === 'debit')) {
            whereClauses.push('type = ?');
            params.push(type);
        }

        if (category && typeof category === 'string') {
            whereClauses.push('category = ?');
            params.push(category);
        }

        if (startDate) {
            whereClauses.push('created_at >= ?');
            params.push(new Date(startDate));
        }

        if (endDate) {
            whereClauses.push('created_at <= ?');
            params.push(new Date(endDate));
        }

        const whereSql = whereClauses.join(' AND ');
        const query = `
            SELECT id, wallet_id, user_id, type, category, amount, balance_before, balance_after, reference_id, reference_type, description, status, created_at 
            FROM wallet_transactions 
            WHERE ${whereSql} 
            ORDER BY id DESC 
            LIMIT ? OFFSET ?
        `;

        params.push(Number(limit), Number(offset));
        const [rows] = await db.query(query, params);
        return rows;
    }

    static async countTransactionsByUserId(userId, options = {}, db = pool) {
        const { type, category, startDate, endDate } = options;

        const params = [userId];
        const whereClauses = ['user_id = ?'];

        if (type && (type === 'credit' || type === 'debit')) {
            whereClauses.push('type = ?');
            params.push(type);
        }

        if (category && typeof category === 'string') {
            whereClauses.push('category = ?');
            params.push(category);
        }

        if (startDate) {
            whereClauses.push('created_at >= ?');
            params.push(new Date(startDate));
        }

        if (endDate) {
            whereClauses.push('created_at <= ?');
            params.push(new Date(endDate));
        }

        const whereSql = whereClauses.join(' AND ');
        const query = `SELECT COUNT(*) AS total FROM wallet_transactions WHERE ${whereSql}`;

        const [rows] = await db.query(query, params);
        return rows[0] ? rows[0].total : 0;
    }
}

module.exports = WalletModel;

