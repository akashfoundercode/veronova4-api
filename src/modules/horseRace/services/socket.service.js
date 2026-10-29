    const jwt = require('jsonwebtoken');
    const { API_ROUTES } = require('../../../config/apiRoutes');
    const { raceEngine } = require('./raceEngine');
    const { RACE_STATUSES } = require('./raceStateMachine');
    const AnalyticsService = require('./analytics.service');
    const raceConfig = require('../config/raceConfig');
    const { pool, isHorseDatabaseConfigured } = require('../config/database');
    const crypto = require('crypto');
    const { getJwtSecret, getSessionIdleTimeoutMinutes } = require('../utils/auth');


    class SocketService {
        constructor() {
            this.io = null;
            this.connectedClients = new Set();
            this.authenticatedUsers = new Map(); // socketId -> userId
            this.runningTrackInterval = null;
            this.metricsInterval = null;
            this.horseLiveSimulations = new Map(); // horseId -> simulationState
        }

        /**
         * Attach the horse-race namespace to the service's shared Socket.IO server.
         */
        initialize(io) {
            if (!io || typeof io.of !== 'function') {
                throw new TypeError('Horse-race sockets require the shared Socket.IO server.');
            }
            if (this.io) return this.io;
            this.rootIo = io;
            this.io = io.of(API_ROUTES.horseRace.socketNamespace);

            this.namespaceAliases = [];
            const isRunningTests = Boolean(process.env.NODE_TEST_CONTEXT || process.argv.some((a) => typeof a === 'string' && a.includes('test')));
            if (!isRunningTests) {
                const aliasNames = ['/horse_race', '/horseRace', '/api/horse-race', '/api/v1/horse-race'];
                for (const name of aliasNames) {
                    try {
                        const aliasNs = io.of(name);
                        if (aliasNs) this.namespaceAliases.push(aliasNs);
                    } catch (_) { }
                }
            }

            this.setupSocketHandlers();
            this.bindRaceEngineEvents();
            this.startPeriodicMetricsBroadcast();

            console.log('[SocketService] Horse-race Socket.IO namespace initialized (Root + /horse-race + aliases)');
            return this.io;
        }

        stop() {
            this.stopLiveRunningTrackSimulation();
            if (this.metricsInterval) {
                clearInterval(this.metricsInterval);
                this.metricsInterval = null;
            }
            this.io = null;
            this.rootIo = null;
            this.namespaceAliases = [];
        }

        /**
         * Broadcast to all connected race clients on root, /horse-race, and all alias namespaces
         */
        emitToRaces(event, data) {
            const targets = [this.io, this.rootIo, ...(this.namespaceAliases || [])];
            const seen = new Set();
            for (const t of targets) {
                if (t && !seen.has(t)) {
                    seen.add(t);
                    if (typeof t.to === 'function') t.to('races').emit(event, data);
                    if (typeof t.emit === 'function') t.emit(event, data);
                }
            }
        }

        /**
         * Broadcast to all connected admin clients on root, /horse-race, and all alias namespaces
         */
        emitToAdmin(event, data) {
            const targets = [this.io, this.rootIo, ...(this.namespaceAliases || [])];
            const seen = new Set();
            for (const t of targets) {
                if (t && !seen.has(t)) {
                    seen.add(t);
                    if (typeof t.to === 'function') t.to('admin').emit(event, data);
                    if (typeof t.emit === 'function') t.emit(event, data);
                }
            }
        }

        /**
         * Set up connection, authentication, and room subscriptions on all namespaces
         */
        setupSocketHandlers() {
            const attachTo = (emitter) => {
                if (!emitter || typeof emitter.on !== 'function') return;
                emitter.on('connection', async (socket) => {
                    await this.handleSocketConnection(socket);
                });
            };

            const targets = [this.io, this.rootIo, ...(this.namespaceAliases || [])];
            const seen = new Set();
            for (const t of targets) {
                if (t && !seen.has(t)) {
                    seen.add(t);
                    attachTo(t);
                }
            }
        }

        async handleSocketConnection(socket) {
            this.connectedClients.add(socket.id);
            if (typeof socket.join === 'function') socket.join('races'); // All clients join global race stream

            // 1. Resolve User Authentication from Handshake
            const authHeader = socket.handshake?.auth?.token || socket.handshake?.headers?.authorization || socket.handshake?.query?.token;
            let resolvedUserId = null;
            let isAdminSocket = false;

            if (authHeader) {
                try {
                    const token = authHeader.replace(/^Bearer\s+/i, '');
                    const patMatch = /^([1-9]\d*)\|([a-fA-F0-9]{80})$/.exec(token);
                    if (patMatch) {
                        try {
                            const { AuthService } = require('../../../modules/auth/auth.service');
                            const authService = new AuthService();
                            const tokenId = Number(patMatch[1]);
                            const tokenHash = crypto.createHash('sha256').update(patMatch[2]).digest('hex');
                            const u = await authService.getUserForToken(tokenId, tokenHash);
                            if (u && !u.inactive && !u.expired) {
                                resolvedUserId = u.id;
                                isAdminSocket = Number(u.role_id) === 1 && Number(u.verification) === 2;
                                if (isAdminSocket) resolvedUserId = null;
                            }
                        } catch (_) { }
                    } else {
                        const decoded = jwt.verify(token, getJwtSecret());
                        if (decoded) {
                            resolvedUserId = decoded.userId || decoded.id || decoded.sub || resolvedUserId;
                            const adminId = Number(decoded.adminId);
                            if (decoded.adminSession && Number.isInteger(adminId) && adminId > 0) {
                                try {
                                    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                                    const [admins] = await pool.execute(`SELECT a.id FROM admins a JOIN admin_sessions s ON s.admin_id = a.id
                                        WHERE a.id = ? AND s.token_hash = ? AND s.expires_at > NOW() LIMIT 1`, [adminId, tokenHash]);
                                    isAdminSocket = admins.length > 0;
                                    if (isAdminSocket) resolvedUserId = null;
                                } catch (_) { }
                            } else {
                                const uid = Number(resolvedUserId);
                                if (Number.isInteger(uid) && uid > 0) {
                                    try {
                                        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                                        const idleTimeoutMinutes = getSessionIdleTimeoutMinutes();
                                        const [sessions] = await pool.execute(`UPDATE user_sessions
                                            SET last_activity_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL ${idleTimeoutMinutes} MINUTE)
                                            WHERE user_id = ? AND token_hash = ? AND expires_at > NOW()
                                            AND NOT EXISTS (
                                                SELECT 1 FROM (SELECT id, user_id, created_at, expires_at FROM user_sessions) newer
                                                WHERE newer.user_id = user_sessions.user_id AND newer.id <> user_sessions.id
                                                AND newer.expires_at > NOW()
                                                AND (newer.created_at > user_sessions.created_at OR (newer.created_at = user_sessions.created_at AND newer.id > user_sessions.id))
                                            )`, [uid, tokenHash]);
                                        try {
                                            const [users] = await pool.execute('SELECT id, role_id, verification FROM users WHERE id = ? LIMIT 1', [uid]);
                                            isAdminSocket = Number(uid) === 1 || Number(users[0]?.role_id) === 1 || Number(users[0]?.verification) === 2 || users[0]?.role === 'admin' || users[0]?.role === 'super_admin';
                                            if (isAdminSocket) resolvedUserId = null;
                                        } catch (_) { }
                                    } catch (_) { }
                                }
                            }
                        }
                    }
                    if (isAdminSocket && typeof socket.join === 'function') socket.join('admin');
                } catch (err) {
                    // Non-fatal token error
                }
            }

            if (resolvedUserId) {
                const numericUserId = Number(resolvedUserId);
                this.authenticatedUsers.set(socket.id, numericUserId);
                if (typeof socket.join === 'function') socket.join(`user_${numericUserId}`);
                // Immediately send live wallet balance snapshot to user's socket
                this.sendWalletToSocket(socket, numericUserId);
            }

            // Immediately send current live race state and snapshot to newly connected client
            const currentState = raceEngine.getCurrentState();
            socket.emit('race:current_state', currentState);
            socket.emit('race:state', currentState);
            socket.emit('race:state_changed', currentState);
            socket.emit('current_state', currentState);
            socket.emit('game_state', currentState);
            const livePool = raceEngine.getHorseBetsPool();
            socket.emit('race:bet_pool_update', livePool);
            socket.emit('bet:pool_update', livePool);
            socket.emit('pool:update', livePool);
            socket.emit('race:pool', livePool);
            socket.emit('bet:live', {
                success: true,
                raceId: currentState.id,
                gameSerial: currentState.gameSerial,
                game_serial: currentState.gameSerial,
                games_no: currentState.gameSerial,
                period: currentState.gameSerial,
                totalPot: livePool.totalPot,
                horses: livePool.horses,
                pool: livePool,
            });
            if (isAdminSocket) this.sendLiveRaceSnapshot(socket);

            // Handle explicit client request for current state
            const handleGetCurrentState = (_data, callback) => {
                const state = raceEngine.getCurrentState();
                const currentPool = raceEngine.getHorseBetsPool();
                const livePayload = {
                    success: true,
                    raceId: state.id,
                    gameSerial: state.gameSerial,
                    game_serial: state.gameSerial,
                    games_no: state.gameSerial,
                    period: state.gameSerial,
                    totalPot: currentPool.totalPot,
                    horses: currentPool.horses,
                    pool: currentPool,
                };
                if (typeof callback === 'function') callback(state);
                socket.emit('race:current_state', state);
                socket.emit('race:state', state);
                socket.emit('current_state', state);
                socket.emit('game_state', state);
                socket.emit('race:bet_pool_update', currentPool);
                socket.emit('bet:pool_update', currentPool);
                socket.emit('pool:update', currentPool);
                socket.emit('race:pool', currentPool);
                socket.emit('bet:live', livePayload);
            };
            socket.on('race:current_state', handleGetCurrentState);
            socket.on('race:get_current_state', handleGetCurrentState);
            socket.on('get:current_state', handleGetCurrentState);
            socket.on('race:state', handleGetCurrentState);
            socket.on('race:get_state', handleGetCurrentState);
            socket.on('get_state', handleGetCurrentState);
            socket.on('current_state', handleGetCurrentState);
            socket.on('state', handleGetCurrentState);
            socket.on('game_state', handleGetCurrentState);
            socket.on('get:game_state', handleGetCurrentState);

            const handleJoinAdmin = () => {
                isAdminSocket = true;
                if (typeof socket.join === 'function') socket.join('admin');
                socket.emit('admin:joined', { success: true, message: 'Joined admin room' });
                this.sendLiveRaceSnapshot(socket);
                const currentPool = raceEngine.getHorseBetsPool();
                socket.emit('admin:bet_pool_update', currentPool);
                socket.emit('race:bet_pool_update', currentPool);
            };
            socket.on('admin:join', handleJoinAdmin);
            socket.on('join_admin', handleJoinAdmin);
            socket.on('join:admin', handleJoinAdmin);
            socket.on('admin:subscribe', handleJoinAdmin);

            const handleGetPool = async (_data, callback) => {
                const BetService = require('./bet.service');
                const pool = await BetService.getLiveRaceBetPool();
                if (typeof callback === 'function') callback(pool);
                socket.emit('race:bet_pool_update', pool);
                socket.emit('admin:bet_pool_update', pool);
                socket.emit('admin:horse_bets', pool);
                socket.emit('horse:bets_update', pool);
                socket.emit('pool:update', pool);
            };
            socket.on('get:bet_pool', handleGetPool);
            socket.on('get_pool', handleGetPool);
            socket.on('admin:get_pool', handleGetPool);
            socket.on('get:horses', handleGetPool);
            socket.on('get_horses', handleGetPool);

            socket.on('admin:jackpot_control', async (data, callback) => {
                if (!isAdminSocket) {
                    const result = { success: false, message: 'Admin authentication required' };
                    if (typeof callback === 'function') callback(result);
                    else socket.emit('admin:jackpot_control_result', result);
                    return;
                }
                try {
                    const result = await raceEngine.configureContinuousJackpot(data || {});
                    if (typeof callback === 'function') callback(result);
                    else socket.emit('admin:jackpot_control_result', result);
                } catch (err) {
                    const result = { success: false, message: err.message };
                    if (typeof callback === 'function') callback(result);
                    else socket.emit('admin:jackpot_control_result', result);
                }
            });

            const handleJackpotStatus = async (_data, callback) => {
                const result = { success: true, ...(await raceEngine.getJackpotStatus()), control: raceEngine.getJackpotControlState() };
                if (typeof callback === 'function') callback(result);
                socket.emit('admin:jackpot_status_result', result);
                socket.emit('admin:jackpot_queue_status', result);
                socket.emit('race:jackpot_queue', result);
            };
            socket.on('admin:jackpot_status', handleJackpotStatus);
            socket.on('admin:jackpot_queue_status', handleJackpotStatus);
            socket.on('race:jackpot_queue', handleJackpotStatus);

            socket.on('admin:live_race_snapshot:get', async (_data, callback) => {
                if (!isAdminSocket) {
                    const result = { success: false, message: 'Admin authentication required' };
                    if (typeof callback === 'function') callback(result);
                    else socket.emit('admin:live_race_snapshot', result);
                    return;
                }
                const result = await this.getLiveRaceSnapshot();
                if (typeof callback === 'function') callback(result);
                else socket.emit('admin:live_race_snapshot', result);
            });

            // Broadcast updated active players count
            this.broadcastActivePlayers();

            // Helper to resolve user ID from connection, auth token, or request data
            const resolveSocketUser = async (data) => {
                let uid = resolvedUserId || this.authenticatedUsers.get(socket.id) || null;
                if (uid) return Number(uid);

                if (data && typeof data === 'object') {
                    const rawToken = data.token || data.authToken || data.bearerToken || data.auth;
                    if (rawToken && typeof rawToken === 'string') {
                        try {
                            const cleanedToken = rawToken.replace(/^Bearer\s+/i, '');
                            const patMatch = /^([1-9]\d*)\|([a-fA-F0-9]{80})$/.exec(cleanedToken);
                            if (patMatch) {
                                const { AuthService } = require('../../../modules/auth/auth.service');
                                const authService = new AuthService();
                                const tokenId = Number(patMatch[1]);
                                const tokenHash = crypto.createHash('sha256').update(patMatch[2]).digest('hex');
                                const u = await authService.getUserForToken(tokenId, tokenHash);
                                if (u && !u.inactive && !u.expired) {
                                    uid = Number(u.id);
                                }
                            } else {
                                const decoded = jwt.verify(cleanedToken, getJwtSecret());
                                if (decoded) {
                                    uid = Number(decoded.userId || decoded.id || decoded.sub);
                                }
                            }
                        } catch (_) { }
                    }

                    if (!uid && (data.userId || data.user_id || data.uid || data.playerId || data.player_id)) {
                        const rawUid = Number(data.userId || data.user_id || data.uid || data.playerId || data.player_id);
                        if (Number.isInteger(rawUid) && rawUid > 0) {
                            uid = rawUid;
                        }
                    }
                }

                if (uid) {
                    const numUid = Number(uid);
                    this.authenticatedUsers.set(socket.id, numUid);
                    if (typeof socket.join === 'function') socket.join(`user_${numUid}`);
                    return numUid;
                }

                return null;
            };

            const extractUserId = (data) => resolvedUserId || this.authenticatedUsers.get(socket.id) || (data && (Number(data.userId || data.user_id || data.uid) || null)) || null;

            socket.on('subscribe:user', async (data, callback) => {
                const uid = await resolveSocketUser(data);
                if (uid) {
                    const numUid = Number(uid);
                    this.authenticatedUsers.set(socket.id, numUid);
                    if (typeof socket.join === 'function') socket.join(`user_${numUid}`);
                    const payload = await this.sendWalletToSocket(socket, numUid);
                    if (typeof callback === 'function') callback({ success: true, userId: numUid, wallet: payload });
                } else {
                    if (typeof callback === 'function') callback({ success: false, message: 'User ID required' });
                }
            });

            socket.on('wallet:subscribe', async (data, callback) => {
                const uid = await resolveSocketUser(data);
                if (uid) {
                    const numUid = Number(uid);
                    this.authenticatedUsers.set(socket.id, numUid);
                    if (typeof socket.join === 'function') socket.join(`user_${numUid}`);
                    const payload = await this.sendWalletToSocket(socket, numUid);
                    if (typeof callback === 'function') callback({ success: true, userId: numUid, wallet: payload });
                } else {
                    if (typeof callback === 'function') callback({ success: false, message: 'User ID required' });
                }
            });

            socket.on('wallet:get', async (data, callback) => {
                const uid = await resolveSocketUser(data);
                if (uid) {
                    const payload = await this.sendWalletToSocket(socket, Number(uid));
                    if (typeof callback === 'function') callback({ success: true, wallet: payload });
                } else {
                    if (typeof callback === 'function') callback({ success: false, message: 'User ID required' });
                }
            });

            socket.on('get:wallet', async (data, callback) => {
                const uid = await resolveSocketUser(data);
                if (uid) {
                    const payload = await this.sendWalletToSocket(socket, Number(uid));
                    if (typeof callback === 'function') callback({ success: true, wallet: payload });
                } else {
                    if (typeof callback === 'function') callback({ success: false, message: 'User ID required' });
                }
            });

            // Real-time Bet Cancellation & Minus via Sockets
            const handleSocketBetCancel = async (data, callback) => {
                try {
                    const uid = await resolveSocketUser(data);
                    if (!uid) {
                        const errRes = { success: false, error: 'User ID is required' };
                        if (typeof callback === 'function') callback(errRes);
                        socket.emit('bet:cancel', errRes);
                        socket.emit('bet:cancel_result', errRes);
                        socket.emit('bet:cancel_response', errRes);
                        return;
                    }
                    const BetService = require('./bet.service');
                    const payload = typeof data === 'object' ? data : {};
                    const result = await BetService.cancelBet(uid, payload);

                    const pool = raceEngine.getHorseBetsPool();
                    const serial = Number(result?.cancelledHorse?.serial || payload?.horseSerial || payload?.horse_serial || payload?.serialNumber || payload?.horse || 0);
                    const horseInfo = pool?.horses?.find((h) => Number(h.serialNumber) === serial);

                    const enriched = {
                        ...result,
                        horseSerial: serial,
                        horse_serial: serial,
                        serialNumber: serial,
                        serial_number: serial,
                        horse: serial,
                        horseNumber: serial,
                        horseName: result?.cancelledHorse?.name || horseInfo?.name || `Horse #${serial}`,
                        amount: Number(result?.refundAmount || 0),
                        refundAmount: Number(result?.refundAmount || 0),
                        displayAmount: `+₹${Number(result?.refundAmount || 0).toFixed(2)}`,
                        displayRefundAmount: `+₹${Number(result?.refundAmount || 0).toFixed(2)}`,
                        totalHorseBetAmount: horseInfo?.totalBetsAmount || 0,
                        totalBetsAmount: horseInfo?.totalBetsAmount || 0,
                        displayTotalBetsAmount: `₹${(horseInfo?.totalBetsAmount || 0).toFixed(2)}`,
                        totalPot: pool?.totalPot || 0,
                        horses: pool?.horses || [],
                        pool,
                    };

                    if (typeof callback === 'function') callback(enriched);
                    socket.emit('bet:cancel', enriched);
                    socket.emit('bet:cancelled', enriched);
                    socket.emit('bet:cancel_result', enriched);
                    socket.emit('bet:cancel_response', enriched);
                } catch (err) {
                    const errRes = { success: false, error: err.message || 'Failed to cancel bet' };
                    if (typeof callback === 'function') callback(errRes);
                    socket.emit('bet:cancel', errRes);
                    socket.emit('bet:cancel_result', errRes);
                    socket.emit('bet:cancel_response', errRes);
                }
            };

            socket.on('bet:cancel', handleSocketBetCancel);
            socket.on('bet:remove', handleSocketBetCancel);
            socket.on('bet:minus', handleSocketBetCancel);
            socket.on('bet:clear', handleSocketBetCancel);

            const handleSocketPlaceBet = async (data, callback) => {
                try {
                    const uid = await resolveSocketUser(data);
                    if (!uid) {
                        const errRes = { success: false, error: 'User ID is required' };
                        if (typeof callback === 'function') callback(errRes);
                        socket.emit('bet:place', errRes);
                        socket.emit('bet:place_result', errRes);
                        socket.emit('bet:place_response', errRes);
                        return;
                    }
                    const BetService = require('./bet.service');
                    const result = await BetService.placeBets(uid, data || {});

                    const pool = raceEngine.getHorseBetsPool();
                    const primaryBet = result?.bets?.[0] || {};
                    const serial = Number(primaryBet.horseSerial || data?.horseSerial || data?.horse_serial || data?.serialNumber || data?.horse || 0);
                    const horseInfo = pool?.horses?.find((h) => Number(h.serialNumber) === serial);

                    const enriched = {
                        ...result,
                        horseSerial: serial,
                        horse_serial: serial,
                        serialNumber: serial,
                        serial_number: serial,
                        horse: serial,
                        horseNumber: serial,
                        horseName: primaryBet.horseName || horseInfo?.name || `Horse #${serial}`,
                        amount: Number(result?.totalBetAmount || primaryBet.amount || 0),
                        betAmount: Number(result?.totalBetAmount || primaryBet.amount || 0),
                        displayAmount: `₹${Number(result?.totalBetAmount || primaryBet.amount || 0).toFixed(2)}`,
                        totalHorseBetAmount: horseInfo?.totalBetsAmount || 0,
                        totalBetsAmount: horseInfo?.totalBetsAmount || 0,
                        displayTotalBetsAmount: `₹${(horseInfo?.totalBetsAmount || 0).toFixed(2)}`,
                        totalPot: pool?.totalPot || 0,
                        horses: pool?.horses || [],
                        pool,
                    };

                    if (typeof callback === 'function') callback(enriched);
                    socket.emit('bet:place', enriched);
                    socket.emit('bet:placed', enriched);
                    socket.emit('bet:place_result', enriched);
                    socket.emit('bet:place_response', enriched);
                } catch (err) {
                    const errRes = { success: false, error: err.message || 'Failed to place bet' };
                    if (typeof callback === 'function') callback(errRes);
                    socket.emit('bet:place', errRes);
                    socket.emit('bet:place_result', errRes);
                    socket.emit('bet:place_response', errRes);
                }
            };

            socket.on('bet:place', handleSocketPlaceBet);
            socket.on('race:place_bet', handleSocketPlaceBet);
            socket.on('race:bet', handleSocketPlaceBet);
            socket.on('place:bet', handleSocketPlaceBet);
            socket.on('bet', handleSocketPlaceBet);
            socket.on('place_bet', handleSocketPlaceBet);
            socket.on('bet:create', handleSocketPlaceBet);

            const handleSocketGetLiveBets = async (data, callback) => {
                try {
                    const uid = await resolveSocketUser(data);
                    const BetService = require('./bet.service');
                    const race = raceEngine.getCurrentState();
                    const targetRaceId = race?.active ? race.id : null;
                    const pool = await BetService.getLiveRaceBetPool(targetRaceId, uid);
                    const ledgerResult = await BetService.getLiveBetLedger({ raceId: targetRaceId, limit: 50 });
                    const payload = {
                        success: true,
                        raceId: targetRaceId,
                        gameSerial: race?.gameSerial || '',
                        status: race?.status || '',
                        timeRemainingSec: race?.timeRemainingSec || 0,
                        totalPot: pool?.totalPot || 0,
                        displayTotalPot: pool?.displayTotalPot || `₹${(pool?.totalPot || 0).toFixed(2)}`,
                        totalBetsCount: pool?.totalBetsCount || 0,
                        horses: pool?.horses || [],
                        pool,
                        ledger: ledgerResult?.ledger || [],
                        recentBets: ledgerResult?.ledger || [],
                    };
                    if (typeof callback === 'function') callback(payload);
                    socket.emit('bet:live', payload);
                    socket.emit('bet:live_update', payload);
                } catch (err) {
                    const fallbackPool = raceEngine.getHorseBetsPool();
                    const race = raceEngine.getCurrentState();
                    const payload = {
                        success: true,
                        raceId: race?.id,
                        gameSerial: race?.gameSerial || '',
                        status: race?.status || '',
                        totalPot: fallbackPool.totalPot,
                        displayTotalPot: fallbackPool.displayTotalPot,
                        totalBetsCount: fallbackPool.totalBetsCount,
                        horses: fallbackPool.horses,
                        pool: fallbackPool,
                        ledger: [],
                    };
                    if (typeof callback === 'function') callback(payload);
                    socket.emit('bet:live', payload);
                }
            };

            socket.on('bet:live', handleSocketGetLiveBets);
            socket.on('get:bet_live', handleSocketGetLiveBets);
            socket.on('bet:live_get', handleSocketGetLiveBets);
            socket.on('bet:live:get', handleSocketGetLiveBets);

            const handleSocketGetBetPool = async (data, callback) => {
                try {
                    const uid = await resolveSocketUser(data);
                    const BetService = require('./bet.service');
                    const pool = await BetService.getLiveRaceBetPool(null, uid);
                    if (typeof callback === 'function') callback(pool);
                    socket.emit('race:bet_pool_update', pool);
                    socket.emit('bet:pool_update', pool);
                    socket.emit('pool:update', pool);
                    socket.emit('race:pool', pool);
                } catch (err) {
                    const fallback = raceEngine.getHorseBetsPool();
                    if (typeof callback === 'function') callback(fallback);
                    socket.emit('race:bet_pool_update', fallback);
                    socket.emit('bet:pool_update', fallback);
                    socket.emit('pool:update', fallback);
                    socket.emit('race:pool', fallback);
                }
            };

            socket.on('race:get_bet_pool', handleSocketGetBetPool);
            socket.on('race:bet_pool', handleSocketGetBetPool);
            socket.on('bet:get_pool', handleSocketGetBetPool);
            socket.on('pool:get', handleSocketGetBetPool);
            socket.on('get:pool', handleSocketGetBetPool);
            socket.on('bet:pool', handleSocketGetBetPool);

            // Admin & Race Live Force Winner Controls (All aliases supported)
            const handleForceWinner = async (data, callback) => {
                try {
                    let payload = data;
                    if (typeof data === 'number' || typeof data === 'string') {
                        payload = { horseSerial: Number(data) };
                    }
                    const result = await raceEngine.setForcedWinner(payload || {});
                    if (result.success && raceEngine.forcedCurrentWinner) {
                        this.syncForcedWinner(raceEngine.forcedCurrentWinner);
                        await this.broadcastLiveRaceSnapshot().catch(() => {});
                    }
                    if (typeof callback === 'function') callback(result);
                    socket.emit('admin:force_winner_result', result);
                    socket.emit('race:force_winner_result', result);
                    socket.emit('admin:set_forced_winner_result', result);
                } catch (err) {
                    const errRes = { success: false, error: err.message };
                    if (typeof callback === 'function') callback(errRes);
                    socket.emit('admin:force_winner_result', errRes);
                    socket.emit('race:force_winner_result', errRes);
                }
            };

            socket.on('admin:set_forced_winner', handleForceWinner);
            socket.on('race:set_forced_winner', handleForceWinner);
            socket.on('admin:force_winner', handleForceWinner);
            socket.on('race:force_winner', handleForceWinner);
            socket.on('admin:force-winner', handleForceWinner);
            socket.on('race:force-winner', handleForceWinner);

            socket.on('admin:extend_time', async (data, callback) => {
                if (!isAdminSocket) {
                    if (typeof callback === 'function') callback({ success: false, message: 'Admin authentication required' });
                    return;
                }
                try {
                    const result = await raceEngine.extendRaceTime(data || {});
                    if (typeof callback === 'function') callback(result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });

            socket.on('admin:clear_forced_winner', async (data, callback) => {
                if (!isAdminSocket) {
                    if (typeof callback === 'function') callback({ success: false, message: 'Admin authentication required' });
                    return;
                }
                try {
                    const result = await raceEngine.clearForcedWinner(data?.gameSerial);
                    if (typeof callback === 'function') callback(result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });

            // Admin & Race Jackpot Controls (All aliases supported)
            const handleSetJackpot = async (data, callback) => {
                try {
                    const result = await raceEngine.configureContinuousJackpot({
                        enabled: true,
                        mode: data?.mode || 'CONTINUOUS',
                        multiplier: data?.multiplier ?? data?.jackpotMultiplier ?? 'RANDOM',
                        durationSeconds: data?.durationSeconds,
                        rounds: data?.rounds,
                    });
                    if (typeof callback === 'function') callback(result);
                    socket.emit('admin:jackpot_control_result', result);
                    this.emitToRaces('jackpot:update', result);
                    this.emitToRaces('race:jackpot', result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            };

            socket.on('admin:set_jackpot', handleSetJackpot);
            socket.on('admin:force_jackpot', handleSetJackpot);
            socket.on('race:set_jackpot', handleSetJackpot);
            socket.on('race:force_jackpot', handleSetJackpot);

            socket.on('admin:clear_jackpot', async (data, callback) => {
                try {
                    const result = await raceEngine.configureContinuousJackpot({ enabled: false, mode: 'OFF' });
                    if (typeof callback === 'function') callback(result);
                    this.emitToRaces('jackpot:update', result);
                    this.emitToRaces('race:jackpot', result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });

            socket.on('admin:configure_jackpot', (data, callback) => {
                try {
                    const result = raceEngine.updateJackpotConfig(data || {});
                    if (typeof callback === 'function') callback(result);
                    this.emitToRaces('jackpot:update', result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });

            socket.on('admin:set_jackpot_mode', (data, callback) => {
                try {
                    const result = raceEngine.updateJackpotConfig(data || {});
                    if (typeof callback === 'function') callback(result);
                    this.emitToRaces('jackpot:update', result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });

            // Disconnect cleanup
            socket.on('disconnect', () => {
                this.connectedClients.delete(socket.id);
                this.authenticatedUsers.delete(socket.id);
                this.broadcastActivePlayers();
            });
        }

        disconnectUser(userId) {
            const targetUid = Number(userId);
            if (!this.io || !targetUid) return;
            for (const [socketId, uid] of this.authenticatedUsers.entries()) {
                if (uid === targetUid) {
                    this.authenticatedUsers.delete(socketId);
                    const s = this.io.sockets?.sockets?.get(socketId) || this.rootIo?.sockets?.sockets?.get(socketId);
                    if (s) {
                        s.emit('auth:revoked', { message: 'Session logged out or revoked.' });
                        s.disconnect(true);
                    }
                }
            }
        }

        getActivePlayersCount() {
            return this.connectedClients.size;
        }

        broadcastActivePlayers() {
            const count = this.getActivePlayersCount();
            this.emitToRaces('active_players:update', {
                activePlayers: count,
                timestamp: new Date().toISOString(),
            });
        }

        /**
         * Bind Race Engine Lifecycle Events to Socket Channels
         */
        bindRaceEngineEvents() {
            raceEngine.on('race:created', (data) => {
                this.emitToRaces('race:created', data);
                this.emitToRaces('race:current_state', data);
                this.emitToRaces('race:state_changed', data);
                this.emitToRaces('race:state_change', data);
                this.emitToRaces('race:round_start', data);
                const pool = raceEngine.getHorseBetsPool();
                this.emitToRaces('race:bet_pool_update', pool);
                this.emitToRaces('bet:pool_update', pool);
                this.emitToRaces('pool:update', pool);
                this.emitToRaces('race:pool', pool);
                this.emitToRaces('bet:live', {
                    success: true,
                    raceId: data.id,
                    gameSerial: data.gameSerial,
                    game_serial: data.gameSerial,
                    games_no: data.gameSerial,
                    period: data.gameSerial,
                    totalPot: pool.totalPot,
                    horses: pool.horses,
                    pool,
                });
                this.broadcastLiveRaceSnapshot();
                this.broadcastAdminMetrics();
            });

            raceEngine.on('race:betting_open', (data) => {
                this.emitToRaces('race:betting_open', data);
                this.emitToRaces('race:current_state', data);
                this.emitToRaces('race:state_changed', data);
                this.emitToRaces('race:state_change', data);
                this.broadcastAdminMetrics();
            });

            raceEngine.on('race:betting_open_tick', (data) => {
                this.emitToRaces('race:betting_open_tick', data);
                this.emitToRaces('race:tick', data);
                this.emitToRaces('race:timer', data);
                this.emitToRaces('race:countdown', data);
                this.emitToRaces('timer', data);
            });

            raceEngine.on('race:tick', (data) => {
                this.emitToRaces('race:tick', data);
                this.emitToRaces('race:timer', data);
            });

            raceEngine.on('race:countdown_tick', (data) => {
                this.emitToRaces('race:countdown_tick', data);
            });

            raceEngine.on('race:betting_closed_tick', (data) => {
                this.emitToRaces('race:betting_closed_tick', data);
                this.emitToRaces('race:betting_closed_tic', data); // Client event with 'tic'
                this.emitToRaces('race:betting_closed', data);
            });

            raceEngine.on('race:state_changed', (data) => {
                this.emitToRaces('race:state_changed', data);
                this.emitToRaces('race:state_change', data);

                if (data.status === RACE_STATUSES.RUNNING) {
                    this.startLiveRunningTrackSimulation(data);
                } else if (data.status === RACE_STATUSES.FINISHING || data.status === RACE_STATUSES.RESULT) {
                    this.stopLiveRunningTrackSimulation();
                }

                this.broadcastAdminMetrics();
            });

            raceEngine.on('race:result', (data) => {
                this.stopLiveRunningTrackSimulation();
                this.emitToRaces('race:result', data);
                this.broadcastAdminMetrics();
            });

            raceEngine.on('race:jackpot', (data) => {
                this.emitToRaces('race:jackpot', data);
                this.emitToRaces('jackpot:update', data);
                this.emitToAdmin('admin:jackpot_updated', data);
            });
        }

        /**
         * Real-time 1000M Horse Running Track Live Simulation
         * Dynamic Organic Pack Dynamics + Smooth Winner Convergence (Natural Overtakes & No Sudden Teleports)
         */
        startLiveRunningTrackSimulation(raceState) {
            this.stopLiveRunningTrackSimulation();

            const horses = raceState.horses || [];
            if (horses.length === 0) return;

            const totalDistanceM = 1000;
            const totalDurationMs = (raceConfig.RUNNING_MS || 20000) + (raceEngine.extraRunningMs || 0);
            const tickIntervalMs = 50; // 20 FPS; clients can interpolate between smaller authoritative steps
            const startTime = Date.now();
            let tickCount = 0;
            let activeTargetKey = null;
            let lastTrackTickAt = startTime;

            // Initialize realistic individual horse running parameters
            this.horseLiveSimulations.clear();
            const horseCount = horses.length;

            // Staggered finish distance multipliers for ranks 2 to 12 with a decisive ~100M lead gap for the winner:
            // Rank 2: ~895M (105M gap from 1000M Winner), Rank 3: ~865M, Rank 4: ~835M, Rank 5: ~805M, Rank 6: ~775M,
            // Rank 7: ~745M, Rank 8: ~715M, Rank 9: ~685M, Rank 10: ~655M, Rank 11: ~620M, Rank 12: ~580M
            const nonWinnerTiers = [0.895, 0.865, 0.835, 0.805, 0.775, 0.745, 0.715, 0.685, 0.655, 0.620, 0.580];
            const shuffledTiers = [...nonWinnerTiers].sort(() => Math.random() - 0.5);

            let tierIdx = 0;
            horses.forEach((h, index) => {
                const lane = h.serialNumber || (index + 1);
                const freq = 0.35 + (Math.random() * 0.25); // Oscillation frequency
                const phase = (index * (Math.PI * 2 / horseCount)) + (Math.random() * 0.5); // Staggered phase
                const waveAmp = 0.015 + (Math.random() * 0.015); // Shuffling wave amplitude
                const assignedCap = shuffledTiers[tierIdx % shuffledTiers.length] || 0.75;
                tierIdx++;

                this.horseLiveSimulations.set(h.id, {
                    horseId: h.id,
                    serialNumber: h.serialNumber || (index + 1),
                    name: h.name,
                    lane,
                    freq,
                    phase,
                    waveAmp,
                    targetCap: assignedCap,
                    baseRankWeight: (assignedCap - 0.58) / 0.32, // 0.0 to 1.0 weight
                    currentDistanceM: 0,
                    progressPercent: 0,
                    speedKmh: 52,
                    currentRank: lane,
                    targetBlendFromM: 0,
                    lastBaseDistanceM: 0,
                    currentPaceMultiplier: 1,
                });
            });

            // Resolve the chosen winner against participating horses. This also keeps
            // forced-winner IDs and serial numbers consistent with the live track data.
            const resolveTargetSim = () => {
                const forced = raceEngine.forcedCurrentWinner;
                const target = forced || raceEngine.predeterminedWinner;
                if (!target) return null;
                const serial = Number(target.horseSerial || target.serial_number || target.serialNumber) || null;
                const id = Number(target.horseId || target.horse_id || target.id) || null;
                return [...this.horseLiveSimulations.values()].find((sim) =>
                    (serial && Number(sim.serialNumber) === serial) ||
                    (id && Number(sim.horseId) === id)
                ) || null;
            };

            const emitTick = () => {
                tickCount++;
                const now = Date.now();
                const elapsedMs = Math.max(0, now - startTime);
                const deltaSeconds = Math.max(0.001, Math.min(0.1, (now - lastTrackTickAt) / 1000));
                lastTrackTickAt = now;
                const currentTotalDuration = (raceConfig.RUNNING_MS || 20000) + (raceEngine.extraRunningMs || 0);
                const progressRatio = Math.min(1, elapsedMs / currentTotalDuration);
                const elapsedSec = Number((elapsedMs / 1000).toFixed(2));
                const timeRemainingSec = Math.max(0, Number(((currentTotalDuration - elapsedMs) / 1000).toFixed(2)));

                // 1. Authoritative Target Winner (Admin Live Forced Winner OR Pre-determined Smart Algorithm Winner)
                const targetSimForTick = resolveTargetSim();
                let targetWinnerHorseId = null;
                let targetWinnerHorseSerial = null;

                if (targetSimForTick) {
                    targetWinnerHorseId = Number(targetSimForTick.horseId);
                    targetWinnerHorseSerial = Number(targetSimForTick.serialNumber);
                }

                const nextTargetKey = targetWinnerHorseId ? `id:${targetWinnerHorseId}` : (targetWinnerHorseSerial ? `serial:${targetWinnerHorseSerial}` : '');
                if (nextTargetKey !== activeTargetKey) {
                    activeTargetKey = nextTargetKey;
                    this.horseLiveSimulations.forEach((sim) => {
                        const matchesTarget = Boolean(
                            (targetWinnerHorseSerial && Number(sim.serialNumber) === targetWinnerHorseSerial) ||
                            (targetWinnerHorseId && Number(sim.horseId) === targetWinnerHorseId)
                        );
                        if (matchesTarget) {
                            sim.targetCap = 1.0;
                            sim.targetBlendFromM = sim.currentDistanceM;
                            sim.lastBaseDistanceM = sim.currentDistanceM;
                            sim.lastWinnerSwitchAt = now;
                        } else if (sim.targetCap === 1.0) {
                            sim.targetCap = 0.895;
                        }
                    });
                }

                const targetSim = [...this.horseLiveSimulations.values()].find((sim) =>
                    (targetWinnerHorseSerial && Number(sim.serialNumber) === targetWinnerHorseSerial) ||
                    (targetWinnerHorseId && Number(sim.horseId) === targetWinnerHorseId)
                ) || [...this.horseLiveSimulations.values()][0];

                if (targetSim) {
                    targetSim.targetCap = 1.0;
                }

                // 2. Pre-calculate Winner Baseline Distance for the current tick
                // Phase 1 (0 to 2.5s): Start together with the pack
                // Phase 2 (2.5s to 14s): Pack separates, winner paces near lead
                // Phase 3 (14s to 20s): Decisive sprint, winner reaches 1000M alone!
                let winnerIdealDistance = 0;
                if (progressRatio >= 1.0) {
                    winnerIdealDistance = totalDistanceM;
                } else if (progressRatio >= 0.70) {
                    const sprintT = (progressRatio - 0.70) / 0.30;
                    winnerIdealDistance = (totalDistanceM * 0.68) + (totalDistanceM * 0.32 * Math.pow(sprintT, 0.90));
                } else if (progressRatio >= 0.125) {
                    winnerIdealDistance = totalDistanceM * Math.pow(progressRatio, 0.96) * 1.01;
                } else {
                    // First 2.5 seconds: all horses accelerate together from the gate
                    winnerIdealDistance = totalDistanceM * progressRatio * 0.95;
                }

                // Leader distance among all other horses except target winner
                const othersLeaderDistance = Math.max(0, ...[...this.horseLiveSimulations.values()]
                    .filter((s) => s !== targetSim)
                    .map((s) => s.currentDistanceM)
                );

                // Target winner distance: always strictly leading Rank 1
                let targetWinDist = Math.max(winnerIdealDistance, othersLeaderDistance + (progressRatio > 0.125 ? 1.0 : 0.2));
                if (progressRatio >= 1.0) targetWinDist = totalDistanceM;

                // Smooth dynamic surge for winner during catch-up (no teleporting, no rigid clamp)
                const currentDist = targetSim?.currentDistanceM || 0;
                const gapToLead = Math.max(0, targetWinDist - currentDist);
                const dynamicCatchUpStep = Math.max(5.0, gapToLead * 0.40);
                const minWinnerStep = (progressRatio < 0.98) ? 0.8 : 0;
                let nextWinnerDist = Math.min(targetWinDist, currentDist + dynamicCatchUpStep);
                nextWinnerDist = Math.max(currentDist + minWinnerStep, nextWinnerDist);
                if (progressRatio >= 1.0) nextWinnerDist = totalDistanceM;
                const winnerDistance = Math.min(totalDistanceM, Number(nextWinnerDist.toFixed(2)));

                if (targetSim) {
                    targetSim.currentDistanceM = winnerDistance;
                    targetSim.progressPercent = Math.min(100, Number(((winnerDistance / totalDistanceM) * 100).toFixed(1)));
                    targetSim.speedKmh = Number((62 + (progressRatio * 8) + (Math.sin(elapsedSec * 2) * 1.5)).toFixed(1));
                    targetSim.isWinner = true;
                }

                const simulatedHorses = [];

                this.horseLiveSimulations.forEach((sim) => {
                    if (sim === targetSim) {
                        simulatedHorses.push({
                            id: sim.horseId,
                            horseId: sim.horseId,
                            serialNumber: sim.serialNumber,
                            serial_number: sim.serialNumber,
                            name: sim.name,
                            horseName: sim.name,
                            lane: sim.lane,
                            currentDistanceM: sim.currentDistanceM,
                            distanceCovered: sim.currentDistanceM,
                            distance: sim.currentDistanceM,
                            distanceM: `${sim.currentDistanceM}M`,
                            progressPercent: sim.progressPercent,
                            progress: sim.progressPercent,
                            percent: sim.progressPercent,
                            speedKmh: sim.speedKmh,
                            speed: sim.speedKmh,
                            speedMultiplier: 1.0,
                            isWinner: true,
                            is_winner: true,
                        });
                        return;
                    }

                    sim.isWinner = false;
                    // Staggered finish caps for non-winners: 2nd place ~895M, 12th place ~580M
                    const targetCap = Number(sim.targetCap ?? 0.75);

                    let candidateDist = 0;
                    if (progressRatio < 0.125) {
                        // ---------------------------------------------------------------
                        // STAGE 1 (0 to 2.5s): SATH ME (All horses start together)
                        // All 12 horses start tightly grouped side-by-side with <0.5M gap
                        // ---------------------------------------------------------------
                        const tightSpread = 0.992 + (sim.baseRankWeight * 0.005) + (Math.sin(elapsedSec * sim.freq + sim.phase) * 0.002);
                        candidateDist = winnerDistance * tightSpread;
                        candidateDist = Math.min(candidateDist, winnerDistance - 0.15 - (sim.lane * 0.02));
                    } else if (progressRatio < 0.70) {
                        // ---------------------------------------------------------------
                        // STAGE 2 (2.5s to 14s): KUCH AAGE, KUCH PEECHE (Dynamic Spread)
                        // Field naturally separates and dynamic overtaking happens
                        // ---------------------------------------------------------------
                        const t = (progressRatio - 0.125) / 0.575;
                        const midCap = 0.98 - (t * (0.98 - targetCap));
                        const wave = Math.sin(elapsedSec * sim.freq + sim.phase) * sim.waveAmp;
                        const spreadFactor = midCap + wave;
                        candidateDist = totalDistanceM * Math.pow(progressRatio, 0.96) * spreadFactor;
                        const gapFromWinner = 0.5 + (t * 18.0 * (1.0 - targetCap));
                        candidateDist = Math.min(candidateDist, winnerDistance - gapFromWinner);
                        candidateDist = Math.min(totalDistanceM * targetCap, candidateDist);
                    } else {
                        // ---------------------------------------------------------------
                        // STAGE 3 (14s to 20s): WINNER AKELE FINISH PE PAUCHEGA
                        // Winner surges ahead to 1000M; non-winners finish 100M+ behind
                        // ---------------------------------------------------------------
                        const finishT = (progressRatio - 0.70) / 0.30;
                        const finalCapDist = totalDistanceM * targetCap;
                        const baseAt70 = totalDistanceM * 0.68 * targetCap;
                        const currentProgress = baseAt70 + ((finalCapDist - baseAt70) * Math.pow(finishT, 0.92));
                        candidateDist = Math.min(currentProgress, finalCapDist);

                        const breakawayLeadGap = 20.0 + (finishT * 85.0 * (1.0 - targetCap + 0.10));
                        candidateDist = Math.min(candidateDist, winnerDistance - breakawayLeadGap);
                        candidateDist = Math.min(finalCapDist, candidateDist);
                    }

                    const nextDist = Math.max(sim.currentDistanceM, Math.max(0, candidateDist));
                    const controlledDist = Math.min(totalDistanceM * targetCap, Number(nextDist.toFixed(2)));

                    // Absolute guarantee: non-winner distance is strictly less than winner distance
                    sim.currentDistanceM = Math.min(Math.max(0, winnerDistance - 0.15), controlledDist);
                    sim.progressPercent = Math.min(100, Number(((sim.currentDistanceM / totalDistanceM) * 100).toFixed(1)));
                    sim.speedKmh = Number((50 + (progressRatio * 4) + (Math.sin(elapsedSec * sim.freq + sim.phase) * 2)).toFixed(1));

                    simulatedHorses.push({
                        id: sim.horseId,
                        horseId: sim.horseId,
                        serialNumber: sim.serialNumber,
                        serial_number: sim.serialNumber,
                        name: sim.name,
                        horseName: sim.name,
                        lane: sim.lane,
                        currentDistanceM: sim.currentDistanceM,
                        distanceCovered: sim.currentDistanceM,
                        distance: sim.currentDistanceM,
                        distanceM: `${sim.currentDistanceM}M`,
                        progressPercent: sim.progressPercent,
                        progress: sim.progressPercent,
                        percent: sim.progressPercent,
                        speedKmh: sim.speedKmh,
                        speed: sim.speedKmh,
                        speedMultiplier: 1.0,
                        isWinner: false,
                        is_winner: false,
                    });
                });

                // Clone and sort by distance covered to compute ranks (1st to 12th)
                const rankedList = [...simulatedHorses].sort((a, b) => b.currentDistanceM - a.currentDistanceM);
                const leaderDistance = rankedList[0]?.currentDistanceM || 0;

                rankedList.forEach((h, rankIndex) => {
                    const rank = rankIndex + 1;
                    h.currentRank = rank;
                    h.rank = rank;
                    h.finishPosition = rank;
                    h.finish_position = rank;
                    h.gapToLeaderM = Number((leaderDistance - h.currentDistanceM).toFixed(1));
                    h.gap = h.gapToLeaderM;
                    h.gapToLeader = h.gapToLeaderM;
                    h.status = rank === 1 ? 'LEADING' : rank <= 3 ? 'CONTENDING' : rank <= 8 ? 'PACK' : 'TRAILING';
                });

                // Sync currentRank, gap, and status into simulatedHorses
                const rankMap = new Map(rankedList.map((r) => [r.serialNumber, r.currentRank]));
                const gapMap = new Map(rankedList.map((r) => [r.serialNumber, r.gapToLeaderM]));
                const statusMap = new Map(rankedList.map((r) => [r.serialNumber, r.status]));

                simulatedHorses.forEach((h) => {
                    const r = rankMap.get(h.serialNumber) || h.lane;
                    const g = gapMap.get(h.serialNumber) || 0;
                    const s = statusMap.get(h.serialNumber) || 'PACK';
                    h.currentRank = r;
                    h.rank = r;
                    h.finishPosition = r;
                    h.finish_position = r;
                    h.gapToLeaderM = g;
                    h.gap = g;
                    h.gapToLeader = g;
                    h.status = s;
                });

                // Keep `horses` array stably sorted by serialNumber / lane (1 to 12) so frontend tracks don't jump lanes!
                simulatedHorses.sort((a, b) => a.serialNumber - b.serialNumber);

                const leader = rankedList[0] || {};
                const top3 = rankedList.slice(0, 3).map((h) => ({
                    rank: h.currentRank,
                    serialNumber: h.serialNumber,
                    name: h.name,
                    distance: `${h.currentDistanceM}M`,
                }));

                const trackPayload = {
                    raceId: raceState.id,
                    gameSerial: String(raceState.gameSerial),
                    stage: RACE_STATUSES.RUNNING,
                    tick: tickCount,
                    totalDistance: `${totalDistanceM}M`,
                    elapsedSec,
                    timeRemainingSec,
                    progressRatio: Number(progressRatio.toFixed(3)),
                    leader: {
                        serialNumber: leader.serialNumber,
                        name: leader.name,
                        distanceCovered: `${leader.currentDistanceM || 0}M`,
                        speedKmh: leader.speedKmh,
                    },
                    top3,
                    horses: simulatedHorses, // Fixed order 1 to 12 by serialNumber
                    rankedHorses: rankedList, // Ranked 1st to 12th for leaderboard
                };

                // Broadcast on both standard channel events
                this.emitToRaces('race:track_update', trackPayload);
                this.emitToRaces('race:running_track', trackPayload);

                if (progressRatio >= 1) {
                    this.stopLiveRunningTrackSimulation();
                }
            };

            // Instant Frame 0 emission at 0ms (zero lag)
            emitTick();

            // 20 FPS stream to reduce visible stepping on clients.
            this.runningTrackInterval = setInterval(emitTick, tickIntervalMs);
        }

        stopLiveRunningTrackSimulation() {
            if (this.runningTrackInterval) {
                clearInterval(this.runningTrackInterval);
                this.runningTrackInterval = null;
            }
        }

        /**
         * Real-time forced winner synchronization for active live simulation
         */
        syncForcedWinner(winnerRecord) {
            if (!winnerRecord || !this.horseLiveSimulations || this.horseLiveSimulations.size === 0) return;

            const targetSerial = Number(winnerRecord.horseSerial || winnerRecord.serial_number || winnerRecord.serialNumber);
            const targetId = Number(winnerRecord.horseId || winnerRecord.horse_id || winnerRecord.id);

            let winnerSim = null;
            this.horseLiveSimulations.forEach((sim) => {
                const matches = (targetSerial && Number(sim.serialNumber) === targetSerial) ||
                                (targetId && Number(sim.horseId) === targetId);
                if (matches) {
                    winnerSim = sim;
                    sim.isWinner = true;
                    sim.targetCap = 1.0;
                } else {
                    sim.isWinner = false;
                    if (sim.targetCap === 1.0) {
                        sim.targetCap = 0.895;
                    }
                }
            });

            if (winnerSim) {
                const maxOtherDist = Math.max(0, ...[...this.horseLiveSimulations.values()]
                    .filter((s) => s !== winnerSim)
                    .map((s) => s.currentDistanceM)
                );
                // Immediately take the lead ahead of current front-runner
                winnerSim.currentDistanceM = Math.max(winnerSim.currentDistanceM, maxOtherDist + 2.5);
                // Restrict other horses to stay behind winner
                this.horseLiveSimulations.forEach((sim) => {
                    if (sim !== winnerSim) {
                        sim.currentDistanceM = Math.min(sim.currentDistanceM, winnerSim.currentDistanceM - 1.5);
                    }
                });
            }
        }


        /**
         * Start periodic broadcast of Admin & Platform Metrics (Active Players, Today's Bets, Payouts, GGR, Liability)
         */
        startPeriodicMetricsBroadcast() {
            if (!isHorseDatabaseConfigured()) {
                return;
            }
            this.metricsInterval = setInterval(async () => {
                await this.broadcastAdminMetrics();
            }, 5000); // Every 5 seconds real-time pulse
        }

        async broadcastAdminMetrics() {
            if (!this.io || !isHorseDatabaseConfigured()) return;
            try {
                const metrics = await AnalyticsService.getPlatformMetrics(this.getActivePlayersCount());
                this.emitToAdmin('admin:metrics_update', metrics);
            } catch (err) {
                // Non-fatal error fallback
            }
        }

        async sendAdminMetricsToSocket(socket) {
            if (!isHorseDatabaseConfigured()) return;
            try {
                const metrics = await AnalyticsService.getPlatformMetrics(this.getActivePlayersCount());
                socket.emit('admin:metrics_update', metrics);
            } catch (err) {
                // Non-fatal error fallback
            }
        }

        /**
         * Broadcast a newly placed bet across real-time streams
         * - 'races' room: General live bets ticker / stream (with masked username & per-horse bet amounts)
         * - 'admin' room: Full live ledger entry for real-time risk & analytics tracking
         * - 'user_<userId>' room: User-specific bet placement confirmation
         */
        broadcastLiveBet(betPayload, poolData = null) {
            if (!this.io || !betPayload) return;

            const livePool = poolData || raceEngine.getHorseBetsPool();
            const serial = Number(betPayload.horseSerial || betPayload.horse_serial || betPayload.serialNumber || betPayload.serial_number);
            const horseInfo = livePool?.horses?.find((h) => Number(h.serialNumber) === serial || Number(h.horseSerial) === serial);
            const totalHorseBetAmount = horseInfo ? horseInfo.totalBetsAmount : Number(betPayload.amount || 0);

            const action = betPayload.action || (Number(betPayload.amount || 0) < 0 ? 'BET_CANCELLED' : 'BET_PLACED');

            const liveBetData = {
                id: betPayload.id,
                gameSerial: String(betPayload.gameSerial || ''),
                raceId: betPayload.raceId,
                userId: betPayload.userId,
                username: betPayload.maskedUsername || (betPayload.username && betPayload.username.length > 3 ? `${betPayload.username.slice(0, 3)}***` : 'Player'),
                displayName: betPayload.displayName || 'Player',
                horseSerial: serial,
                horse_serial: serial,
                serialNumber: serial,
                serial_number: serial,
                horse: serial,
                horseNumber: serial,
                horseName: betPayload.horseName || horseInfo?.name || `Horse #${serial}`,
                horseImageUrl: betPayload.horseImageUrl || horseInfo?.imageUrl || raceEngine.getCurrentState()?.horses?.find((h) => Number(h.id) === Number(betPayload.horseId))?.imageUrl || null,
                amount: Number(betPayload.amount || 0),
                betAmount: Number(betPayload.amount || 0),
                displayAmount: betPayload.displayAmount || `₹${Number(betPayload.amount || 0).toFixed(2)}`,
                totalHorseBetAmount,
                totalBetsAmount: totalHorseBetAmount,
                displayTotalBetsAmount: `₹${Number(totalHorseBetAmount).toFixed(2)}`,
                totalPot: livePool?.totalPot || 0,
                odds: betPayload.odds || 10,
                potentialPayout: betPayload.potentialPayout || (Number(betPayload.amount || 0) * (betPayload.odds || 10)),
                status: betPayload.status || 'PENDING',
                action,
                createdAt: betPayload.createdAt || new Date().toISOString(),
                horsesCount: 12,
                horses: livePool?.horses || [],
                horsesMap: livePool?.horsesMap || {},
                byHorse: livePool?.byHorse || {},
                pool: livePool,
            };

            // 1. Broadcast to admin room (Full details)
            const betEvents = [
                'admin:bet_live',
                'bet:live',
                'admin:ledger_entry',
                'bet:ledger_entry',
                'admin:horse_bet',
                'horse:bet',
                'horse:bet_update',
            ];
            for (const ev of betEvents) {
                this.emitToAdmin(ev, { ...betPayload, ...liveBetData });
                this.emitToRaces(ev, liveBetData);
            }
            this.emitToAdmin('admin:bet_pool_update', livePool);
            this.emitToAdmin('admin:pool_update', livePool);

            // 2. Broadcast to global race room on both namespaces
            this.emitToRaces('bet:live', liveBetData);
            this.broadcastLivePool(livePool);

            // 3. Trigger immediate metrics recalculation & broadcast to admin
            this.broadcastAdminMetrics();
        }

        async getLiveRaceSnapshot() {
            const BetService = require('./bet.service');
            const race = raceEngine.getCurrentState();
            if (!race?.active) return { success: true, race, pool: null, ledger: [] };
            const [pool, ledgerResult] = await Promise.all([
                BetService.getLiveRaceBetPool(race.id),
                BetService.getLiveBetLedger({ raceId: race.id, limit: 100 }),
            ]);
            return { success: true, race, pool, ledger: ledgerResult.ledger || [] };
        }

        async sendLiveRaceSnapshot(socket) {
            try { socket.emit('admin:live_race_snapshot', await this.getLiveRaceSnapshot()); } catch (err) { /* best effort */ }
        }

        async broadcastLiveRaceSnapshot() {
            if (!this.io) return;
            try { this.emitToAdmin('admin:live_race_snapshot', await this.getLiveRaceSnapshot()); } catch (err) { /* best effort */ }
        }

        broadcastLivePool(pool) {
            if (!this.io || !pool) return;
            const events = [
                'race:bet_pool_update',
                'admin:bet_pool_update',
                'bet:pool_update',
                'pool:update',
                'race:pool',
                'admin:pool_update',
                'admin:horse_bets',
                'admin:horses_bets',
                'horse:bets_update',
                'horses:bets',
                'horses_bets',
                'horses:update',
                'chips:update',
                'chips_update',
            ];
            for (const ev of events) {
                this.emitToRaces(ev, pool);
                this.emitToAdmin(ev, pool);
            }
        }

        /**
         * Send instant wallet snapshot directly to a specific socket
         */
        async sendWalletToSocket(socket, userId) {
            if (!socket || !userId) return;
            try {
                const WalletService = require('./wallet.service');
                const wallet = await WalletService.getWalletByUserId(userId);
                if (wallet) {
                    const balanceNum = Number(wallet.balance);
                    const totalWonNum = Number(wallet.totalWon || 0);
                    const totalInvestedNum = Number(wallet.totalInvested || 0);
                    const netProfitLossNum = Number(wallet.netProfitLoss || 0);

                    const payload = {
                        success: true,
                        userId: Number(userId),
                        walletId: Number(wallet.walletId),
                        balance: balanceNum,
                        displayBalance: `₹${balanceNum.toFixed(2)}`,
                        rawBalance: wallet.rawBalance || balanceNum.toFixed(4),
                        currency: wallet.currency || 'INR',
                        status: wallet.status || 'active',
                        coins: balanceNum,
                        totalWon: totalWonNum,
                        displayTotalWon: wallet.displayTotalWon || `₹${totalWonNum.toFixed(2)}`,
                        totalInvested: totalInvestedNum,
                        displayTotalInvested: wallet.displayTotalInvested || `₹${totalInvestedNum.toFixed(2)}`,
                        netProfitLoss: netProfitLossNum,
                        displayNetProfitLoss: wallet.displayNetProfitLoss || (netProfitLossNum >= 0 ? `+₹${netProfitLossNum.toFixed(2)}` : `-₹${Math.abs(netProfitLossNum).toFixed(2)}`),
                        totalBets: Number(wallet.totalBets || 0),
                        totalWins: Number(wallet.totalWins || 0),
                        timestamp: new Date().toISOString(),
                    };

                    // Emit all standard wallet event name variations for frontend compatibility
                    socket.emit('wallet:balance', payload);
                    socket.emit('wallet:update', payload);
                    socket.emit('wallet', payload);
                    socket.emit('balance:update', payload);
                    return payload;
                }
                return null;
            } catch (err) {
                return null;
            }
        }

        /**
         * Notify specific user of balance change or bet outcome
         */
        notifyUser(userId, eventName, payload) {
            if (!this.io || !userId) return;
            this.io.to(`user_${userId}`).emit(eventName, payload);

            // Alias for wallet events so frontend receives balance regardless of event naming
            if (eventName === 'wallet:balance' || eventName === 'wallet:update' || eventName === 'wallet') {
                this.io.to(`user_${userId}`).emit('wallet:balance', payload);
                this.io.to(`user_${userId}`).emit('wallet:update', payload);
                this.io.to(`user_${userId}`).emit('wallet', payload);
                this.io.to(`user_${userId}`).emit('balance:update', payload);
            }
        }
    }

    const socketService = new SocketService();
    module.exports = { socketService, SocketService };
