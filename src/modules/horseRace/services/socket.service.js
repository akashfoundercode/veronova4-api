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
        this.io = io.of(API_ROUTES.horseRace.socketNamespace);

        this.setupSocketHandlers();
        this.bindRaceEngineEvents();
        this.startPeriodicMetricsBroadcast();

        console.log('[SocketService] Horse-race Socket.IO namespace initialized');
        return this.io;
    }

    stop() {
        this.stopLiveRunningTrackSimulation();
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
        this.io = null;
    }

    /**
     * Set up connection, authentication, and room subscriptions
     */
    setupSocketHandlers() {
        this.io.on('connection', async (socket) => {
            this.connectedClients.add(socket.id);
            socket.join('races'); // All clients join global race stream

            // 1. Resolve User Authentication from Handshake
            const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization || socket.handshake.query?.token;
            let resolvedUserId = null;
            let isAdminSocket = false;

            if (authHeader) {
                try {
                    const token = authHeader.replace(/^Bearer\s+/i, '');
                    const decoded = jwt.verify(token, getJwtSecret());
                    if (decoded) {
                        resolvedUserId = decoded.userId || decoded.id || decoded.sub || resolvedUserId;
                        const adminId = Number(decoded.adminId);
                        if (decoded.adminSession && Number.isInteger(adminId) && adminId > 0) {
                            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                            const [admins] = await pool.execute(`SELECT a.id FROM admins a JOIN admin_sessions s ON s.admin_id = a.id
                                WHERE a.id = ? AND s.token_hash = ? AND s.expires_at > NOW() LIMIT 1`, [adminId, tokenHash]);
                            isAdminSocket = admins.length > 0;
                            if (isAdminSocket) resolvedUserId = null;
                        } else {
                            const uid = Number(resolvedUserId);
                            if (Number.isInteger(uid) && uid > 0) {
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
                                if (sessions.affectedRows) {
                                    const [users] = await pool.execute('SELECT role FROM users WHERE id = ? LIMIT 1', [uid]);
                                    isAdminSocket = users[0]?.role === 'admin' || users[0]?.role === 'super_admin';
                                    if (isAdminSocket) resolvedUserId = null;
                                } else {
                                    resolvedUserId = null;
                                }
                            }
                        }
                        if (isAdminSocket) socket.join('admin');
                    }
                } catch (err) {
                    // Non-fatal token error
                }
            }

            if (resolvedUserId) {
                const numericUserId = Number(resolvedUserId);
                this.authenticatedUsers.set(socket.id, numericUserId);
                socket.join(`user_${numericUserId}`);
                // Immediately send live wallet balance snapshot to user's socket
                this.sendWalletToSocket(socket, numericUserId);
            }

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

            socket.on('admin:jackpot_status', async (_data, callback) => {
                if (!isAdminSocket) {
                    const result = { success: false, message: 'Admin authentication required' };
                    if (typeof callback === 'function') callback(result);
                    else socket.emit('admin:jackpot_status_result', result);
                    return;
                }
                const result = { success: true, ...(await raceEngine.getJackpotStatus()), control: raceEngine.getJackpotControlState() };
                if (typeof callback === 'function') callback(result);
                else socket.emit('admin:jackpot_status_result', result);
            });

            // Immediately send current live race state and snapshot to newly connected client
            const currentState = raceEngine.getCurrentState();
            socket.emit('race:current_state', currentState);
            if (isAdminSocket) this.sendLiveRaceSnapshot(socket);

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

            // Client explicit subscription events
            // User identity comes only from the verified session token, never client payloads.
            const extractUserId = () => resolvedUserId || this.authenticatedUsers.get(socket.id) || null;

            socket.on('subscribe:user', async (data, callback) => {
                const uid = extractUserId(data);
                if (uid) {
                    const numUid = Number(uid);
                    this.authenticatedUsers.set(socket.id, numUid);
                    socket.join(`user_${numUid}`);
                    const payload = await this.sendWalletToSocket(socket, numUid);
                    if (typeof callback === 'function') callback({ success: true, userId: numUid, wallet: payload });
                } else {
                    if (typeof callback === 'function') callback({ success: false, message: 'User ID required' });
                }
            });

            socket.on('wallet:subscribe', async (data, callback) => {
                const uid = extractUserId(data);
                if (uid) {
                    const numUid = Number(uid);
                    this.authenticatedUsers.set(socket.id, numUid);
                    socket.join(`user_${numUid}`);
                    const payload = await this.sendWalletToSocket(socket, numUid);
                    if (typeof callback === 'function') callback({ success: true, userId: numUid, wallet: payload });
                } else {
                    if (typeof callback === 'function') callback({ success: false, message: 'User ID required' });
                }
            });

            socket.on('wallet:get', async (data, callback) => {
                const uid = extractUserId(data);
                if (uid) {
                    const payload = await this.sendWalletToSocket(socket, Number(uid));
                    if (typeof callback === 'function') callback({ success: true, wallet: payload });
                } else {
                    if (typeof callback === 'function') callback({ success: false, message: 'User ID required' });
                }
            });

            socket.on('get:wallet', async (data, callback) => {
                const uid = extractUserId(data);
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
                    const uid = extractUserId(data);
                    if (!uid) {
                        if (typeof callback === 'function') callback({ success: false, error: 'User ID is required' });
                        return;
                    }
                    const BetService = require('./bet.service');
                    const payload = typeof data === 'object' ? data : {};
                    const result = await BetService.cancelBet(uid, payload);
                    if (typeof callback === 'function') callback(result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            };

            socket.on('bet:cancel', handleSocketBetCancel);
            socket.on('bet:remove', handleSocketBetCancel);
            socket.on('bet:minus', handleSocketBetCancel);
            socket.on('bet:clear', handleSocketBetCancel);

            socket.on('bet:place', async (data, callback) => {
                try {
                    const uid = extractUserId(data);
                    if (!uid) {
                        if (typeof callback === 'function') callback({ success: false, error: 'User ID is required' });
                        return;
                    }
                    const BetService = require('./bet.service');
                    const result = await BetService.placeBets(uid, data || {});
                    if (typeof callback === 'function') callback(result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });


            // Admin Live Race Control via Sockets
            socket.on('admin:set_forced_winner', async (data, callback) => {
                if (!isAdminSocket) {
                    if (typeof callback === 'function') callback({ success: false, message: 'Admin authentication required' });
                    return;
                }
                try {
                    const result = await raceEngine.setForcedWinner(data || {});
                    if (result.success) await this.broadcastLiveRaceSnapshot();
                    if (typeof callback === 'function') callback(result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });

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

            // Admin Jackpot Controls via Sockets
            socket.on('admin:set_jackpot', async (data, callback) => {
                try {
                    const result = await raceEngine.configureContinuousJackpot({
                        enabled: true,
                        mode: data?.mode || 'CONTINUOUS',
                        multiplier: data?.multiplier ?? data?.jackpotMultiplier ?? 'RANDOM',
                        durationSeconds: data?.durationSeconds,
                        rounds: data?.rounds,
                    });
                    if (typeof callback === 'function') callback(result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });

            socket.on('admin:clear_jackpot', async (data, callback) => {
                try {
                    const result = await raceEngine.configureContinuousJackpot({ enabled: false, mode: 'OFF' });
                    if (typeof callback === 'function') callback(result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });

            socket.on('admin:configure_jackpot', (data, callback) => {
                try {
                    const result = raceEngine.updateJackpotConfig(data || {});
                    if (typeof callback === 'function') callback(result);
                } catch (err) {
                    if (typeof callback === 'function') callback({ success: false, error: err.message });
                }
            });

            socket.on('admin:set_jackpot_mode', (data, callback) => {
                try {
                    const result = raceEngine.updateJackpotConfig(data || {});
                    if (typeof callback === 'function') callback(result);
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
        });
    }

    getActivePlayersCount() {
        return this.connectedClients.size;
    }

    broadcastActivePlayers() {
        const count = this.getActivePlayersCount();
        this.io?.to('races').emit('active_players:update', {
            activePlayers: count,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Bind Race Engine Lifecycle Events to Socket Channels
     */
    bindRaceEngineEvents() {
        raceEngine.on('race:created', (data) => {
            this.io?.to('races').emit('race:created', data);
            this.broadcastLiveRaceSnapshot();
            this.broadcastAdminMetrics();
        });

        raceEngine.on('race:betting_open', (data) => {
            this.io?.to('races').emit('race:betting_open', data);
            this.broadcastAdminMetrics();
        });

        raceEngine.on('race:countdown_tick', (data) => {
            this.io?.to('races').emit('race:countdown_tick', data);
        });

        raceEngine.on('race:betting_closed_tick', (data) => {
            this.io?.to('races').emit('race:betting_closed_tick', data);
            this.io?.to('races').emit('race:betting_closed', data);
        });

        raceEngine.on('race:state_changed', (data) => {
            this.io?.to('races').emit('race:state_changed', data);

            if (data.status === RACE_STATUSES.RUNNING) {
                this.startLiveRunningTrackSimulation(data);
            } else if (data.status === RACE_STATUSES.FINISHING || data.status === RACE_STATUSES.RESULT) {
                this.stopLiveRunningTrackSimulation();
            }

            this.broadcastAdminMetrics();
        });

        raceEngine.on('race:result', (data) => {
            this.stopLiveRunningTrackSimulation();
            this.io?.to('races').emit('race:result', data);
            this.broadcastAdminMetrics();
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
            if (target.gameSerial && String(target.gameSerial) !== String(raceState.gameSerial)) return null;
            const id = Number(target.horseId || target.horse_id || target.id) || null;
            const serial = Number(target.horseSerial || target.serial_number || target.serialNumber) || null;
            return [...this.horseLiveSimulations.values()].find((sim) =>
                (id && Number(sim.horseId) === id) || (serial && Number(sim.serialNumber) === serial)
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
            const forcedWinner = raceEngine.forcedCurrentWinner &&
                String(raceEngine.forcedCurrentWinner.gameSerial) === String(raceState.gameSerial)
                ? raceEngine.forcedCurrentWinner
                : null;
            const targetSimForTick = resolveTargetSim();
            const targetWinner = targetSimForTick ? (forcedWinner || raceEngine.predeterminedWinner) : null;
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
                        sim.targetBlendFromM = sim.currentDistanceM;
                        // Start winner progress from the selected horse's current
                        // track position. The catch-up is pace-limited per tick below.
                        sim.lastBaseDistanceM = sim.currentDistanceM;
                        sim.lastWinnerSwitchAt = now;
                    }
                });
            }
            // 2. Pre-calculate Winner Baseline Distance for the current tick
            let winnerBaseDistance = 0;
            const winnerRawProg = Math.pow(progressRatio, 0.95);
            if (progressRatio >= 0.60) {
                // Final 8 seconds (12s-20s): Winner breaks away powerfully to 1000M with ~100M+ lead
                const sprintRatio = (progressRatio - 0.60) / 0.40;
                winnerBaseDistance = (totalDistanceM * 0.60) + (totalDistanceM * 0.40 * Math.pow(sprintRatio, 0.92));
            } else {
                winnerBaseDistance = totalDistanceM * winnerRawProg * (1 + 0.04 * (1 - progressRatio));
            }
            if (progressRatio >= 1.0) {
                winnerBaseDistance = totalDistanceM;
            }

            const simulatedHorses = [];

            const targetSim = [...this.horseLiveSimulations.values()].find((sim) =>
                (targetWinnerHorseSerial && Number(sim.serialNumber) === targetWinnerHorseSerial) ||
                (targetWinnerHorseId && Number(sim.horseId) === targetWinnerHorseId)
            );
            const targetDistance = targetSim?.currentDistanceM || 0;
            const currentLeaderDistance = Math.max(0, ...[...this.horseLiveSimulations.values()].map((sim) => sim.currentDistanceM));

            this.horseLiveSimulations.forEach((sim) => {
                const isTargetWinner = Boolean(
                    (targetWinnerHorseSerial && Number(sim.serialNumber) === targetWinnerHorseSerial) ||
                    (targetWinnerHorseId && Number(sim.horseId) === targetWinnerHorseId)
                );

                let calculatedDistance = 0;
                let currentSpeedKmh = 55;
                let desiredPaceMultiplier = 1;
                if (!targetSim) {
                    desiredPaceMultiplier = 1;
                } else if (isTargetWinner) {
                    const targetGap = Math.max(0, currentLeaderDistance - sim.currentDistanceM);
                    const catchUpBoost = Math.min(0.8, (targetGap / 400) * 0.8);
                    desiredPaceMultiplier = forcedWinner
                        ? 1.35 + catchUpBoost
                        : 1 + Math.min(0.45, (targetGap / 600) * 0.45);
                } else if (forcedWinner) {
                    const leadOverTarget = sim.currentDistanceM - targetDistance;
                    desiredPaceMultiplier = leadOverTarget > 0
                        ? Math.max(0.7, 0.9 - Math.min(0.2, (leadOverTarget / 500) * 0.2))
                        : 0.9;
                } else if (sim.currentDistanceM > targetDistance + 20) {
                    const leadOverTarget = sim.currentDistanceM - targetDistance;
                    desiredPaceMultiplier = Math.max(0.3, 1 - Math.min(0.7, (leadOverTarget / 500) * 0.7));
                } else {
                    const gapBehindTarget = Math.max(0, targetDistance - sim.currentDistanceM);
                    desiredPaceMultiplier = 1 + Math.min(0.2, (gapBehindTarget / 700) * 0.2);
                }
                // Ease pace changes to avoid visible acceleration/deceleration jolts.
                const paceResponse = 1 - Math.exp(-deltaSeconds / 1.8);
                sim.currentPaceMultiplier += (desiredPaceMultiplier - sim.currentPaceMultiplier) * paceResponse;
                const speedMultiplier = sim.currentPaceMultiplier;

                if (isTargetWinner) {
                    // Winner Progression: Powers ahead smoothly and reaches 1000M (100%) 🏆
                    // Continue smoothly from the horse's exact current position when
                    // an admin changes the target during the live force window.
                    const naturalWinnerDistance = totalDistanceM * Math.pow(progressRatio, 0.95) * (1 + 0.04 * (1 - progressRatio));
                    const secondsSinceWinnerSwitch = Math.max(0, (now - (sim.lastWinnerSwitchAt || startTime)) / 1000);
                    const leadGoal = Math.max(0, currentLeaderDistance - sim.currentDistanceM + 12);
                    const catchUpRamp = 1 - Math.exp(-secondsSinceWinnerSwitch / 6);
                    const gentleLead = leadGoal * catchUpRamp;
                    const desiredWinnerDistance = Math.min(totalDistanceM, naturalWinnerDistance + gentleLead);
                    const maxDistanceStep = (52 * speedMultiplier / 3.6) * deltaSeconds;
                    calculatedDistance = Math.min(desiredWinnerDistance, sim.currentDistanceM + maxDistanceStep);
                    currentSpeedKmh = Number((60 + (progressRatio * 8) + (Math.sin(elapsedSec * 2) * 1.5)).toFixed(1));
                } else {
                    // Non-Winner Progression:
                    // Staggered finish caps: 2nd place ~895M (~105M behind winner), 12th place ~580M
                    const targetCap = Number(sim.targetCap ?? 0.75);

                    // Dynamic spread: tightly packed at starting gate (0-4s), fans out dynamically across the track
                    let spreadFactor = 0.98;
                    if (progressRatio < 0.20) {
                        spreadFactor = 0.96 + (sim.baseRankWeight * 0.03);
                    } else if (progressRatio < 0.60) {
                        const t = (progressRatio - 0.20) / 0.40;
                        spreadFactor = 0.96 - (t * (0.96 - targetCap));
                    } else {
                        spreadFactor = targetCap;
                    }

                    const baseProg = Math.pow(progressRatio, 0.95) * spreadFactor;
                    // Keep track positions monotonic; small oscillations made horses visibly run backwards.
                    let candidateDistance = totalDistanceM * baseProg;

                    // Dampen non-winners in the final 8s so winner creates a commanding ~100M+ visual lead
                    if (progressRatio >= 0.60) {
                        const maxAllowed = winnerBaseDistance - (30 + (progressRatio - 0.60) * 180 * (1 - targetCap));
                        candidateDistance = Math.min(candidateDistance, maxAllowed);
                    }

                    if (progressRatio >= 1.0) {
                        calculatedDistance = totalDistanceM * targetCap;
                    } else {
                        calculatedDistance = Math.min(totalDistanceM * targetCap, Math.max(0, candidateDistance));
                    }
                    currentSpeedKmh = Number((48 + (progressRatio * 3) + (Math.sin(elapsedSec * 2) * 1.5)).toFixed(1));
                }

                const baseDistance = Math.max(0, Math.min(totalDistanceM, Number(calculatedDistance.toFixed(2))));
                const baseDelta = Math.max(0, baseDistance - sim.lastBaseDistanceM);
                const controlledDistance = isTargetWinner
                    ? baseDistance
                    : sim.currentDistanceM + (baseDelta * speedMultiplier);
                const distance = Math.max(sim.currentDistanceM, Math.max(0, Math.min(totalDistanceM, Number(controlledDistance.toFixed(2)))));
                sim.lastBaseDistanceM = baseDistance;
                const progressPercent = Number(((distance / totalDistanceM) * 100).toFixed(1));

                sim.currentDistanceM = distance;
                sim.progressPercent = Math.min(100, progressPercent);
                sim.speedKmh = Number((currentSpeedKmh * speedMultiplier).toFixed(1));
                sim.isWinner = isTargetWinner;

                simulatedHorses.push({
                    horseId: sim.horseId,
                    serialNumber: sim.serialNumber,
                    name: sim.name,
                    lane: sim.lane,
                    currentDistanceM: sim.currentDistanceM,
                    progressPercent: sim.progressPercent,
                    speedKmh: sim.speedKmh,
                    speedMultiplier: Number(speedMultiplier.toFixed(2)),
                    isWinner: sim.isWinner,
                });
            });

            // Clone and sort by distance covered to compute ranks (1st to 12th)
            const rankedList = [...simulatedHorses].sort((a, b) => b.currentDistanceM - a.currentDistanceM);
            const leaderDistance = rankedList[0]?.currentDistanceM || 0;

            rankedList.forEach((h, rankIndex) => {
                const rank = rankIndex + 1;
                h.currentRank = rank;
                h.gapToLeaderM = Number((leaderDistance - h.currentDistanceM).toFixed(1));
                h.status = rank === 1 ? 'LEADING' : rank <= 3 ? 'CONTENDING' : rank <= 8 ? 'PACK' : 'TRAILING';
            });

            // Sync currentRank, gap, and status into simulatedHorses
            const rankMap = new Map(rankedList.map((r) => [r.serialNumber, r.currentRank]));
            const gapMap = new Map(rankedList.map((r) => [r.serialNumber, r.gapToLeaderM]));
            const statusMap = new Map(rankedList.map((r) => [r.serialNumber, r.status]));

            simulatedHorses.forEach((h) => {
                h.currentRank = rankMap.get(h.serialNumber) || h.lane;
                h.gapToLeaderM = gapMap.get(h.serialNumber) || 0;
                h.status = statusMap.get(h.serialNumber) || 'PACK';
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
            this.io?.to('races').emit('race:track_update', trackPayload);
            this.io?.to('races').emit('race:running_track', trackPayload);

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
            this.io.to('admin').emit('admin:metrics_update', metrics);
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
     * - 'races' room: General live bets ticker / stream (with masked username)
     * - 'admin' room: Full live ledger entry for real-time risk & analytics tracking
     * - 'user_<userId>' room: User-specific bet placement confirmation
     */
    broadcastLiveBet(betPayload) {
        if (!this.io || !betPayload) return;

        // 1. Broadcast to admin room (Full details)
        this.io.to('admin').emit('admin:bet_live', betPayload);
        this.io.to('admin').emit('bet:ledger_entry', betPayload);

        // 2. Broadcast to global race room for ticker / live ledger stream
        this.io.to('races').emit('bet:live', {
            id: betPayload.id,
            gameSerial: betPayload.gameSerial,
            raceId: betPayload.raceId,
            userId: betPayload.userId,
            username: betPayload.maskedUsername || (betPayload.username && betPayload.username.length > 3 ? `${betPayload.username.slice(0, 3)}***` : 'Player'),
            displayName: betPayload.displayName || 'Player',
            horseSerial: betPayload.horseSerial,
            horseName: betPayload.horseName,
            horseImageUrl: betPayload.horseImageUrl || raceEngine.getCurrentState()?.horses?.find((h) => Number(h.id) === Number(betPayload.horseId))?.imageUrl || null,
            amount: betPayload.amount,
            displayAmount: betPayload.displayAmount || `₹${Number(betPayload.amount).toFixed(2)}`,
            odds: betPayload.odds,
            potentialPayout: betPayload.potentialPayout,
            status: betPayload.status || 'PENDING',
            createdAt: betPayload.createdAt || new Date().toISOString(),
        });

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
        try { this.io.to('admin').emit('admin:live_race_snapshot', await this.getLiveRaceSnapshot()); } catch (err) { /* best effort */ }
    }

    broadcastLivePool(pool) {
        if (!this.io || !pool) return;
        this.io.to('races').emit('race:bet_pool_update', pool);
        this.io.to('admin').emit('admin:bet_pool_update', pool);
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
