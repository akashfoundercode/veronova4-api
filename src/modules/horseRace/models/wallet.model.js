const { pool } = require('../config/database');

class WalletModel {
    static async findByUserId(userId, db = pool) {
        const [rows] = await db.execute(
            'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE user_id = ? LIMIT 1',
            [userId]
        );
        return rows[0] || null;
    }

    static async findById(walletId, db = pool) {
        const [rows] = await db.execute(
            'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE id = ? LIMIT 1',
            [walletId]
        );
        return rows[0] || null;
    }

    static async findByUserIdForUpdate(userId, db) {
        const [rows] = await db.execute(
            'SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE user_id = ? LIMIT 1 FOR UPDATE',
            [userId]
        );
        return rows[0] || null;
    }

    static async create(userId, balance = '0.0000', currency = 'INR', status = 'active', db = pool) {
        const [result] = await db.execute(
            'INSERT INTO wallets (user_id, balance, currency, status) VALUES (?, ?, ?, ?)',
            [userId, balance, currency, status]
        );
        return this.findById(result.insertId, db);
    }

    static async updateBalance(walletId, newBalance, db = pool) {
        await db.execute(
            'UPDATE wallets SET balance = ? WHERE id = ?',
            [newBalance, walletId]
        );
    }

    static async createTransaction(txData, db = pool) {
        const {
            walletId,
            userId,
            type,
            category = 'manual',
            amount,
            balanceBefore,
            balanceAfter,
            referenceId = null,
            referenceType = null,
            description = null,
            status = 'completed',
        } = txData;

        const [result] = await db.execute(
            `INSERT INTO wallet_transactions 
            (wallet_id, user_id, type, category, amount, balance_before, balance_after, reference_id, reference_type, description, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                walletId,
                userId,
                type,
                category,
                amount,
                balanceBefore,
                balanceAfter,
                referenceId,
                referenceType,
                description,
                status,
            ]
        );

        return result.insertId;
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

