const { pool } = require('../config/database');
const BetModel = require('../models/bet.model');
const WalletModel = require('../models/wallet.model');
const GameModel = require('../models/game.model');
const RaceModel = require('../models/race.model');
const WalletService = require('./wallet.service');
const raceConfig = require('../config/raceConfig');
const { raceEngine } = require('./raceEngine');
const { RACE_STATUSES } = require('./raceStateMachine');

// In-memory cache & in-flight locks to prevent duplicate / double-tap submissions (e.g. dual HTTP + Socket or fast double clicks)
const recentBetSubmissions = new Map();
const inFlightBetRequests = new Map();

class BetService {
    static formatBet(row) {
        if (!row) return null;
        const amountNum = Number(Number(row.amount).toFixed(2));
        const oddsNum = Number(Number(row.odds || 10).toFixed(2));
        const potentialPayoutNum = Number(Number(row.potential_payout || (amountNum * oddsNum)).toFixed(2));
        const payoutAmountNum = Number(Number(row.payout_amount || 0).toFixed(2));
        const status = row.status || 'PENDING';
        const isWinner = status === 'WON';
        const isLost = status === 'LOST';

        return {
            id: Number(row.id),
            userId: Number(row.user_id),
            gameId: row.game_id ? Number(row.game_id) : null,
            gameCode: row.game_code || null,
            raceId: Number(row.race_id),
            gameSerial: String(row.game_serial),
            horseId: Number(row.horse_id),
            horseSerial: Number(row.horse_serial),
            horseName: row.horse_name,
            amount: amountNum,
            displayAmount: `₹${amountNum.toFixed(2)}`,
            coins: amountNum,
            odds: oddsNum,
            multiplier: `${oddsNum}X`,
            potentialPayout: potentialPayoutNum,
            displayPotentialPayout: `₹${potentialPayoutNum.toFixed(2)}`,
            status,
            isWinner,
            payoutAmount: payoutAmountNum,
            displayPayoutAmount: payoutAmountNum > 0 ? `+₹${payoutAmountNum.toFixed(2)}` : (isLost ? '₹0.00' : `₹${potentialPayoutNum.toFixed(2)} (Potential)`),
            winCalculation: `₹${amountNum} × ${oddsNum}X = ₹${payoutAmountNum > 0 ? payoutAmountNum : potentialPayoutNum}`,
            netProfit: isWinner ? Number((payoutAmountNum - amountNum).toFixed(2)) : (isLost ? -amountNum : 0),
            displayNetProfit: isWinner ? `+₹${(payoutAmountNum - amountNum).toFixed(2)}` : (isLost ? `-₹${amountNum.toFixed(2)}` : '₹0.00'),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    /**
     * Place bet(s) based on game_serial / current active race
     * Handles single horse bet or multiple horses bets with dynamic coin additions
     */
    static async placeBets(userId, data = {}) {
        const currentState = raceEngine.getCurrentState();
        const requestedGameSerial = data.game_serial || data.gameSerial;

        let raceId;
        let gameSerial;
        let raceStatus;
        let timeRemainingSec = 0;
        let raceHorses = [];

        // 1. Resolve target race by game_serial or current active race
        if (requestedGameSerial) {
            if (currentState && currentState.active && String(currentState.gameSerial) === String(requestedGameSerial)) {
                raceId = currentState.id;
                gameSerial = currentState.gameSerial;
                raceStatus = currentState.status;
                timeRemainingSec = currentState.timeRemainingSec;
                raceHorses = currentState.horses || [];
            } else {
                const raceInDb = await RaceModel.findByGameSerial(requestedGameSerial);
                if (!raceInDb) {
                    const error = new Error(`Race with game_serial '${requestedGameSerial}' was not found.`);
                    error.statusCode = 404;
                    throw error;
                }
                raceId = raceInDb.id;
                gameSerial = raceInDb.game_serial;
                raceStatus = raceInDb.status;

                const horsesInDb = await RaceModel.getRaceHorses(raceInDb.id);
                raceHorses = horsesInDb.map((h) => ({
                    id: h.horse_id,
                    serialNumber: h.serial_number,
                    name: h.horse_name_snapshot,
                }));
            }
        } else {
            if (!currentState || !currentState.active) {
                const error = new Error('No active race available right now. Please wait for the next race.');
                error.statusCode = 400;
                throw error;
            }
            raceId = currentState.id;
            gameSerial = currentState.gameSerial;
            raceStatus = currentState.status;
            timeRemainingSec = currentState.timeRemainingSec;
            raceHorses = currentState.horses || [];
        }

        // Verify Betting is Open
        if (raceStatus !== RACE_STATUSES.BETTING_OPEN) {
            const error = new Error(
                `Betting is closed for Race #${gameSerial}. Current stage is '${raceStatus}'.`
            );
            error.statusCode = 400;
            throw error;
        }

        // Check if this is a minus / cancellation / refund operation sent to placeBets
        const actionStr = String(data.action || data.type || data.mode || data.operation || '').toLowerCase();
        const isMinusAction = actionStr === 'minus' || actionStr === 'remove' || actionStr === 'cancel' || actionStr === 'delete' || actionStr === 'undo' || actionStr === 'clear' || data.isMinus === true || data.minus === true || data.isCancel === true || data.isRemove === true || Boolean(data.clearAll || data.clear_all);

        const rawRootAmount = data.amount ?? data.coins ?? data.betAmount ?? data.bet_amount;
        const isNegativeAmount = rawRootAmount !== undefined && Number(rawRootAmount) < 0;

        if (isMinusAction || isNegativeAmount) {
            const cancelOptions = {
                ...data,
                amount: rawRootAmount !== undefined ? Math.abs(Number(rawRootAmount)) : data.amount,
            };
            return await BetService.cancelBet(userId, cancelOptions);
        }

        // 2. Normalize and validate bet items from request payload
        let rawItems = [];
        const possibleList = data.bets || data.items || data.betList || data.data;

        if (Array.isArray(possibleList) && possibleList.length > 0) {
            rawItems = possibleList;
        } else if (
            data.horse_id !== undefined || data.horseId !== undefined ||
            data.horse_serial !== undefined || data.horseSerial !== undefined ||
            data.horseNumber !== undefined || data.horse_number !== undefined ||
            data.serialNumber !== undefined || data.serial !== undefined ||
            data.horse !== undefined || data.id !== undefined
        ) {
            rawItems = [data];
        } else {
            const error = new Error('Please specify at least one horse bet with an amount (e.g. { horse_serial: 1, amount: 10 } or { bets: [...] })');
            error.statusCode = 400;
            throw error;
        }

        // Aggregate amounts per horse if user passed multiple coin clicks for the same horse
        const aggregatedMap = new Map();

        for (const item of rawItems) {
            const itemAmountRaw = item.amount ?? item.coins ?? item.betAmount ?? item.bet_amount ?? item.value;
            const itemAction = String(item.action || item.type || '').toLowerCase();
            const amountNum = Number(itemAmountRaw);

            // If an individual item is marked minus or has negative amount -> Route to cancelBet
            if (amountNum < 0 || itemAction === 'minus' || item.isMinus === true) {
                return await BetService.cancelBet(userId, {
                    ...data,
                    horseId: item.horse_id ?? item.horseId ?? item.id,
                    horseSerial: item.horse_serial ?? item.horseSerial ?? item.horseNumber ?? item.horse_number ?? item.serialNumber ?? item.serial ?? item.horse,
                    amount: Math.abs(amountNum),
                });
            }

            if (isNaN(amountNum) || amountNum <= 0) {
                const error = new Error('Bet amount must be a positive number');
                error.statusCode = 400;
                throw error;
            }

            // Match horse in current active race by ID or serial_number (1-12)
            const targetHorseId = item.horse_id ?? item.horseId ?? item.id;
            const targetSerial = item.horse_serial ?? item.horseSerial ?? item.horseNumber ?? item.horse_number ?? item.serialNumber ?? item.serial ?? item.horse;

            const matchedHorse = raceHorses.find((h) => {
                if (targetHorseId !== undefined && targetHorseId !== null && Number(h.id) === Number(targetHorseId)) return true;
                if (targetSerial !== undefined && targetSerial !== null && Number(h.serialNumber) === Number(targetSerial)) return true;
                return false;
            });

            if (!matchedHorse) {
                const error = new Error(`Horse (ID/Serial: ${targetHorseId || targetSerial}) is not participating in current Race #${gameSerial}`);
                error.statusCode = 400;
                throw error;
            }

            const horseKey = matchedHorse.id;
            if (aggregatedMap.has(horseKey)) {
                const existing = aggregatedMap.get(horseKey);
                existing.amount += amountNum;
            } else {
                aggregatedMap.set(horseKey, {
                    horseId: matchedHorse.id,
                    horseSerial: matchedHorse.serialNumber,
                    horseName: matchedHorse.name,
                    amount: amountNum,
                    odds: Number(item.odds || raceConfig.DEFAULT_ODDS || 10.0), // 10X Standard Payout Multiplier
                });
            }
        }

        const normalizedBets = Array.from(aggregatedMap.values());
        const totalBetAmount = normalizedBets.reduce((sum, b) => sum + b.amount, 0);

        if (totalBetAmount <= 0) {
            const error = new Error('Total bet amount must be greater than zero');
            error.statusCode = 400;
            throw error;
        }

        // Deduplication & Double-Click Guard (e.g. concurrent HTTP + Socket call or double-tap within 1000ms)
        const idempotencyKey = data.idempotencyKey || data.idempotency_key || data.requestId || data.request_id;
        const betSignature = `${userId}_${raceId}_${normalizedBets.map((b) => `${b.horseId}:${b.amount}`).join(',')}`;
        const dedupKey = idempotencyKey ? `${userId}_${idempotencyKey}` : betSignature;

        const nowTs = Date.now();
        if (recentBetSubmissions.has(dedupKey)) {
            const cached = recentBetSubmissions.get(dedupKey);
            if (nowTs - cached.timestamp < 1000) {
                console.log(`[BetService] 🛡️ Double-submit prevented for user ${userId} within ${nowTs - cached.timestamp}ms. Returning existing bet.`);
                return cached.result;
            }
        }

        if (inFlightBetRequests.has(dedupKey)) {
            console.log(`[BetService] 🛡️ In-flight concurrent bet request detected for user ${userId}. Awaiting existing transaction...`);
            return await inFlightBetRequests.get(dedupKey);
        }

        const executePlacement = async () => {
            // 3. Fetch User's Game Profile
            let userGame = await GameModel.findByUserId(userId);
            const gameId = userGame ? userGame.id : null;
            const gameCode = userGame ? userGame.game_code : null;

            // 4. Atomic Transaction: Check Wallet, Deduct Total Amount, Record Ledger & Bets
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Lock user's wallet for update
                let wallet = await WalletModel.findByUserIdForUpdate(userId, connection);
                if (!wallet) {
                    await WalletModel.create(userId, '0.0000', 'INR', 'active', connection);
                    wallet = await WalletModel.findByUserIdForUpdate(userId, connection);
                }

                if (wallet.status !== 'active') {
                    const error = new Error(`Wallet is currently ${wallet.status}`);
                    error.statusCode = 403;
                    throw error;
                }

                const currentBalance = Number(wallet.balance);

                // Strict Balance Verification: If insufficient, DO NOT DEDUCT ANY AMOUNT
                if (currentBalance < totalBetAmount) {
                    const error = new Error(
                        `Insufficient wallet balance. Total bet requires ₹${totalBetAmount.toFixed(2)}, but available balance is ₹${currentBalance.toFixed(2)}.`
                    );
                    error.statusCode = 400;
                    error.details = {
                        requiredAmount: Number(totalBetAmount.toFixed(2)),
                        availableBalance: Number(currentBalance.toFixed(2)),
                        shortfall: Number((totalBetAmount - currentBalance).toFixed(2)),
                    };
                    throw error;
                }

                // Deduct total bet amount from wallet
                const newBalance = currentBalance - totalBetAmount;
                const exactBalanceBefore = currentBalance.toFixed(4);
                const exactBalanceAfter = newBalance.toFixed(4);
                const exactAmount = totalBetAmount.toFixed(4);

                await WalletModel.updateBalance(wallet.id, exactBalanceAfter, connection);

                // Record in wallet_transactions ledger
                await WalletModel.createTransaction(
                    {
                        walletId: wallet.id,
                        userId,
                        type: 'debit',
                        category: 'bet_placed',
                        amount: exactAmount,
                        balanceBefore: exactBalanceBefore,
                        balanceAfter: exactBalanceAfter,
                        referenceId: String(raceId),
                        referenceType: 'race',
                        description: `Placed ₹${totalBetAmount.toFixed(2)} bet on Race #${gameSerial}`,
                        status: 'completed',
                    },
                    connection
                );

                // Insert or merge each horse bet record into bets table (prevents duplicate rows for same horse in same race)
                const createdBets = [];
                for (const b of normalizedBets) {
                    const [existingRows] = await connection.execute(
                        `SELECT id, amount, potential_payout FROM bets 
                     WHERE user_id = ? AND race_id = ? AND horse_id = ? AND status = 'PENDING' 
                     LIMIT 1 FOR UPDATE`,
                        [userId, raceId, b.horseId]
                    );

                    let betRow;
                    if (existingRows && existingRows.length > 0) {
                        const prevAmount = Number(existingRows[0].amount);
                        const combinedAmount = prevAmount + b.amount;
                        const combinedPayout = Number((combinedAmount * b.odds).toFixed(4));

                        await connection.execute(
                            `UPDATE bets 
                         SET amount = ?, potential_payout = ? 
                         WHERE id = ?`,
                            [combinedAmount.toFixed(4), combinedPayout.toFixed(4), existingRows[0].id]
                        );

                        betRow = await BetModel.findById(existingRows[0].id, connection);
                    } else {
                        const potentialPayout = Number((b.amount * b.odds).toFixed(4));
                        betRow = await BetModel.create(
                            {
                                userId,
                                gameId,
                                gameCode,
                                raceId,
                                gameSerial,
                                horseId: b.horseId,
                                horseSerial: b.horseSerial,
                                horseName: b.horseName,
                                amount: b.amount.toFixed(4),
                                odds: b.odds.toFixed(2),
                                potentialPayout: potentialPayout.toFixed(4),
                                status: 'PENDING',
                            },
                            connection
                        );
                    }
                    createdBets.push(this.formatBet(betRow));
                }

                await connection.commit();

                // Broadcast real-time live bet event to Socket.IO clients & Admin
                try {
                    const { socketService } = require('./socket.service');
                    const [userRows] = await pool.query('SELECT username, name, role FROM users WHERE id = ?', [userId]);
                    const user = userRows[0] || {};
                    const displayName = user.username || user.name || `Player #${userId}`;
                    const maskedUsername = user.username ? (user.username.length > 3 ? `${user.username.slice(0, 3)}***` : user.username) : 'Player';

                    for (const b of createdBets) {
                        socketService.broadcastLiveBet({
                            id: b.id,
                            userId,
                            username: user.username || `user_${userId}`,
                            name: user.name || null,
                            displayName,
                            maskedUsername,
                            userRole: user.role || 'user',
                            gameId,
                            gameCode,
                            raceId,
                            gameSerial,
                            horseId: b.horseId,
                            horseSerial: b.horseSerial,
                            horseName: b.horseName,
                            amount: b.amount,
                            displayAmount: `₹${b.amount.toFixed(2)}`,
                            odds: b.odds,
                            potentialPayout: b.potentialPayout,
                            status: b.status,
                            createdAt: b.createdAt || new Date().toISOString(),
                        });
                    }

                    // Broadcast real-time updated wallet balance and ledger transaction to the user
                    const txPayload = {
                        walletId: Number(wallet.id),
                        userId: Number(userId),
                        type: 'debit',
                        category: 'bet_placed',
                        amount: totalBetAmount,
                        displayAmount: `-₹${totalBetAmount.toFixed(2)}`,
                        balanceBefore: Number(currentBalance.toFixed(2)),
                        balanceAfter: Number(newBalance.toFixed(2)),
                        displayBalance: `₹${newBalance.toFixed(2)}`,
                        referenceId: String(raceId),
                        referenceType: 'race',
                        description: `Placed ₹${totalBetAmount.toFixed(2)} bet on Race #${gameSerial}`,
                        currency: wallet.currency || 'INR',
                        createdAt: new Date().toISOString(),
                    };

                    socketService.notifyUser(userId, 'wallet:balance', {
                        userId: Number(userId),
                        walletId: Number(wallet.id),
                        balance: Number(newBalance.toFixed(2)),
                        displayBalance: `₹${newBalance.toFixed(2)}`,
                        currency: wallet.currency || 'INR',
                        lastTransaction: txPayload,
                    });
                    socketService.notifyUser(userId, 'ledger:transaction', txPayload);

                    // Broadcast live bet pool update per horse to global race stream & admin
                    try {
                        const livePool = await BetService.getLiveRaceBetPool(raceId);
                        if (socketService.io) {
                            socketService.io.to('races').emit('race:bet_pool_update', livePool);
                            socketService.io.to('admin').emit('admin:bet_pool_update', livePool);
                        }
                    } catch (pErr) { }
                } catch (socketErr) {
                    // Non-fatal if socket emit fails
                    console.error('[BetService] Socket broadcast error:', socketErr.message);
                }

                let userStats = { totalWon: 0, displayTotalWon: '₹0.00', totalInvested: 0, displayTotalInvested: '₹0.00', netProfitLoss: 0, displayNetProfitLoss: '₹0.00', totalBets: 0, totalWins: 0 };
                try {
                    userStats = await WalletService.getUserStats(userId);
                } catch (sErr) { }

                const responsePayload = {
                    success: true,
                    message: `Successfully placed ₹${totalBetAmount.toFixed(2)} bet on Race #${gameSerial}`,
                    totalBetAmount: Number(totalBetAmount.toFixed(2)),
                    wallet: {
                        previousBalance: Number(currentBalance.toFixed(2)),
                        currentBalance: Number(newBalance.toFixed(2)),
                        deductedAmount: Number(totalBetAmount.toFixed(2)),
                        currency: wallet.currency,
                        totalWon: userStats.totalWon,
                        displayTotalWon: userStats.displayTotalWon,
                        totalInvested: userStats.totalInvested,
                        displayTotalInvested: userStats.displayTotalInvested,
                        netProfitLoss: userStats.netProfitLoss,
                        displayNetProfitLoss: userStats.displayNetProfitLoss,
                    },
                    userStats,
                    race: {
                        id: raceId,
                        gameSerial,
                        status: currentState.status,
                        timeRemainingSec: currentState.timeRemainingSec,
                    },
                    game: {
                        gameId,
                        gameCode,
                    },
                    bets: createdBets,
                };

                // Save to deduplication cache (auto clean old entries)
                recentBetSubmissions.set(dedupKey, { timestamp: Date.now(), result: responsePayload });
                if (recentBetSubmissions.size > 2000) {
                    const cutoff = Date.now() - 10000;
                    for (const [k, v] of recentBetSubmissions.entries()) {
                        if (v.timestamp < cutoff) recentBetSubmissions.delete(k);
                    }
                }

                return responsePayload;
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        };

        const inFlightPromise = executePlacement();
        inFlightBetRequests.set(dedupKey, inFlightPromise);
        try {
            return await inFlightPromise;
        } finally {
            inFlightBetRequests.delete(dedupKey);
        }
    }

    /**
     * Cancel, Remove, or Reduce (-) Bet during BETTING phase with instant wallet refund
     * Supports:
     *  - Reduce horse bet by amount (e.g. -₹10 chip click)
     *  - Remove entire horse bet
     *  - Cancel specific bet ID
     *  - Clear all bets in current race
     */
    static async cancelBet(userId, options = {}) {
        if (!userId) {
            const error = new Error('User authentication required to cancel bet');
            error.statusCode = 401;
            throw error;
        }

        const currentState = raceEngine.getCurrentState();
        let targetRaceId = options.raceId || options.race_id;
        let gameSerial = options.game_serial || options.gameSerial;

        if (gameSerial) {
            if (currentState && currentState.active && String(currentState.gameSerial) === String(gameSerial)) {
                targetRaceId = currentState.id;
            } else {
                const raceInDb = await RaceModel.findByGameSerial(gameSerial);
                if (raceInDb) {
                    targetRaceId = raceInDb.id;
                }
            }
        }

        if (!targetRaceId) {
            if (currentState && currentState.active) {
                targetRaceId = currentState.id;
                gameSerial = currentState.gameSerial;
            } else {
                const error = new Error('No active race currently running to cancel bet');
                error.statusCode = 400;
                throw error;
            }
        }

        // Verify that race is still in BETTING_OPEN state (Cannot cancel after betting is closed or race is running)
        if (currentState && currentState.active && (Number(currentState.id) === Number(targetRaceId) || String(currentState.gameSerial) === String(gameSerial))) {
            if (currentState.status !== RACE_STATUSES.BETTING_OPEN && currentState.status !== 'BETTING' && currentState.status !== RACE_STATUSES.WAITING) {
                const error = new Error(`Cannot cancel or reduce bets once betting has closed (Current State: ${currentState.status})`);
                error.statusCode = 400;
                throw error;
            }
        }

        let targetHorseId = options.horseId ?? options.horse_id ?? options.id;
        let targetSerial = options.horseSerial ?? options.horse_serial ?? options.horseNumber ?? options.horse_number ?? options.serialNumber ?? options.serial ?? options.horse;
        const targetBetId = options.betId ?? options.bet_id;
        const isClearAll = Boolean(options.clearAll || options.clear_all || options.all || options.reset);
        let reduceAmount = options.amount !== undefined && options.amount !== null ? Number(options.amount) : null;

        // Support array in options.bets or options.items
        const betArray = options.bets || options.items || options.betList || options.data;
        if ((targetHorseId === undefined && targetSerial === undefined) && Array.isArray(betArray) && betArray.length > 0) {
            const firstItem = betArray[0];
            targetHorseId = firstItem.horseId ?? firstItem.horse_id ?? firstItem.id;
            targetSerial = firstItem.horseSerial ?? firstItem.horse_serial ?? firstItem.horseNumber ?? firstItem.horse_number ?? firstItem.serialNumber ?? firstItem.serial ?? firstItem.horse;
            if (reduceAmount === null) {
                const rawAmt = firstItem.amount ?? firstItem.coins ?? firstItem.betAmount ?? firstItem.bet_amount;
                if (rawAmt !== undefined) reduceAmount = Math.abs(Number(rawAmt));
            }
        }

        if (reduceAmount !== null && (isNaN(reduceAmount) || reduceAmount <= 0)) {
            const error = new Error('Reduce amount must be greater than zero');
            error.statusCode = 400;
            throw error;
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Lock user's wallet
            let wallet = await WalletModel.findByUserIdForUpdate(userId, connection);
            if (!wallet) {
                const error = new Error('User wallet not found');
                error.statusCode = 404;
                throw error;
            }

            // Find all pending bets for this user in the target race
            const [pendingBets] = await connection.execute(
                `SELECT id, user_id, race_id, game_serial, horse_id, horse_serial, horse_name, amount, odds, potential_payout, status
                 FROM bets
                 WHERE race_id = ? AND user_id = ? AND status = 'PENDING'
                 FOR UPDATE`,
                [targetRaceId, userId]
            );

            if (!pendingBets || pendingBets.length === 0) {
                const error = new Error(`No active bets found in Race #${gameSerial} to cancel`);
                error.statusCode = 400;
                throw error;
            }

            let betsToCancel = [];
            let refundAmount = 0;
            let updatedBet = null;
            let cancelledHorseName = '';
            let cancelledHorseSerial = '';

            if (isClearAll) {
                // Scenario 1: Clear All Bets in Current Race
                betsToCancel = pendingBets;
                refundAmount = pendingBets.reduce((sum, b) => sum + Number(b.amount), 0);
                for (const b of betsToCancel) {
                    await connection.execute('DELETE FROM bets WHERE id = ?', [b.id]);
                }
                cancelledHorseName = 'ALL HORSES';
            } else if (targetBetId) {
                // Scenario 2: Cancel specific Bet ID
                const matched = pendingBets.find((b) => Number(b.id) === Number(targetBetId));
                if (!matched) {
                    const error = new Error(`Bet ID #${targetBetId} not found or already settled/cancelled`);
                    error.statusCode = 404;
                    throw error;
                }
                refundAmount = Number(matched.amount);
                cancelledHorseName = matched.horse_name;
                cancelledHorseSerial = matched.horse_serial;
                await connection.execute('DELETE FROM bets WHERE id = ?', [matched.id]);
            } else if (targetHorseId !== undefined || targetSerial !== undefined) {
                // Scenario 3: Cancel / Reduce (-) Bet on Specific Horse
                const horseBets = pendingBets.filter((b) => {
                    if (targetHorseId !== undefined && Number(b.horse_id) === Number(targetHorseId)) return true;
                    if (targetSerial !== undefined && Number(b.horse_serial) === Number(targetSerial)) return true;
                    return false;
                });

                if (horseBets.length === 0) {
                    const error = new Error(`No active bet placed on Horse (ID/Serial: ${targetHorseId || targetSerial}) to remove`);
                    error.statusCode = 400;
                    throw error;
                }

                const totalOnHorse = horseBets.reduce((sum, b) => sum + Number(b.amount), 0);
                cancelledHorseName = horseBets[0].horse_name;
                cancelledHorseSerial = horseBets[0].horse_serial;

                if (reduceAmount !== null && reduceAmount < totalOnHorse) {
                    // Partial Reduction (Minus click, e.g. -₹10)
                    refundAmount = reduceAmount;
                    let remainingToDeduct = reduceAmount;

                    // Deduct starting from newest bet backwards
                    const sortedBets = [...horseBets].reverse();
                    for (const b of sortedBets) {
                        if (remainingToDeduct <= 0) break;
                        const bAmount = Number(b.amount);
                        if (bAmount <= remainingToDeduct) {
                            await connection.execute('DELETE FROM bets WHERE id = ?', [b.id]);
                            remainingToDeduct -= bAmount;
                        } else {
                            const newAmount = bAmount - remainingToDeduct;
                            const odds = Number(b.odds || 10.0);
                            const newPayout = Number((newAmount * odds).toFixed(4));
                            await connection.execute(
                                'UPDATE bets SET amount = ?, potential_payout = ? WHERE id = ?',
                                [newAmount.toFixed(4), newPayout.toFixed(4), b.id]
                            );
                            remainingToDeduct = 0;
                            updatedBet = {
                                id: b.id,
                                horseId: b.horse_id,
                                horseSerial: b.horse_serial,
                                horseName: b.horse_name,
                                amount: newAmount,
                                displayAmount: `₹${newAmount.toFixed(2)}`,
                            };
                        }
                    }
                } else {
                    // Full removal of all bets on this horse
                    refundAmount = totalOnHorse;
                    for (const b of horseBets) {
                        await connection.execute('DELETE FROM bets WHERE id = ?', [b.id]);
                    }
                }
            } else {
                const error = new Error('Please specify horseId, horseSerial, betId, or clearAll: true to cancel bet');
                error.statusCode = 400;
                throw error;
            }

            if (refundAmount <= 0) {
                const error = new Error('No bet amount eligible for refund');
                error.statusCode = 400;
                throw error;
            }

            // Refund amount back to user's wallet
            const currentBal = Number(wallet.balance);
            const newBal = currentBal + refundAmount;
            const exactBalBefore = currentBal.toFixed(4);
            const exactBalAfter = newBal.toFixed(4);
            const exactRefund = refundAmount.toFixed(4);

            await WalletModel.updateBalance(wallet.id, exactBalAfter, connection);

            // Record transaction in ledger
            const desc = isClearAll
                ? `Refunded ₹${refundAmount.toFixed(2)} (Cleared all bets in Race #${gameSerial})`
                : `Refunded ₹${refundAmount.toFixed(2)} (Cancelled/Reduced bet on Horse #${cancelledHorseSerial || ''} ${cancelledHorseName}) [Race #${gameSerial}]`;

            const txId = await WalletModel.createTransaction(
                {
                    walletId: wallet.id,
                    userId,
                    type: 'credit',
                    category: 'bet_cancelled',
                    amount: exactRefund,
                    balanceBefore: exactBalBefore,
                    balanceAfter: exactBalAfter,
                    referenceId: String(targetRaceId),
                    referenceType: 'race',
                    description: desc,
                    status: 'completed',
                },
                connection
            );

            await connection.commit();

            // Broadcast real-time socket updates
            const WalletService = require('./wallet.service');
            const { socketService } = require('./socket.service');

            const userStats = await WalletService.getUserStats(userId);
            const walletPayload = {
                success: true,
                userId: Number(userId),
                walletId: Number(wallet.id),
                balance: Number(newBal.toFixed(2)),
                displayBalance: `₹${newBal.toFixed(2)}`,
                coins: Number(newBal.toFixed(2)),
                currency: wallet.currency || 'INR',
                totalWon: userStats.totalWon,
                displayTotalWon: userStats.displayTotalWon,
                totalInvested: userStats.totalInvested,
                displayTotalInvested: userStats.displayTotalInvested,
                netProfitLoss: userStats.netProfitLoss,
                displayNetProfitLoss: userStats.displayNetProfitLoss,
                totalBets: userStats.totalBets,
                totalWins: userStats.totalWins,
                timestamp: new Date().toISOString(),
            };

            socketService.notifyUser(userId, 'wallet:balance', walletPayload);

            const txPayload = {
                transactionId: txId,
                walletId: Number(wallet.id),
                userId: Number(userId),
                type: 'credit',
                category: 'bet_cancelled',
                amount: Number(refundAmount.toFixed(2)),
                displayAmount: `+₹${refundAmount.toFixed(2)}`,
                balanceBefore: Number(currentBal.toFixed(2)),
                balanceAfter: Number(newBal.toFixed(2)),
                displayBalance: `₹${newBal.toFixed(2)}`,
                description: desc,
                createdAt: new Date().toISOString(),
            };
            socketService.notifyUser(userId, 'ledger:transaction', txPayload);
            if (socketService.io) {
                socketService.io.to('admin').emit('admin:wallet_transaction', txPayload);
            }

            // Fetch remaining active bets for response
            const remainingBetsInDb = await BetModel.findByRaceAndUser(targetRaceId, userId);
            const formattedRemaining = (remainingBetsInDb || []).map((b) => this.formatBet(b));
            const totalRemainingBetAmount = formattedRemaining.reduce((sum, b) => sum + b.amount, 0);

            // Clear deduplication cache for this user so subsequent bet placements or page refreshes are fresh
            for (const [k] of recentBetSubmissions.entries()) {
                if (k.startsWith(`${userId}_`)) {
                    recentBetSubmissions.delete(k);
                }
            }

            // Notify user of updated active bet list
            socketService.notifyUser(userId, 'user:bets_updated', {
                raceId: targetRaceId,
                gameSerial: String(gameSerial),
                totalBetAmount: Number(totalRemainingBetAmount.toFixed(2)),
                displayTotalBetAmount: `₹${totalRemainingBetAmount.toFixed(2)}`,
                bets: formattedRemaining,
            });

            // Recalculate and broadcast live bet pool to user, race stream, and admin
            const updatedPool = await this.getLiveRaceBetPool(targetRaceId, userId);
            socketService.broadcastLivePool(updatedPool);
            if (socketService.io) {
                socketService.io.to('races').emit('race:bet_pool_update', updatedPool);
                socketService.io.to('admin').emit('admin:bet_pool_update', updatedPool);
            }

            return {
                success: true,
                message: `Successfully cancelled bet. ₹${refundAmount.toFixed(2)} refunded to your wallet.`,
                refundAmount: Number(refundAmount.toFixed(2)),
                displayRefundAmount: `+₹${refundAmount.toFixed(2)}`,
                cancelledHorse: {
                    serial: cancelledHorseSerial,
                    name: cancelledHorseName,
                },
                wallet: {
                    previousBalance: Number(currentBal.toFixed(2)),
                    currentBalance: Number(newBal.toFixed(2)),
                    balance: Number(newBal.toFixed(2)),
                    displayBalance: `₹${newBal.toFixed(2)}`,
                    refundedAmount: Number(refundAmount.toFixed(2)),
                    displayRefundedAmount: `+₹${refundAmount.toFixed(2)}`,
                    currency: wallet.currency || 'INR',
                },
                newBalance: Number(newBal.toFixed(2)),
                balance: Number(newBal.toFixed(2)),
                coins: Number(newBal.toFixed(2)),
                displayNewBalance: `₹${newBal.toFixed(2)}`,
                displayBalance: `₹${newBal.toFixed(2)}`,
                totalRemainingBetAmount: Number(totalRemainingBetAmount.toFixed(2)),
                displayTotalRemainingBetAmount: `₹${totalRemainingBetAmount.toFixed(2)}`,
                remainingBetsCount: formattedRemaining.length,
                remainingBets: formattedRemaining,
                bets: formattedRemaining,
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get live bet ledger feed for admin & frontend live ticker
     */
    static async getLiveBetLedger(options = {}) {
        const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 50));
        const page = Math.max(1, parseInt(options.page, 10) || 1);
        const offset = (page - 1) * limit;

        const currentState = raceEngine.getCurrentState();
        let targetRaceId = options.raceId;
        let gameSerial = options.game_serial || options.gameSerial;

        if (!targetRaceId && !gameSerial && currentState && currentState.active) {
            targetRaceId = currentState.id;
            gameSerial = currentState.gameSerial;
        }

        const rows = await BetModel.getLiveBetLedger({
            raceId: targetRaceId,
            gameSerial,
            status: options.status,
            limit,
            offset,
        });

        const formattedLedger = rows.map((r) => ({
            id: Number(r.id),
            userId: Number(r.user_id),
            username: r.username || `user_${r.user_id}`,
            name: r.user_name || null,
            displayName: r.username || r.user_name || `Player #${r.user_id}`,
            maskedUsername: r.username ? (r.username.length > 3 ? `${r.username.slice(0, 3)}***` : r.username) : 'Player',
            userRole: r.user_role || 'user',
            gameId: r.game_id ? Number(r.game_id) : null,
            gameCode: r.game_code,
            raceId: Number(r.race_id),
            gameSerial: String(r.game_serial),
            horseId: Number(r.horse_id),
            horseSerial: Number(r.horse_serial),
            horseName: r.horse_name,
            horseImageUrl: r.horse_image_url || null,
            amount: Number(Number(r.amount).toFixed(2)),
            displayAmount: `₹${Number(r.amount).toFixed(2)}`,
            odds: Number(Number(r.odds).toFixed(2)),
            potentialPayout: Number(Number(r.potential_payout).toFixed(2)),
            status: r.status,
            payoutAmount: Number(Number(r.payout_amount || 0).toFixed(2)),
            createdAt: r.created_at,
        }));

        const totalAmount = formattedLedger.reduce((sum, b) => sum + b.amount, 0);

        return {
            totalEntries: formattedLedger.length,
            totalAmount: Number(totalAmount.toFixed(2)),
            displayTotalAmount: `₹${totalAmount.toFixed(2)}`,
            race: {
                id: targetRaceId || (currentState ? currentState.id : null),
                gameSerial: gameSerial || (currentState ? currentState.gameSerial : null),
                status: currentState ? currentState.status : null,
            },
            ledger: formattedLedger,
        };
    }

    /**
     * Get all bets placed by user for current active race or specific game_serial
     */
    static async getMyCurrentBets(userId, query = {}) {
        const requestedGameSerial = query.game_serial || query.gameSerial;
        const currentState = raceEngine.getCurrentState();

        let targetRaceId;
        let gameSerial;
        let raceStatus;

        if (requestedGameSerial) {
            if (currentState && currentState.active && String(currentState.gameSerial) === String(requestedGameSerial)) {
                targetRaceId = currentState.id;
                gameSerial = currentState.gameSerial;
                raceStatus = currentState.status;
            } else {
                const raceInDb = await RaceModel.findByGameSerial(requestedGameSerial);
                if (!raceInDb) {
                    return {
                        success: true,
                        raceActive: false,
                        gameSerial: requestedGameSerial,
                        summary: {
                            totalInvested: 0,
                            displayTotalInvested: '₹0.00',
                            totalWon: 0,
                            displayTotalWon: '₹0.00',
                            netProfitLoss: 0,
                            displayNetProfitLoss: '₹0.00',
                            totalBetsCount: 0,
                            payoutMultiplier: 10,
                        },
                        totalBetAmount: 0,
                        totalWonAmount: 0,
                        totalBetsCount: 0,
                        bets: [],
                    };
                }
                targetRaceId = raceInDb.id;
                gameSerial = raceInDb.game_serial;
                raceStatus = raceInDb.status;
            }
        } else {
            targetRaceId = currentState?.id;
            gameSerial = currentState?.gameSerial;
            raceStatus = currentState?.status;
        }

        let bets = targetRaceId ? await BetModel.findByRaceAndUser(targetRaceId, userId) : [];

        const formatted = (bets || []).map((b) => this.formatBet(b));
        const totalBetAmount = formatted.reduce((sum, b) => sum + b.amount, 0);
        const totalWonAmount = formatted.reduce((sum, b) => sum + (b.payoutAmount || 0), 0);
        const netProfitLoss = Number((totalWonAmount - totalBetAmount).toFixed(2));
        const hasBet = formatted.length > 0;

        return {
            success: true,
            raceActive: currentState && currentState.active && String(currentState.gameSerial) === String(gameSerial),
            raceId: targetRaceId,
            gameSerial: String(gameSerial || ''),
            raceStatus: raceStatus || (currentState?.status || 'NO_RACE'),
            hasBet,
            betOutcome: hasBet ? (totalWonAmount > 0 ? 'YOU_WON' : 'YOU_LOSE') : 'NO_BET',
            summary: {
                totalInvested: Number(totalBetAmount.toFixed(2)),
                displayTotalInvested: `₹${totalBetAmount.toFixed(2)}`,
                totalWon: Number(totalWonAmount.toFixed(2)),
                wonAmount: Number(totalWonAmount.toFixed(2)),
                displayTotalWon: totalWonAmount > 0 ? `+₹${totalWonAmount.toFixed(2)}` : '₹0.00',
                displayWonAmount: totalWonAmount > 0 ? `+₹${totalWonAmount.toFixed(2)}` : '₹0.00',
                netProfitLoss,
                displayNetProfitLoss: netProfitLoss > 0 ? `+₹${netProfitLoss.toFixed(2)}` : netProfitLoss < 0 ? `-₹${Math.abs(netProfitLoss).toFixed(2)}` : '₹0.00',
                totalBetsCount: formatted.length,
                payoutMultiplier: 10,
            },
            currentRoundWonAmount: Number(totalWonAmount.toFixed(2)),
            wonAmount: Number(totalWonAmount.toFixed(2)),
            displayWonAmount: totalWonAmount > 0 ? `+₹${totalWonAmount.toFixed(2)}` : '₹0.00',
            totalBetAmount: Number(totalBetAmount.toFixed(2)),
            totalWonAmount: Number(totalWonAmount.toFixed(2)),
            totalBetsCount: formatted.length,
            bets: formatted,
        };
    }

    /**
     * Get Live Bet Pool Breakdown per Horse for active race (for Frontend live chips & Admin dashboard)
     */
    static async getLiveRaceBetPool(raceIdentifier = null, userId = null) {
        const currentState = raceEngine.getCurrentState();
        let targetRaceId;
        let gameSerial;
        let horses = [];

        if (raceIdentifier) {
            if (currentState && currentState.active && (String(currentState.id) === String(raceIdentifier) || String(currentState.gameSerial) === String(raceIdentifier))) {
                targetRaceId = currentState.id;
                gameSerial = currentState.gameSerial;
                horses = currentState.horses || [];
            } else {
                let raceInDb = await RaceModel.findByGameSerial(raceIdentifier);
                if (!raceInDb && !isNaN(Number(raceIdentifier))) {
                    raceInDb = await RaceModel.findById(Number(raceIdentifier));
                }
                if (raceInDb) {
                    targetRaceId = raceInDb.id;
                    gameSerial = raceInDb.game_serial;
                    const dbHorses = await RaceModel.getRaceHorses(raceInDb.id);
                    horses = dbHorses.map((h) => ({
                        id: h.horse_id,
                        serialNumber: h.serial_number,
                        name: h.horse_name_snapshot,
                    }));
                }
            }
        } else {
            if (currentState && currentState.active) {
                targetRaceId = currentState.id;
                gameSerial = currentState.gameSerial;
                horses = currentState.horses || [];
            }
        }

        if (!targetRaceId) {
            return {
                success: false,
                message: 'No active race found',
                totalPot: 0,
                displayTotalPot: '₹0.00',
                totalBetsCount: 0,
                horses: [],
            };
        }

        // Aggregate bets placed per horse for this race
        const [rows] = await pool.query(
            `SELECT 
                horse_id, 
                horse_serial, 
                COALESCE(SUM(amount), 0) AS totalBetsAmount,
                COUNT(id) AS totalBetsCount,
                COUNT(DISTINCT user_id) AS totalBettorsCount
             FROM bets
             WHERE race_id = ? AND status = 'PENDING'
             GROUP BY horse_id, horse_serial`,
            [targetRaceId]
        );

        const horsePoolMap = new Map();
        let totalPot = 0;
        let totalBetsCount = 0;

        rows.forEach((r) => {
            const sNum = Number(r.horse_serial);
            const amount = Number(Number(r.totalBetsAmount).toFixed(2));
            const count = Number(r.totalBetsCount);
            const bettors = Number(r.totalBettorsCount);
            horsePoolMap.set(sNum, { totalBetsAmount: amount, totalBetsCount: count, totalBettorsCount: bettors });
            totalPot += amount;
            totalBetsCount += count;
        });

        // Query user's own bets if userId provided
        const userBetsMap = new Map();
        if (userId) {
            const userBets = await BetModel.findByRaceAndUser(targetRaceId, userId);
            userBets.forEach((b) => {
                const sNum = Number(b.horse_serial);
                const amt = Number(Number(b.amount).toFixed(2));
                userBetsMap.set(sNum, (userBetsMap.get(sNum) || 0) + amt);
            });
        }

        const horseBreakdown = horses.map((h) => {
            const sNum = Number(h.serialNumber);
            const poolInfo = horsePoolMap.get(sNum) || { totalBetsAmount: 0, totalBetsCount: 0, totalBettorsCount: 0 };
            const myBet = userBetsMap.get(sNum) || 0;
            return {
                horseId: h.id,
                serialNumber: sNum,
                name: h.name,
                totalBetsAmount: poolInfo.totalBetsAmount,
                displayTotalBetsAmount: `₹${poolInfo.totalBetsAmount.toFixed(2)}`,
                totalBetsCount: poolInfo.totalBetsCount,
                totalBettorsCount: poolInfo.totalBettorsCount,
                imageUrl: h.imageUrl || h.image_url || null,
                myBetAmount: myBet,
                displayMyBetAmount: myBet > 0 ? `₹${myBet.toFixed(2)}` : '₹0.00',
                odds: 10,
                oddsMultiplier: '10X',
                potentialPayout: myBet * 10,
                winCalculation: myBet > 0 ? `₹${myBet} × 10X = ₹${myBet * 10}` : '₹0',
            };
        });

        return {
            success: true,
            raceId: targetRaceId,
            gameSerial: String(gameSerial),
            allowedCoins: raceConfig.ALLOWED_COINS || [2, 5, 10, 100, 500, 1000],
            totalPot: Number(totalPot.toFixed(2)),
            displayTotalPot: `₹${totalPot.toFixed(2)}`,
            totalBetsCount,
            horses: horseBreakdown,
        };
    }

    /**
     * Get user's detailed bet history with lagaya, aaya, profit/loss (+ / -)
     */
    static async getMyBetHistory(userId, options = {}) {
        const page = Math.max(1, parseInt(options.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
        const offset = (page - 1) * limit;

        const filterOptions = {
            limit,
            offset,
            status: options.status,
            raceId: options.raceId,
        };

        const [rows, total] = await Promise.all([
            BetModel.findByUserId(userId, filterOptions),
            BetModel.countByUserId(userId, filterOptions),
        ]);

        const formattedBets = rows.map((r) => {
            const betAmount = Number(Number(r.amount).toFixed(2));
            const payoutAmount = Number(Number(r.payout_amount || 0).toFixed(2));
            let netAmount = 0;
            let type = 'PENDING';

            if (r.status === 'WON') {
                netAmount = Number((payoutAmount - betAmount).toFixed(2));
                type = 'PLUS';
            } else if (r.status === 'LOST') {
                netAmount = -betAmount;
                type = 'MINUS';
            }

            return {
                id: Number(r.id),
                gameCode: r.game_code,
                raceId: Number(r.race_id),
                gameSerial: String(r.game_serial),
                horseId: Number(r.horse_id),
                horseSerial: Number(r.horse_serial),
                horseName: r.horse_name,
                betAmount, // Kitna Lagaya
                payoutAmount, // Kitna Aaya
                netAmount, // Plus (+) ya Minus (-)
                type, // 'PLUS' | 'MINUS' | 'PENDING'
                displayAmount: type === 'PLUS' ? `+₹${payoutAmount.toFixed(2)}` : type === 'MINUS' ? `-₹${betAmount.toFixed(2)}` : `₹${betAmount.toFixed(2)}`,
                odds: Number(Number(r.odds).toFixed(2)),
                status: r.status, // 'WON' | 'LOST' | 'PENDING'
                createdAt: r.created_at,
            };
        });

        // Summary Calculations for user
        const totalInvested = formattedBets.reduce((sum, b) => sum + b.betAmount, 0);
        const totalWon = formattedBets.reduce((sum, b) => sum + b.payoutAmount, 0);
        const netProfitLoss = Number((totalWon - totalInvested).toFixed(2));

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
            summary: {
                totalInvested: Number(totalInvested.toFixed(2)),
                totalWon: Number(totalWon.toFixed(2)),
                netProfitLoss,
                displayNet: netProfitLoss >= 0 ? `+₹${netProfitLoss.toFixed(2)}` : `-₹${Math.abs(netProfitLoss).toFixed(2)}`,
            },
            history: formattedBets,
        };
    }

    /**
     * Settle all bets for a finished race (called by RaceEngine upon race completion)
     */
    static async settleRaceBets(raceId, winnerHorseId, jackpotMultiplier = 1, db = pool) {
        const pendingBets = await BetModel.findByRaceId(raceId, db);
        if (!pendingBets || pendingBets.length === 0) return;

        const multiplier = Math.max(1, Number(jackpotMultiplier) || 1);
        const isJackpot = multiplier > 1;

        // 1. Process and mark all bets (WON vs LOST)
        const userSettlements = new Map(); // userId -> { wonBets: [], lostBets: [], totalWonPayout: 0, totalBetPlaced: 0 }

        for (const bet of pendingBets) {
            if (bet.status !== 'PENDING') continue;

            const uId = Number(bet.user_id);
            if (!userSettlements.has(uId)) {
                userSettlements.set(uId, { wonBets: [], lostBets: [], totalWonPayout: 0, totalBetPlaced: 0, gameSerial: bet.game_serial });
            }
            const uData = userSettlements.get(uId);
            uData.totalBetPlaced += Number(bet.amount);

            const isWinner = Number(bet.horse_id) === Number(winnerHorseId);

            if (isWinner) {
                // Strictly 10X Standard Multiplier (e.g. ₹10 -> ₹100, ₹20 -> ₹200, ₹50 -> ₹500)
                const betOdds = Number(bet.odds) >= 10 ? Number(bet.odds) : 10.0;
                const basePayout = Number((Number(bet.amount) * betOdds).toFixed(4));
                const totalPayout = Number((basePayout * multiplier).toFixed(4));
                await BetModel.updateStatus(bet.id, { status: 'WON', payoutAmount: totalPayout, jackpotMultiplier: multiplier }, db);

                uData.wonBets.push({ bet, basePayout, totalPayout, odds: betOdds });
                uData.totalWonPayout += totalPayout;
            } else {
                await BetModel.updateStatus(bet.id, { status: 'LOST', payoutAmount: 0, jackpotMultiplier: multiplier }, db);
                uData.lostBets.push(bet);
            }
        }

        // 2. Credit Wallets, Update Lifetime Stats, and Emit Real-time Sockets
        const WalletService = require('./wallet.service');
        const { socketService } = require('./socket.service');

        for (const [userId, uData] of userSettlements.entries()) {
            try {
                let wallet = await WalletModel.findByUserId(userId, db);
                if (!wallet) continue;

                let curBal = Number(wallet.balance);
                let newBal = curBal;

                if (uData.totalWonPayout > 0) {
                    newBal = curBal + uData.totalWonPayout;
                    await WalletModel.updateBalance(wallet.id, newBal.toFixed(4), db);

                    // Group won bets by horse to prevent duplicate ledger transactions
                    const horseWinMap = new Map();
                    for (const wonItem of uData.wonBets) {
                        const hId = Number(wonItem.bet.horse_id);
                        if (horseWinMap.has(hId)) {
                            const existing = horseWinMap.get(hId);
                            existing.totalPayout += wonItem.totalPayout;
                            existing.basePayout += wonItem.basePayout;
                        } else {
                            horseWinMap.set(hId, { ...wonItem });
                        }
                    }

                    for (const wonItem of horseWinMap.values()) {
                        const { bet, totalPayout, basePayout, odds } = wonItem;
                        const winDesc = isJackpot
                            ? `Won ₹${totalPayout.toFixed(2)} [🔥 ${multiplier}X JACKPOT! 🔥] on Horse #${bet.horse_serial} (${bet.horse_name}) [Race #${bet.game_serial}]`
                            : `Won ₹${totalPayout.toFixed(2)} (10X Multiplier) on Horse #${bet.horse_serial} (${bet.horse_name}) [Race #${bet.game_serial}]`;

                        const txId = await WalletModel.createTransaction(
                            {
                                walletId: wallet.id,
                                userId,
                                type: 'credit',
                                category: isJackpot ? 'jackpot_win' : 'bet_win',
                                amount: totalPayout.toFixed(4),
                                balanceBefore: curBal.toFixed(4),
                                balanceAfter: newBal.toFixed(4),
                                referenceId: String(bet.race_id || raceId),
                                referenceType: isJackpot ? 'jackpot_win' : 'bet_win',
                                description: winDesc,
                                status: 'completed',
                            },
                            db
                        );

                        const txPayload = {
                            transactionId: txId,
                            walletId: Number(wallet.id),
                            userId: Number(userId),
                            type: 'credit',
                            category: isJackpot ? 'jackpot_win' : 'bet_win',
                            amount: Number(totalPayout.toFixed(2)),
                            baseAmount: Number(basePayout.toFixed(2)),
                            odds: Number(odds),
                            jackpotMultiplier: multiplier,
                            isJackpot,
                            displayAmount: `+₹${totalPayout.toFixed(2)}`,
                            balanceBefore: Number(curBal.toFixed(2)),
                            balanceAfter: Number(newBal.toFixed(2)),
                            displayBalance: `₹${newBal.toFixed(2)}`,
                            description: winDesc,
                            createdAt: new Date().toISOString(),
                        };

                        socketService.notifyUser(userId, 'ledger:transaction', txPayload);
                        if (socketService.io) {
                            socketService.io.to('admin').emit('admin:wallet_transaction', txPayload);
                        }
                    }
                }

                // Fetch updated user lifetime statistics (totalWon, totalInvested, netProfitLoss)
                const userStats = await WalletService.getUserStats(userId, db);
                const hasWon = uData.totalWonPayout > 0;
                const netRaceProfit = Number((uData.totalWonPayout - uData.totalBetPlaced).toFixed(2));

                const walletPayload = {
                    success: true,
                    userId: Number(userId),
                    walletId: Number(wallet.id),
                    balance: Number(newBal.toFixed(2)),
                    displayBalance: `₹${newBal.toFixed(2)}`,
                    coins: Number(newBal.toFixed(2)),
                    currency: wallet.currency || 'INR',
                    totalWon: userStats.totalWon,
                    displayTotalWon: userStats.displayTotalWon,
                    totalInvested: userStats.totalInvested,
                    displayTotalInvested: userStats.displayTotalInvested,
                    netProfitLoss: userStats.netProfitLoss,
                    displayNetProfitLoss: userStats.displayNetProfitLoss,
                    totalBets: userStats.totalBets,
                    totalWins: userStats.totalWins,
                    lastWonAmount: uData.totalWonPayout,
                    timestamp: new Date().toISOString(),
                };

                // Broadcast live updated balance + totalWon
                socketService.notifyUser(userId, 'wallet:balance', walletPayload);

                // Broadcast personalized race outcome popup / card
                socketService.notifyUser(userId, 'user:race_result', {
                    raceId,
                    gameSerial: uData.gameSerial,
                    hasBet: true,
                    betOutcome: hasWon ? 'YOU_WON' : 'YOU_LOSE',
                    statusMessage: hasWon ? 'YOU WON' : 'YOU LOSE',
                    currentRoundWonAmount: Number(uData.totalWonPayout.toFixed(2)),
                    wonAmount: Number(uData.totalWonPayout.toFixed(2)),
                    displayWonAmount: hasWon ? `+₹${uData.totalWonPayout.toFixed(2)}` : '₹0.00',
                    displayCurrentRoundWon: hasWon ? `+₹${uData.totalWonPayout.toFixed(2)}` : '₹0.00',
                    currentRoundBetAmount: Number(uData.totalBetPlaced.toFixed(2)),
                    totalBetAmount: Number(uData.totalBetPlaced.toFixed(2)),
                    currentRoundNetProfit: netRaceProfit,
                    netProfit: netRaceProfit,
                    displayNetProfit: netRaceProfit >= 0 ? `+₹${netRaceProfit.toFixed(2)}` : `-₹${Math.abs(netRaceProfit).toFixed(2)}`,
                    balance: Number(newBal.toFixed(2)),
                    coins: Number(newBal.toFixed(2)),
                    totalWon: userStats.totalWon,
                    displayTotalWon: userStats.displayTotalWon,
                    oddsMultiplier: 10,
                    jackpotMultiplier: multiplier,
                    timestamp: new Date().toISOString(),
                });

            } catch (err) {
                console.error(`[BetService] Error finalizing settlements for user ${userId}:`, err.message);
            }
        }

        // 3. Notify Connected Active Users who DID NOT place any bet in this race (Outcome = NO_BET, Win = 0)
        try {
            const connectedUserIds = new Set(socketService.authenticatedUsers.values());
            const raceObj = await RaceModel.findById(raceId, db);
            const raceSerial = raceObj ? String(raceObj.game_serial) : String(raceId);

            for (const activeUserId of connectedUserIds) {
                if (!activeUserId || userSettlements.has(Number(activeUserId))) continue;

                const uId = Number(activeUserId);
                let uWallet = await WalletModel.findByUserId(uId, db);
                const uBal = uWallet ? Number(Number(uWallet.balance).toFixed(2)) : 0;
                const uStats = await WalletService.getUserStats(uId, db);

                socketService.notifyUser(uId, 'user:race_result', {
                    raceId,
                    gameSerial: raceSerial,
                    hasBet: false,
                    betOutcome: 'NO_BET',
                    statusMessage: 'NO BET PLACED',
                    currentRoundWonAmount: 0,
                    wonAmount: 0,
                    displayWonAmount: '₹0.00',
                    displayCurrentRoundWon: '₹0.00',
                    currentRoundBetAmount: 0,
                    totalBetAmount: 0,
                    currentRoundNetProfit: 0,
                    netProfit: 0,
                    displayNetProfit: '₹0.00',
                    balance: uBal,
                    coins: uBal,
                    totalWon: uStats.totalWon,
                    displayTotalWon: uStats.displayTotalWon,
                    oddsMultiplier: 10,
                    jackpotMultiplier: multiplier,
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (noBetErr) {
            console.error('[BetService] Error broadcasting no-bet result to passive users:', noBetErr.message);
        }
    }


    /**
     * Get Authoritative Result Screen Summary for Finish Screen Popup / Screenshot
     * Handles:
     *  1. USER WITH NO BET: Status 'NO BET PLACED', yourBet 'NONE', totalBetAmount 0, wonAmount 0, current balance.
     *  2. USER WON: Status 'YOU WON', winner details, yourBet details (+COINS = 100, 200), wonAmount (+₹200), updated balance.
     *  3. USER LOST: Status 'YOU LOSE', winner details, yourBet details (-COINS = 100), wonAmount 0, current balance.
     */
    static async getFinishScreenResult(userId = null, raceIdentifier = null) {
        let raceData = null;
        const currentState = raceEngine.getCurrentState();

        // 1. Resolve Target Race
        if (raceIdentifier) {
            if (currentState && currentState.active && (String(currentState.id) === String(raceIdentifier) || String(currentState.gameSerial) === String(raceIdentifier))) {
                raceData = currentState;
            } else {
                let dbRace = await RaceModel.findByGameSerial(raceIdentifier);
                if (!dbRace && !isNaN(Number(raceIdentifier))) {
                    dbRace = await RaceModel.findById(Number(raceIdentifier));
                }
                if (dbRace) {
                    const resultData = await RaceModel.getRaceResult(dbRace.id);
                    raceData = {
                        id: dbRace.id,
                        gameSerial: dbRace.game_serial,
                        status: dbRace.status,
                        winnerHorseId: dbRace.winner_horse_id,
                        winner: resultData?.winner ? {
                            id: resultData.winner.horse_id,
                            serialNumber: resultData.winner.serial_number,
                            name: resultData.winner.horse_name_snapshot,
                            finishPosition: resultData.winner.finish_position,
                            finishTime: resultData.winner.finish_time,
                        } : null,
                        horses: resultData?.horses || [],
                    };
                }
            }
        } else {
            if (currentState && currentState.active) {
                raceData = currentState;
            } else {
                const recent = await RaceModel.getRecentRaces(1);
                if (recent && recent.length > 0) {
                    const resultData = await RaceModel.getRaceResult(recent[0].id);
                    raceData = {
                        id: recent[0].id,
                        gameSerial: recent[0].game_serial,
                        status: recent[0].status,
                        winnerHorseId: recent[0].winner_horse_id,
                        winner: {
                            id: recent[0].winner_horse_id,
                            serialNumber: recent[0].winner_serial_number,
                            name: recent[0].winner_horse_name,
                            finishTime: '19.85',
                        },
                    };
                }
            }
        }

        if (!raceData) {
            const error = new Error('No race found to display result screen');
            error.statusCode = 404;
            throw error;
        }

        // 2. Winner and Track Record
        const winnerSerial = raceData.winner ? raceData.winner.serialNumber : null;
        const winnerName = raceData.winner ? (raceData.winner.name || raceData.winner.horse_name_snapshot) : 'Pending';
        const finishTime = raceData.winner?.finishTime ? `${Number(raceData.winner.finishTime).toFixed(2)}s` : '19.85s';
        const distance = '1000M';

        // 3. Auto Next Race Countdown
        const autoNextRaceInSec = 5;
        const autoNextRaceMessage = 'AUTO NEXT RACE IN 5 SECONDS';

        // 4. Resolve User Bets & Wallet Balance
        let userBalance = 0;
        let currency = 'INR';
        let userBets = [];
        let hasBet = false;
        let betOutcome = 'NO_BET'; // 'NO_BET' | 'YOU_WON' | 'YOU_LOSE'
        let statusMessage = 'NO BET PLACED';
        let totalBetAmount = 0;
        let totalWonAmount = 0;
        let netProfit = 0;
        let yourBetDisplay = 'NONE';
        let coinBreakdown = [];

        if (userId) {
            const wallet = await WalletModel.findByUserId(userId);
            if (wallet) {
                userBalance = Number(Number(wallet.balance).toFixed(2));
                currency = wallet.currency;
            }

            const betsInDb = await BetModel.findByRaceAndUser(raceData.id, userId);
            if (betsInDb && betsInDb.length > 0) {
                hasBet = true;
                userBets = betsInDb.map((b) => this.formatBet(b));
                totalBetAmount = userBets.reduce((sum, b) => sum + b.amount, 0);
                totalWonAmount = userBets.reduce((sum, b) => sum + (b.payoutAmount || 0), 0);
                coinBreakdown = userBets.map((b) => b.amount);

                if (totalWonAmount > 0) {
                    betOutcome = 'YOU_WON';
                    statusMessage = 'YOU WON';
                    netProfit = Number((totalWonAmount - totalBetAmount).toFixed(2));
                    yourBetDisplay = userBets.map((b) => `Horse #${b.horseSerial} (${b.horseName}): ₹${b.amount} [WON: +₹${b.payoutAmount}]`).join(', ');
                } else {
                    betOutcome = 'YOU_LOSE';
                    statusMessage = 'YOU LOSE';
                    netProfit = -Number(totalBetAmount.toFixed(2));
                    yourBetDisplay = userBets.map((b) => `Horse #${b.horseSerial} (${b.horseName}): ₹${b.amount}`).join(', ');
                }
            }
        }

        const jackpotMultiplier = Number(raceData.jackpot_multiplier || raceData.jackpotMultiplier || 1);
        const isJackpot = jackpotMultiplier > 1;

        return {
            success: true,
            screen: 'FINISH_RESULT_SCREEN',
            race: {
                id: raceData.id,
                gameSerial: String(raceData.gameSerial),
                status: raceData.status,
                distance,
                trackRecord: finishTime,
            },
            winner: {
                serialNumber: winnerSerial,
                name: winnerName,
                display: winnerSerial ? `${winnerSerial} ${winnerName}` : 'Pending',
                finishTime,
            },
            jackpot: {
                isJackpot,
                multiplier: jackpotMultiplier,
                label: isJackpot ? `${jackpotMultiplier}X` : 'N',
                slots: ['N', '2X', '3X', '4X'],
                message: isJackpot ? `🎉 ${jackpotMultiplier}X JACKPOT MULTIPLIER APPLIED!` : 'N (Nothing - Standard Payout)',
            },
            userOutcome: {
                hasBet,
                betOutcome,
                statusMessage: isJackpot && betOutcome === 'YOU_WON' ? `YOU WON (${jackpotMultiplier}X JACKPOT!)` : statusMessage,
                yourBet: yourBetDisplay,
                currentRoundWonAmount: Number(totalWonAmount.toFixed(2)),
                wonAmount: Number(totalWonAmount.toFixed(2)),
                displayWonAmount: totalWonAmount > 0 ? `+₹${totalWonAmount.toFixed(2)}` : '₹0.00',
                displayCurrentRoundWon: totalWonAmount > 0 ? `+₹${totalWonAmount.toFixed(2)}` : '₹0.00',
                currentRoundBetAmount: Number(totalBetAmount.toFixed(2)),
                totalBetAmount: Number(totalBetAmount.toFixed(2)),
                coins: coinBreakdown,
                currentRoundNetProfit: netProfit,
                netProfit,
                displayNetProfit: netProfit >= 0 ? `+₹${netProfit.toFixed(2)}` : `-₹${Math.abs(netProfit).toFixed(2)}`,
                userBalance,
                coinsBalance: userBalance,
                currency,
                totalWon: (userId && (await WalletService.getUserStats(userId)).totalWon) || 0,
                displayTotalWon: (userId && (await WalletService.getUserStats(userId)).displayTotalWon) || '₹0.00',
                totalInvested: (userId && (await WalletService.getUserStats(userId)).totalInvested) || 0,
                lifetimeNetProfit: (userId && (await WalletService.getUserStats(userId)).netProfitLoss) || 0,
                bets: userBets,
            },
            autoNextRace: {
                inSeconds: autoNextRaceInSec,
                message: autoNextRaceMessage,
            },
        };
    }

}

module.exports = BetService;
