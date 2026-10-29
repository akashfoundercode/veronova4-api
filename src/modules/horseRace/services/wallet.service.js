const { pool } = require('../config/database');
const WalletModel = require('../models/wallet.model');

class WalletService {
    static formatAmount(amount) {
        const num = Number(amount);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    }

    static formatWallet(wallet) {
        if (!wallet) return null;
        return {
            walletId: Number(wallet.id),
            userId: Number(wallet.user_id),
            balance: Number(Number(wallet.balance).toFixed(2)),
            rawBalance: wallet.balance.toString(),
            currency: wallet.currency,
            status: wallet.status,
            createdAt: wallet.created_at,
            updatedAt: wallet.updated_at,
        };
    }

    static formatTransaction(tx) {
        if (!tx) return null;
        const amountNum = Number(Number(tx.amount).toFixed(2));
        const beforeNum = Number(Number(tx.balance_before).toFixed(2));
        const afterNum = Number(Number(tx.balance_after).toFixed(2));
        const isCredit = tx.type === 'credit';
        return {
            transactionId: Number(tx.id),
            walletId: Number(tx.wallet_id),
            userId: Number(tx.user_id),
            type: tx.type,
            category: tx.category,
            amount: amountNum,
            displayAmount: isCredit ? `+₹${amountNum.toFixed(2)}` : `-₹${amountNum.toFixed(2)}`,
            balanceBefore: beforeNum,
            displayBalanceBefore: `₹${beforeNum.toFixed(2)}`,
            balanceAfter: afterNum,
            displayBalanceAfter: `₹${afterNum.toFixed(2)}`,
            referenceId: tx.reference_id,
            referenceType: tx.reference_type,
            description: tx.description,
            status: tx.status,
            createdAt: tx.created_at,
        };
    }

    // Get wallet or auto-create one if missing, always synced with shared users.wallet
    static async getOrCreateWallet(userId, db = pool) {
        let userBalance = null;
        try {
            const [users] = await db.execute('SELECT wallet FROM users WHERE id = ? LIMIT 1', [userId]);
            if (users[0] && users[0].wallet !== undefined && users[0].wallet !== null) {
                userBalance = Number(users[0].wallet);
            }
        } catch (_) {}

        let wallet = await WalletModel.findByUserId(userId, db);
        if (!wallet) {
            try {
                const initialBalance = userBalance !== null ? userBalance.toFixed(4) : '0.0000';
                wallet = await WalletModel.create(userId, initialBalance, 'INR', 'active', db);
            } catch (err) {
                // In case of race condition / duplicate entry, re-fetch
                if (err.code === 'ER_DUP_ENTRY') {
                    wallet = await WalletModel.findByUserId(userId, db);
                } else {
                    throw err;
                }
            }
        }

        // Keep wallets table synced with shared users.wallet across all games
        if (wallet && userBalance !== null && Number(wallet.balance) !== userBalance) {
            try {
                await WalletModel.updateBalance(wallet.id, userBalance.toFixed(4), db);
                wallet.balance = userBalance.toFixed(4);
            } catch (_) {}
        }

        return wallet;
    }

    // Get user lifetime betting & win statistics
    static async getUserStats(userId, db = pool) {
        try {
            const [rows] = await db.execute(
                `SELECT 
                    COALESCE(SUM(CASE WHEN status = 'WON' THEN payout_amount ELSE 0 END), 0) AS totalWon,
                    COALESCE(SUM(amount), 0) AS totalInvested,
                    COUNT(id) AS totalBets,
                    COUNT(CASE WHEN status = 'WON' THEN 1 END) AS totalWins
                 FROM bets
                 WHERE user_id = ?`,
                [userId]
            );
            const row = rows[0] || {};
            const totalWon = Number(Number(row.totalWon || 0).toFixed(2));
            const totalInvested = Number(Number(row.totalInvested || 0).toFixed(2));
            const netProfitLoss = Number((totalWon - totalInvested).toFixed(2));
            return {
                totalWon,
                displayTotalWon: `₹${totalWon.toFixed(2)}`,
                totalInvested,
                displayTotalInvested: `₹${totalInvested.toFixed(2)}`,
                netProfitLoss,
                displayNetProfitLoss: netProfitLoss >= 0 ? `+₹${netProfitLoss.toFixed(2)}` : `-₹${Math.abs(netProfitLoss).toFixed(2)}`,
                totalBets: Number(row.totalBets || 0),
                totalWins: Number(row.totalWins || 0),
            };
        } catch (err) {
            return {
                totalWon: 0,
                displayTotalWon: '₹0.00',
                totalInvested: 0,
                displayTotalInvested: '₹0.00',
                netProfitLoss: 0,
                displayNetProfitLoss: '₹0.00',
                totalBets: 0,
                totalWins: 0,
            };
        }
    }

    // Get authenticated user's wallet with lifetime stats
    static async getWalletByUserId(userId, db = pool) {
        const wallet = await this.getOrCreateWallet(userId, db);
        const stats = await this.getUserStats(userId, db);
        const formatted = this.formatWallet(wallet);
        return {
            ...formatted,
            coins: formatted.balance,
            ...stats,
        };
    }

    // Get paginated transaction history for a user
    static async getTransactions(userId, options = {}) {
        await this.getOrCreateWallet(userId);

        const page = Math.max(1, parseInt(options.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
        const offset = (page - 1) * limit;

        const filterOptions = {
            limit,
            offset,
            type: options.type,
            category: options.category,
            startDate: options.startDate,
            endDate: options.endDate,
        };

        const [rows, total] = await Promise.all([
            WalletModel.getTransactionsByUserId(userId, filterOptions),
            WalletModel.countTransactionsByUserId(userId, filterOptions),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
            transactions: rows.map((r) => this.formatTransaction(r)),
        };
    }

    // Atomic Balance Change (Credit or Debit) inside a DB transaction
    static async changeBalance({
        userId,
        type, // 'credit' | 'debit'
        amount,
        category = 'manual',
        referenceId = null,
        referenceType = null,
        description = null,
    }) {
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            const error = new Error('Amount must be a positive number');
            error.statusCode = 400;
            throw error;
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Lock the user row in the shared `users` table for update to ensure atomic cross-game balance
            let userBalance = null;
            try {
                const [userRows] = await connection.execute(
                    'SELECT id, wallet, winning_wallet FROM users WHERE id = ? FOR UPDATE',
                    [userId]
                );
                if (userRows && userRows.length > 0 && userRows[0].wallet !== undefined && userRows[0].wallet !== null) {
                    userBalance = Number(userRows[0].wallet);
                }
            } catch (_) {}

            // Lock the wallet row for update
            let wallet = await WalletModel.findByUserIdForUpdate(userId, connection);
            if (!wallet) {
                // Auto create inside transaction if not present
                const initialBal = userBalance !== null ? userBalance.toFixed(4) : '0.0000';
                await WalletModel.create(userId, initialBal, 'INR', 'active', connection);
                wallet = await WalletModel.findByUserIdForUpdate(userId, connection);
            }

            if (wallet && wallet.status !== 'active') {
                const error = new Error(`Wallet is ${wallet.status}`);
                error.statusCode = 403;
                throw error;
            }

            // The authoritative balance is always the shared users.wallet
            const currentBalance = userBalance !== null ? userBalance : Number(wallet?.balance || 0);
            let newBalance;

            if (type === 'credit') {
                newBalance = currentBalance + numericAmount;
            } else if (type === 'debit') {
                if (currentBalance < numericAmount) {
                    const error = new Error('Insufficient wallet balance');
                    error.statusCode = 400;
                    throw error;
                }
                newBalance = currentBalance - numericAmount;
            } else {
                const error = new Error('Invalid transaction type. Must be credit or debit');
                error.statusCode = 400;
                throw error;
            }

            const exactBalanceBefore = currentBalance.toFixed(4);
            const exactBalanceAfter = newBalance.toFixed(4);
            const exactAmount = numericAmount.toFixed(4);

            // Synchronize balance atomically across users and wallets tables
            try {
                if (type === 'credit' && (category === 'bet_win' || category === 'win' || category === 'payout')) {
                    await connection.execute(
                        'UPDATE users SET wallet = ?, winning_wallet = winning_wallet + ? WHERE id = ?',
                        [exactBalanceAfter, numericAmount, userId]
                    );
                } else {
                    await connection.execute('UPDATE users SET wallet = ? WHERE id = ?', [exactBalanceAfter, userId]);
                }
            } catch (_) {}

            if (wallet) {
                await WalletModel.updateBalance(wallet.id, exactBalanceAfter, connection);
            }

            // Record transaction in audit log
            const transactionId = await WalletModel.createTransaction(
                {
                    walletId: wallet.id,
                    userId,
                    type,
                    category,
                    amount: exactAmount,
                    balanceBefore: exactBalanceBefore,
                    balanceAfter: exactBalanceAfter,
                    referenceId,
                    referenceType,
                    description,
                    status: 'completed',
                },
                connection
            );

            await connection.commit();

            const resultData = {
                transactionId,
                walletId: Number(wallet.id),
                userId: Number(userId),
                type,
                category,
                amount: numericAmount,
                displayAmount: `${type === 'credit' ? '+' : '-'}₹${numericAmount.toFixed(2)}`,
                balanceBefore: Number(Number(exactBalanceBefore).toFixed(2)),
                balanceAfter: Number(Number(exactBalanceAfter).toFixed(2)),
                displayBalance: `₹${Number(exactBalanceAfter).toFixed(2)}`,
                referenceId,
                referenceType,
                description,
                status: 'completed',
                currency: wallet.currency,
                createdAt: new Date().toISOString(),
            };

            // Broadcast real-time Socket events
            try {
                const { socketService } = require('./socket.service');
                socketService.notifyUser(userId, 'wallet:balance', {
                    userId: Number(userId),
                    walletId: Number(wallet.id),
                    balance: resultData.balanceAfter,
                    displayBalance: resultData.displayBalance,
                    currency: wallet.currency,
                    lastTransaction: {
                        id: transactionId,
                        type,
                        amount: numericAmount,
                        displayAmount: resultData.displayAmount,
                        category,
                        description,
                        createdAt: resultData.createdAt,
                    },
                });

                socketService.notifyUser(userId, 'ledger:transaction', resultData);

                if (socketService.io) {
                    socketService.io.to('admin').emit('admin:wallet_transaction', resultData);
                    socketService.io.to('admin').emit('admin:ledger_entry', resultData);
                }
            } catch (sockErr) {
                // Non-fatal
            }

            return resultData;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Credit coins/amount to ALL users in the system (e.g. 10 coins bonus)
     */
    static async creditAllUsers({
        amount = 10,
        category = 'bonus',
        description = 'Admin Bonus Coins',
    } = {}) {
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            const error = new Error('Amount must be a positive number');
            error.statusCode = 400;
            throw error;
        }

        const [users] = await pool.query('SELECT id, username, email FROM users');
        const results = [];

        for (const user of users) {
            try {
                const res = await this.changeBalance({
                    userId: user.id,
                    type: 'credit',
                    amount: numericAmount,
                    category,
                    description,
                });
                results.push({
                    userId: user.id,
                    username: user.username,
                    success: true,
                    newBalance: res.balanceAfter,
                });
            } catch (err) {
                results.push({
                    userId: user.id,
                    username: user.username,
                    success: false,
                    error: err.message,
                });
            }
        }

        return {
            totalUsers: users.length,
            creditedCount: results.filter((r) => r.success).length,
            amountPerUser: numericAmount,
            totalAmountDistributed: results.filter((r) => r.success).length * numericAmount,
            results,
        };
    }
}

module.exports = WalletService;

