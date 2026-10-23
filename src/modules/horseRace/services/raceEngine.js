const EventEmitter = require('events');
const { pool } = require('../config/database');
const raceConfig = require('../config/raceConfig');
const { RACE_STATUSES, RaceStateMachine } = require('./raceStateMachine');
const RaceModel = require('../models/race.model');
const HorseModel = require('../models/horse.model');

const LIVE_FORCE_WINNER_WINDOW_MS = 10_000;

class RaceEngine extends EventEmitter {
    constructor() {
        super();
        this.isRunning = false;
        this.currentRace = null;
        this.currentHorses = [];
        this.activeTimer = null;
        this.isTransitioning = false;
        this.scheduledWinners = new Map(); // gameSerial -> { horseSerial, horseId, horseName, reason }
        this.forcedCurrentWinner = null; // { horseSerial, horseId, horseName, reason }
        this.predeterminedWinner = null; // Cached winner chosen at start of RUNNING phase for live track simulation
        this.extraRunningMs = 0;
        this.scheduledJackpots = new Map(); // gameSerial -> { multiplier, reason }
        this.forcedCurrentJackpot = null; // { multiplier, reason }
        this.timeScheduledJackpots = []; // Array of { targetTimestamp, multiplier, reason }
        this.roundCounter = 0;
        this.lastJackpotTime = Date.now();
        this.lastJackpotRound = 0;
        this.continuousJackpot = null; // { multiplier, endsAt, roundsRemaining, reason }
        this.jackpotConfig = {
            enabled: raceConfig.JACKPOT_ENABLED !== false,
            mode: 'MANUAL', // 'MANUAL' | 'EVERY_ROUND' | 'ROUND_INTERVAL' | 'TIME_INTERVAL' | 'PROBABILITY' | 'DISABLED'
            targetMultiplier: 'RANDOM', // 2 | 3 | 4 | 'RANDOM'
            intervalRounds: 5, // e.g. every 5 rounds
            intervalSeconds: 180, // e.g. every 180 seconds
            probability: Number(raceConfig.JACKPOT_PROBABILITY || 0.02),
            allowedMultipliers: raceConfig.DEFAULT_JACKPOT_MULTIPLIERS || [2, 3, 4],
        };
    }


    /**
     * Generate sequential game serial: YYYYMMDD001, YYYYMMDD002...
     */
    async generateGameSerial(connection) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;

        const [rows] = await connection.execute(
            'SELECT game_serial FROM races WHERE game_serial LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE',
            [`${datePrefix}%`]
        );

        let nextSequence = 1;
        if (rows.length > 0) {
            const lastSerial = String(rows[0].game_serial);
            const suffix = lastSerial.startsWith(datePrefix)
                ? lastSerial.slice(datePrefix.length)
                : lastSerial.replace(/^[^\d]+/, '');
            const parsed = parseInt(suffix, 10);
            if (!isNaN(parsed)) {
                nextSequence = parsed + 1;
            }
        }

        const formattedSeq = String(nextSequence).padStart(3, '0');
        return `${datePrefix}${formattedSeq}`;
    }

    /**
     * Start the Global Race Engine with Crash / Restart Recovery
     */
    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[RaceEngine] 🚀 Global Race Engine started. (Cycle: ~${(raceConfig.BETTING_OPEN_MS + raceConfig.BETTING_CLOSED_MS + raceConfig.COUNTDOWN_MS + raceConfig.RUNNING_MS + raceConfig.FINISHING_MS + raceConfig.RESULT_MS) / 1000}s)`);

        try {
            await this.recoverOrCreateRace();
        } catch (error) {
            console.error('[RaceEngine] ❌ Error initializing race engine:', error);
            this.scheduleNextAttempt(5000);
        }
    }

    clearAllTimers() {
        if (this.activeTimer) {
            clearTimeout(this.activeTimer);
            this.activeTimer = null;
        }
        if (this.bettingClosedTimers && this.bettingClosedTimers.length > 0) {
            this.bettingClosedTimers.forEach((t) => clearTimeout(t));
            this.bettingClosedTimers = [];
        }
        if (this.countdownTimers && this.countdownTimers.length > 0) {
            this.countdownTimers.forEach((t) => clearTimeout(t));
            this.countdownTimers = [];
        }
    }

    stop() {
        this.isRunning = false;
        this.clearAllTimers();
        console.log('[RaceEngine] 🛑 Global Race Engine stopped.');
    }

    /**
     * Crash / Restart Recovery: Inspects database to resume active race or create next
     */
    async recoverOrCreateRace() {
        const activeRace = await RaceModel.findActiveRace();

        if (activeRace) {
            console.log(`[RaceEngine] 🔄 Engine Recovery: Found active Race #${activeRace.game_serial} (status: '${activeRace.status}'). Resuming persisted state...`);
            this.currentRace = activeRace;
            this.currentHorses = await RaceModel.getRaceHorses(activeRace.id);

            if (this.currentHorses.length === 0) {
                const activeHorses = await HorseModel.findAllActive();
                if (activeHorses.length > 0) {
                    this.currentHorses = await RaceModel.addRaceHorses(activeRace.id, activeHorses.slice(0, raceConfig.HORSES_COUNT));
                }
            }

            await this.resumeRaceFromPersistedState();
        } else {
            console.log('[RaceEngine] 🏁 Engine Startup: No active race found. Creating next global race...');
            await this.createNextRace();
        }
    }

    /**
     * Resume a recovered race based on authoritative server timestamps
     */
    async resumeRaceFromPersistedState() {
        if (!this.currentRace || !this.isRunning) return;
        this.clearAllTimers();

        const now = Date.now();
        const status = this.currentRace.status;

        switch (status) {
            case RACE_STATUSES.WAITING:
            case RACE_STATUSES.BETTING_OPEN: {
                const closeAt = this.currentRace.betting_close_at ? new Date(this.currentRace.betting_close_at).getTime() : now + raceConfig.BETTING_OPEN_MS;
                const remaining = Math.max(0, closeAt - now);
                console.log(`[RaceEngine] ⏱️ Resumed 'BETTING_OPEN' for Race #${this.currentRace.game_serial}. Time remaining: ${(remaining / 1000).toFixed(1)}s`);
                this.scheduleTransition(RACE_STATUSES.BETTING_CLOSED, remaining);
                break;
            }
            case RACE_STATUSES.BETTING_CLOSED: {
                const countdownAt = this.currentRace.countdown_at ? new Date(this.currentRace.countdown_at).getTime() : now + raceConfig.BETTING_CLOSED_MS;
                const remaining = Math.max(0, countdownAt - now);
                console.log(`[RaceEngine] ⏱️ Resumed 'BETTING_CLOSED' for Race #${this.currentRace.game_serial}. Time remaining: ${(remaining / 1000).toFixed(1)}s`);
                this.runBettingClosedSequence(remaining);
                break;
            }
            case RACE_STATUSES.COUNTDOWN: {
                const startAt = this.currentRace.started_at ? new Date(this.currentRace.started_at).getTime() : now + raceConfig.COUNTDOWN_MS;
                const remaining = Math.max(0, startAt - now);
                console.log(`[RaceEngine] ⏱️ Resumed 'COUNTDOWN' for Race #${this.currentRace.game_serial}. Time remaining: ${(remaining / 1000).toFixed(1)}s`);
                this.runCountdownSequence(remaining);
                break;
            }
            case RACE_STATUSES.RUNNING: {
                const finishAt = this.currentRace.finished_at ? new Date(this.currentRace.finished_at).getTime() : now + raceConfig.RUNNING_MS;
                const remaining = Math.max(0, finishAt - now);
                console.log(`[RaceEngine] ⏱️ Resumed 'RUNNING' for Race #${this.currentRace.game_serial}. Time remaining: ${(remaining / 1000).toFixed(1)}s`);
                this.scheduleTransition(RACE_STATUSES.FINISHING, remaining);
                break;
            }
            case RACE_STATUSES.FINISHING: {
                this.scheduleTransition(RACE_STATUSES.RESULT, raceConfig.FINISHING_MS);
                break;
            }
            case RACE_STATUSES.RESULT: {
                this.scheduleTransition(RACE_STATUSES.FINISHED, raceConfig.RESULT_MS);
                break;
            }
            case RACE_STATUSES.FINISHED:
            default: {
                await this.createNextRace();
                break;
            }
        }
    }

    /**
     * Create the next global race and attach 12 horses
     */
    async createNextRace() {
        if (!this.isRunning) return;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const gameSerial = await this.generateGameSerial(connection);
            const now = new Date();
            const bettingCloseAt = new Date(now.getTime() + raceConfig.BETTING_OPEN_MS);
            const countdownAt = new Date(bettingCloseAt.getTime() + raceConfig.BETTING_CLOSED_MS);

            // Fetch active horses from master table
            const activeHorses = await HorseModel.findAllActive(connection);
            if (activeHorses.length === 0) {
                throw new Error('No active horses available in database to schedule race');
            }

            const selectedHorses = activeHorses.slice(0, raceConfig.HORSES_COUNT);

            this.forcedCurrentWinner = null;
            this.predeterminedWinner = null;
            this.forcedCurrentJackpot = null;

            // 3. Evaluate Jackpot Multiplier (Scheduled Override vs Flexible Modes: EVERY_ROUND, ROUND_INTERVAL, TIME_INTERVAL, PROBABILITY)
            const { multiplier: jackpotMultiplier, isJackpot } = await this.evaluateRaceJackpot(gameSerial);

            // Create Race record
            const [raceInsert] = await connection.execute(
                `INSERT INTO races (game_serial, status, betting_open_at, betting_close_at, countdown_at, jackpot_multiplier, is_jackpot)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [gameSerial, RACE_STATUSES.BETTING_OPEN, now, bettingCloseAt, countdownAt, jackpotMultiplier, isJackpot ? 1 : 0]
            );

            const raceId = raceInsert.insertId;

            // Attach horses snapshot
            const horseValues = [];
            const horsePlaceholders = selectedHorses.map((h, index) => {
                horseValues.push(raceId, h.id, h.serial_number, h.name, index + 1);
                return '(?, ?, ?, ?, ?)';
            }).join(', ');

            await connection.execute(
                `INSERT INTO race_horses (race_id, horse_id, serial_number, horse_name_snapshot, starting_position)
                 VALUES ${horsePlaceholders}`,
                horseValues
            );

            await connection.commit();

            this.currentRace = {
                id: raceId,
                game_serial: gameSerial,
                status: RACE_STATUSES.BETTING_OPEN,
                betting_open_at: now,
                betting_close_at: bettingCloseAt,
                countdown_at: countdownAt,
                started_at: null,
                finished_at: null,
                result_at: null,
                winner_horse_id: null,
                jackpot_multiplier: jackpotMultiplier,
                jackpotMultiplier,
                is_jackpot: isJackpot ? 1 : 0,
                isJackpot,
            };

            this.currentHorses = await RaceModel.getRaceHorses(raceId);

            // Check for pre-scheduled forced winner for this gameSerial
            this.forcedCurrentWinner = null;
            this.predeterminedWinner = null;
            this.extraRunningMs = 0;

            const preScheduled = this.scheduledWinners.get(gameSerial);
            if (preScheduled) {
                this.forcedCurrentWinner = preScheduled;
                console.log(`[RaceEngine] 🎯 Pre-scheduled winner loaded for Race #${gameSerial}: Horse #${preScheduled.horseSerial} (${preScheduled.horseName || 'Pre-set'})`);
            } else {
                try {
                    const [schedRows] = await pool.query(
                        "SELECT horse_id, horse_serial, horse_name, reason FROM scheduled_race_winners WHERE game_serial = ? AND status = 'PENDING' LIMIT 1",
                        [gameSerial]
                    );
                    if (schedRows.length > 0) {
                        this.forcedCurrentWinner = {
                            horseId: schedRows[0].horse_id,
                            horseSerial: schedRows[0].horse_serial,
                            horseName: schedRows[0].horse_name,
                            reason: schedRows[0].reason,
                        };
                        console.log(`[RaceEngine] 🎯 Database pre-scheduled winner loaded for Race #${gameSerial}: Horse #${schedRows[0].horse_serial}`);
                    }
                } catch (sErr) { }
            }

            console.log(`[RaceEngine] 🏁 New Global Race #${gameSerial} created. [BETTING OPEN] (${raceConfig.BETTING_OPEN_MS / 1000}s window) [Jackpot: ${jackpotMultiplier}X]`);

            this.emit('race:created', this.getCurrentState());
            this.emit('race:betting_open', this.getCurrentState());

            this.scheduleTransition(RACE_STATUSES.BETTING_CLOSED, raceConfig.BETTING_OPEN_MS);

        } catch (error) {
            await connection.rollback();
            console.error('[RaceEngine] ❌ Failed to create next race:', error.message);
            this.scheduleNextAttempt(5000);
        } finally {
            connection.release();
        }
    }

    /**
     * Transition race through lifecycle phases
     */
    async transitionTo(nextStatus) {
        if (!this.isRunning || !this.currentRace) return;
        if (this.isTransitioning) return;
        if (this.currentRace.status === nextStatus) return; // Prevent duplicate transition into identical phase!

        this.clearAllTimers(); // Atomically cancel all previous pending timers

        this.isTransitioning = true;
        const currentStatus = this.currentRace.status;

        try {
            RaceStateMachine.validateTransition(currentStatus, nextStatus);

            const now = new Date();
            const updateFields = {};

            switch (nextStatus) {
                case RACE_STATUSES.BETTING_CLOSED:
                    updateFields.betting_close_at = now;
                    await this.predetermineRaceWinner();
                    break;
                case RACE_STATUSES.COUNTDOWN:
                    updateFields.countdown_at = now;
                    break;
                case RACE_STATUSES.RUNNING:
                    updateFields.started_at = now;
                    if (!this.predeterminedWinner) {
                        await this.predetermineRaceWinner();
                    }
                    break;
                case RACE_STATUSES.FINISHING:
                    break;
                case RACE_STATUSES.RESULT:
                    await this.calculateAndPersistRaceResult();
                    break;
                case RACE_STATUSES.FINISHED:
                    updateFields.finished_at = now;
                    break;
            }

            if (nextStatus !== RACE_STATUSES.RESULT) {
                this.currentRace = await RaceModel.updateStatus(this.currentRace.id, nextStatus, updateFields);
            }

            console.log(`[RaceEngine] 🔄 Race #${this.currentRace.game_serial} ➔ [${nextStatus}]`);
            this.emit('race:state_changed', this.getCurrentState());

            this.handlePostTransition(nextStatus);
        } catch (error) {
            console.error(`[RaceEngine] ❌ State transition error [${currentStatus} ➔ ${nextStatus}]:`, error.message);
        } finally {
            this.isTransitioning = false;
        }
    }

    /**
     * Pre-determines the winning horse at the instant RUNNING phase begins.
     * Evaluates Forced Admin Winner OR Smart 4-Rule Business Logic so live track simulation
     * and final result are 100% unified and seamless!
     */
    async predetermineRaceWinner() {
        if (!this.currentRace) return;
        const raceId = this.currentRace.id;
        try {
            const horses = await RaceModel.getRaceHorses(raceId);
            if (!horses || horses.length === 0) return;

            let winner = null;
            if (this.forcedCurrentWinner) {
                winner = horses.find(
                    (h) => (this.forcedCurrentWinner.horseId && Number(h.horse_id) === Number(this.forcedCurrentWinner.horseId)) ||
                        (this.forcedCurrentWinner.horseSerial && Number(h.serial_number) === Number(this.forcedCurrentWinner.horseSerial))
                );
            }
            if (!winner) {
                winner = await this.calculateSmartWinner(horses, this.currentRace.id);
            }
            // calculateSmartWinner awaits DB work. Do not let an older in-flight
            // call overwrite a force that arrived while it was awaiting.
            const latestForced = this.forcedCurrentWinner;
            const latestForcedHorse = latestForced && horses.find(
                (h) => (latestForced.horseId && Number(h.horse_id) === Number(latestForced.horseId)) ||
                    (latestForced.horseSerial && Number(h.serial_number) === Number(latestForced.horseSerial))
            );
            if (!this.currentRace || Number(this.currentRace.id) !== Number(raceId)) return;
            this.predeterminedWinner = latestForcedHorse || winner;
            console.log(`[RaceEngine] 🏁 PREDETERMINED WINNER FOR LIVE TRACK: Horse #${this.predeterminedWinner?.serial_number} (${this.predeterminedWinner?.horse_name_snapshot})`);
        } catch (err) {
            console.error('[RaceEngine] Error predetermining race winner:', err.message);
        }
    }

    /**
     * Handle state-specific logic and schedule the next phase
     */
    handlePostTransition(status) {
        switch (status) {
            case RACE_STATUSES.BETTING_CLOSED:
                this.runBettingClosedSequence();
                break;
            case RACE_STATUSES.COUNTDOWN:
                this.runCountdownSequence();
                break;
            case RACE_STATUSES.RUNNING:
                this.predetermineRaceWinner();
                this.scheduleTransition(RACE_STATUSES.FINISHING, raceConfig.RUNNING_MS);
                break;
            case RACE_STATUSES.FINISHING:
                this.scheduleTransition(RACE_STATUSES.RESULT, raceConfig.FINISHING_MS);
                break;
            case RACE_STATUSES.RESULT:
                this.scheduleTransition(RACE_STATUSES.FINISHED, raceConfig.RESULT_MS);
                break;
            case RACE_STATUSES.FINISHED:
                this.scheduleNextRaceCreation(raceConfig.NEXT_RACE_DELAY_MS);
                break;
        }
    }

    /**
     * Runs 5s Betting Closed sequence: 5 -> 4 -> 3 -> 2 -> 1 -> Transition to COUNTDOWN
     */
    runBettingClosedSequence(durationMs = raceConfig.BETTING_CLOSED_MS) {
        this.clearAllTimers();
        this.bettingClosedTimers = [];

        const totalSec = Math.max(1, Math.round(durationMs / 1000));

        for (let i = 0; i < totalSec; i++) {
            const secRemaining = totalSec - i;
            const delay = i * 1000;

            const timer = setTimeout(() => {
                if (this.currentRace && this.currentRace.status === RACE_STATUSES.BETTING_CLOSED) {
                    this.emit('race:betting_closed_tick', {
                        raceId: this.currentRace.id,
                        gameSerial: this.currentRace.game_serial,
                        stage: 'BETTING_CLOSED',
                        secondsRemaining: secRemaining,
                        message: `Betting Closed. Race Countdown in ${secRemaining}s`,
                    });
                }
            }, delay);
            this.bettingClosedTimers.push(timer);
        }

        this.scheduleTransition(RACE_STATUSES.COUNTDOWN, durationMs);
    }

    /**
     * Runs 3s visual countdown: 3 -> 2 -> 1 -> GO (Instant Race Start at GO)
     */
    runCountdownSequence(durationMs = 3000) {
        this.clearAllTimers();
        this.countdownTimers = [];

        const sequence = [
            { count: 3, delay: 0 },
            { count: 2, delay: 1000 },
            { count: 1, delay: 2000 },
            { count: 'GO', delay: 3000 },
        ];

        const activeSequence = sequence.filter((s) => s.delay <= durationMs);

        activeSequence.forEach(({ count, delay }) => {
            const timer = setTimeout(() => {
                if (this.currentRace && this.currentRace.status === RACE_STATUSES.COUNTDOWN) {
                    this.emit('race:countdown_tick', {
                        raceId: this.currentRace.id,
                        gameSerial: this.currentRace.game_serial,
                        countdown: count,
                    });

                    // At 'GO' (3000ms), immediately transition to RUNNING with zero latency!
                    if (count === 'GO') {
                        this.transitionTo(RACE_STATUSES.RUNNING);
                    }
                }
            }, delay);
            this.countdownTimers.push(timer);
        });
    }

    /**
     * Compute authoritative server-side race results
     * Evaluates Forced Admin Winner OR Smart Platform House-Risk / User Records Fallback
     */
    async calculateAndPersistRaceResult() {
        if (!this.currentRace) return;
        const raceId = this.currentRace.id;
        const horses = await RaceModel.getRaceHorses(raceId);
        if (!horses || horses.length === 0) return;

        // Prefer the latest in-memory override, even if a scheduled row is stale.
        let forcedWinner = this.forcedCurrentWinner;
        if (!forcedWinner && this.currentRace.game_serial) {
            forcedWinner = this.scheduledWinners.get(this.currentRace.game_serial);
        }

        // 1. Check for Forced Admin Winner (Live or Pre-Scheduled)
        if (!forcedWinner && this.currentRace.game_serial) {
            try {
                const [rows] = await pool.query(
                    "SELECT horse_id, horse_serial, horse_name, reason FROM scheduled_race_winners WHERE game_serial = ? AND status = 'PENDING' LIMIT 1",
                    [this.currentRace.game_serial]
                );
                if (rows.length > 0) {
                    forcedWinner = {
                        horseId: rows[0].horse_id,
                        horseSerial: rows[0].horse_serial,
                        horseName: rows[0].horse_name,
                        reason: rows[0].reason,
                    };
                }
            } catch (sErr) { }
        }

        // The 10-second live control window may close while the scheduled row is
        // loading. Re-check the live override so the latest accepted force wins.
        forcedWinner = this.forcedCurrentWinner || forcedWinner;

        if (forcedWinner) {
            forcedWinner = horses.find(
                (h) => (forcedWinner.horseId && Number(h.horse_id) === Number(forcedWinner.horseId)) ||
                    (forcedWinner.horseSerial && Number(h.serial_number) === Number(forcedWinner.horseSerial))
            ) || null;
            if (!forcedWinner) {
                console.error(`[RaceEngine] Forced winner does not participate in Race #${this.currentRace.game_serial}; using predetermined winner.`);
            }
        }

        let winnerHorse = null;

        if (forcedWinner) {
            winnerHorse = forcedWinner;
            console.log(`[RaceEngine] 👑 ADMIN FORCED WINNER APPLIED: Horse #${winnerHorse.serial_number} (${winnerHorse.horse_name_snapshot}) for Race #${this.currentRace.game_serial}`);
            // Mark DB scheduled record as APPLIED
            try {
                await pool.query(
                    "UPDATE scheduled_race_winners SET status = 'APPLIED' WHERE game_serial = ?",
                    [this.currentRace.game_serial]
                );
            } catch (uErr) { }
        }

        // 2. If NO forced winner -> Use Predetermined Winner (Calculated at start of RUNNING) or Smart Fallback
        if (!winnerHorse && this.predeterminedWinner) {
            const predId = this.predeterminedWinner.horse_id || this.predeterminedWinner.id || this.predeterminedWinner.horseId;
            const predSerial = this.predeterminedWinner.serial_number || this.predeterminedWinner.serialNumber || this.predeterminedWinner.horseSerial;
            winnerHorse = horses.find((h) =>
                (predId && Number(h.horse_id) === Number(predId)) ||
                (predSerial && Number(h.serial_number) === Number(predSerial))
            ) || this.predeterminedWinner;
        }

        if (!winnerHorse) {
            winnerHorse = await this.calculateSmartWinner(horses, this.currentRace.id);
            this.predeterminedWinner = winnerHorse;
        }

        if (!this.currentRace || Number(this.currentRace.id) !== Number(raceId)) return;

        // 3. Realistic Rankings Generation: Winner is #1, other 11 horses ranked behind
        const otherHorses = horses.filter((h) => Number(h.horse_id) !== Number(winnerHorse.horse_id));
        const shuffledOthers = [...otherHorses].sort(() => Math.random() - 0.5);

        const orderedHorses = [winnerHorse, ...shuffledOthers];
        const baseTime = ((raceConfig.RUNNING_MS + this.extraRunningMs) / 1000); // ~20s + extra

        const horseResults = orderedHorses.map((horse, index) => {
            const finishPosition = index + 1;
            const variance = Number((index * 0.15 + (Math.random() * 0.08)).toFixed(3));
            const finishTime = Number((baseTime + variance).toFixed(3));
            const result = finishPosition === 1 ? 'WINNER' : finishPosition <= 3 ? 'PLACED' : 'COMPLETED';

            return {
                horse_id: horse.horse_id,
                serial_number: horse.serial_number,
                horse_name_snapshot: horse.horse_name_snapshot,
                finish_position: finishPosition,
                finish_time: finishTime,
                result,
            };
        });

        const winner = horseResults[0];
        const winnerHorseId = winner.horse_id;

        const resultData = await RaceModel.completeRace(this.currentRace.id, winnerHorseId, horseResults);

        this.currentRace = resultData.race;
        this.currentHorses = resultData.horses;

        // Settle all pending bets for this race and credit winnings to wallets with Jackpot multiplier
        const jackpotMultiplier = Number(this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1);
        try {
            const BetService = require('./bet.service');
            await BetService.settleRaceBets(this.currentRace.id, winnerHorseId, jackpotMultiplier);
        } catch (settleErr) {
            console.error('[RaceEngine] Error settling bets:', settleErr.message);
        }

        this.emit('race:result', {
            race: this.currentRace,
            winner,
            horses: this.currentHorses,
        });
    }

    /**
     * Smart Risk & House Edge Winner Calculation Engine
     * Implements 4 strict business rules based on live betting records:
     * 1. If NO bets placed on any horse -> Pick random horse (1-12).
     * 2. If bets placed on SOME horses (e.g., 7, 8, 9) and ₹0 on others -> Pick random horse among ₹0 bet horses (platform payout = ₹0).
     * 3. If bets placed on ALL horses -> Horse with the LEAST total bet amount wins.
     * 4. If ALL horses have EQUAL bets (or tied lowest amounts) -> Pick random horse among the tied lowest horses.
     */
    async calculateSmartWinner(horses, raceId) {
        if (!horses || horses.length === 0) return null;

        try {
            const [potRows] = await pool.query(
                `SELECT horse_id, horse_serial, 
                        COALESCE(SUM(amount), 0) AS totalBets,
                        COUNT(id) AS betCount
                 FROM bets
                 WHERE race_id = ? AND status = 'PENDING'
                 GROUP BY horse_id, horse_serial`,
                [raceId]
            );

            const betsMap = new Map();
            let totalPot = 0;

            if (potRows && potRows.length > 0) {
                potRows.forEach((r) => {
                    const hId = Number(r.horse_id);
                    const bets = Number(r.totalBets) || 0;
                    betsMap.set(hId, bets);
                    totalPot += bets;
                });
            }

            // Map all 12 horses with their respective live bet amounts
            const enrichedHorses = horses.map((h) => {
                const hId = Number(h.horse_id);
                const bets = betsMap.get(hId) || 0;
                return {
                    ...h,
                    totalBets: bets,
                    hasBets: bets > 0,
                };
            });

            const zeroBetHorses = enrichedHorses.filter((h) => h.totalBets === 0);
            const bettedHorses = enrichedHorses.filter((h) => h.totalBets > 0);

            // ----------------------------------------------------------------------
            // RULE 1: Agar kisi bhi horse pe bet nahi laga (total bets = 0)
            // -> Koi ek random horse jitega (all 12 horses)
            // ----------------------------------------------------------------------
            if (bettedHorses.length === 0 || totalPot === 0) {
                const randomWinner = horses[Math.floor(Math.random() * horses.length)];
                console.log(`[RaceEngine] 🏆 RULE 1 APPLIED: No bets placed on any horse. Random winner: Horse #${randomWinner.serial_number} (${randomWinner.horse_name_snapshot})`);
                return randomWinner;
            }

            // ----------------------------------------------------------------------
            // RULE 4: Agar kuch horses pe bet lage hain (e.g. 7, 8, 9) aur baki pe ₹0
            // -> Jinpe bet lge hain unko NAHI jitana, jispe ₹0 bet hai unme se random jitega
            // ----------------------------------------------------------------------
            if (zeroBetHorses.length > 0) {
                const chosenZeroHorse = zeroBetHorses[Math.floor(Math.random() * zeroBetHorses.length)];
                const winnerHorse = horses.find((h) => Number(h.horse_id) === Number(chosenZeroHorse.horse_id)) || chosenZeroHorse;
                console.log(`[RaceEngine] 🏆 RULE 4 APPLIED: Bets placed on ${bettedHorses.length} horses (Pot: ₹${totalPot}). Picked unbetted horse: Horse #${winnerHorse.serial_number} (${winnerHorse.horse_name_snapshot}) [₹0 Bet, House Payout: ₹0]`);
                return winnerHorse;
            }

            // ----------------------------------------------------------------------
            // RULE 2 & 3: Agar sabhi 12 horses pe bet lage hain
            // -> Sabse kam amount wala jitega (Rule 2)
            // -> Agar barabar/tied lowest amount hai to unme se random jitega (Rule 3)
            // ----------------------------------------------------------------------
            const minAmount = Math.min(...enrichedHorses.map((h) => h.totalBets));
            const lowestBetHorses = enrichedHorses.filter((h) => h.totalBets === minAmount);

            const chosenLowestHorse = lowestBetHorses[Math.floor(Math.random() * lowestBetHorses.length)];
            const winnerHorse = horses.find((h) => Number(h.horse_id) === Number(chosenLowestHorse.horse_id)) || chosenLowestHorse;

            if (lowestBetHorses.length === 1) {
                console.log(`[RaceEngine] 🏆 RULE 2 APPLIED: All horses have bets. Winner with LEAST bet amount (₹${minAmount}): Horse #${winnerHorse.serial_number} (${winnerHorse.horse_name_snapshot})`);
            } else {
                console.log(`[RaceEngine] 🏆 RULE 3 APPLIED: Tied/Equal minimum bets (₹${minAmount}) across ${lowestBetHorses.length} horses. Randomly picked: Horse #${winnerHorse.serial_number} (${winnerHorse.horse_name_snapshot})`);
            }

            return winnerHorse;
        } catch (error) {
            console.error('[RaceEngine] Error in calculateSmartWinner, fallback to random:', error.message);
            return horses[Math.floor(Math.random() * horses.length)];
        }
    }

    /**
     * Admin Force Winner: Sets forced winner for active or future race
     */
    async setForcedWinner({ gameSerial, horseSerial, horseId, horseName = null, reason = 'Admin Live Override' }) {
        const targetSerial = gameSerial || this.currentRace?.game_serial;
        const serialNum = Number(horseSerial);

        if (!horseId && (!Number.isInteger(serialNum) || serialNum <= 0)) {
            return { success: false, message: 'Please provide a valid horseSerial or horseId.', locked: false };
        }

        let targetHorse = null;
        if (this.currentHorses.length > 0) {
            targetHorse = this.currentHorses.find(
                (h) => (horseId && Number(h.horse_id) === Number(horseId)) || Number(h.serial_number) === serialNum
            );
        }

        if (!targetHorse && horseId) {
            const dbHorse = await HorseModel.findById(horseId);
            if (dbHorse) {
                targetHorse = {
                    horse_id: dbHorse.id,
                    serial_number: dbHorse.serial_number,
                    horse_name_snapshot: dbHorse.name,
                };
            }
        }

        const isCurrentActive = this.currentRace && String(this.currentRace.game_serial) === String(targetSerial);

        // A globally valid horse may not belong to this race's horse snapshot.
        // Refuse the live override instead of accepting a winner the track cannot use.
        if (!targetSerial) {
            return {
                success: false,
                message: 'Please provide a valid gameSerial for the active or scheduled race.',
                locked: false,
            };
        }

        if (!targetHorse && horseSerial !== undefined && horseSerial !== null) {
            const serialHorse = await HorseModel.findBySerialNumber(serialNum);
            if (serialHorse) {
                targetHorse = {
                    horse_id: serialHorse.id,
                    serial_number: serialHorse.serial_number,
                    horse_name_snapshot: serialHorse.name,
                };
            }
        }

        if (isCurrentActive && !targetHorse && horseId) {
            const activeRaceHorse = this.currentHorses.find((h) => Number(h.horse_id) === Number(horseId));
            if (activeRaceHorse) targetHorse = activeRaceHorse;
        }

        const winnerRecord = {
            gameSerial: String(targetSerial),
            horseId: targetHorse ? targetHorse.horse_id : (horseId ? Number(horseId) : null),
            horseSerial: targetHorse ? targetHorse.serial_number : serialNum,
            horseName: targetHorse ? targetHorse.horse_name_snapshot : (horseName || `Horse #${serialNum}`),
            reason,
            setAt: new Date().toISOString(),
        };

        if (isCurrentActive && !targetHorse) {
            return {
                success: false,
                message: `Horse #${winnerRecord.horseSerial} is not participating in Race #${targetSerial}. Choose one of this race's horses.`,
                locked: false,
            };
        }

        if (!isCurrentActive && !targetHorse) {
            return {
                success: false,
                message: `Horse #${winnerRecord.horseSerial} was not found. Provide a valid horse ID or serial number.`,
                locked: false,
            };
        }

        if (isCurrentActive) {
            if (this.currentRace.status === RACE_STATUSES.RUNNING) {
                const startedAt = this.currentRace.started_at ? new Date(this.currentRace.started_at).getTime() : Date.now();
                const elapsedMs = Date.now() - startedAt;
                if (elapsedMs >= LIVE_FORCE_WINNER_WINDOW_MS) {
                    return {
                        success: false,
                        message: 'Live forced winner can only be set or changed during the first 10 seconds after the race starts.',
                        locked: true,
                        elapsedRunningSec: Number((elapsedMs / 1000).toFixed(2)),
                        forceWindowSeconds: LIVE_FORCE_WINNER_WINDOW_MS / 1000,
                    };
                }
            } else if ([RACE_STATUSES.FINISHING, RACE_STATUSES.RESULT, RACE_STATUSES.FINISHED].includes(this.currentRace.status)) {
                return {
                    success: false,
                    message: `Cannot change forced winner while race is in ${this.currentRace.status} state. Race has already finished.`,
                    locked: true,
                };
            } else if (this.currentRace.status !== RACE_STATUSES.BETTING_OPEN) {
                return {
                    success: false,
                    message: `Live winner can only be forced before the race starts or during the first 10 seconds of RUNNING. Current state: ${this.currentRace.status}.`,
                    locked: true,
                };
            }

            this.forcedCurrentWinner = winnerRecord;
            this.predeterminedWinner = targetHorse;
            // Sync the in-memory horse snapshot used by socket broadcasts so the
            // immediate current-state read reflects the actual forced horse.
            this.currentHorses = this.currentHorses.map((h) => ({ ...h }));
            console.log(`[RaceEngine] 🎮 Admin set LIVE forced winner for active Race #${targetSerial}: Horse #${winnerRecord.horseSerial} (${winnerRecord.horseName})`);
        }

        if (targetSerial) {
            this.scheduledWinners.set(targetSerial, winnerRecord);
            try {
                await pool.query(
                    `INSERT INTO scheduled_race_winners (game_serial, horse_id, horse_serial, horse_name, reason, status)
                     VALUES (?, ?, ?, ?, ?, 'PENDING')
                     ON DUPLICATE KEY UPDATE horse_id = VALUES(horse_id), horse_serial = VALUES(horse_serial), horse_name = VALUES(horse_name), reason = VALUES(reason), status = 'PENDING'`,
                    [targetSerial, winnerRecord.horseId, winnerRecord.horseSerial, winnerRecord.horseName, reason]
                );
            } catch (dbErr) {
                console.error('[RaceEngine] Error saving scheduled winner in DB:', dbErr.message);
            }
        }

        try {
            const { socketService } = require('./socket.service');
            if (socketService.io) {
                const eventPayload = {
                    gameSerial: String(targetSerial),
                    isLive: isCurrentActive,
                    forcedWinner: winnerRecord,
                    timestamp: winnerRecord.setAt,
                };
                if (isCurrentActive) {
                    socketService.io.to('races').emit('race:forced_winner', eventPayload);
                }
                socketService.io.to('admin').emit('admin:race_control_updated', {
                    type: 'FORCED_WINNER_SET',
                    ...eventPayload,
                });
            }
        } catch (sErr) { }

        return {
            success: true,
            message: isCurrentActive
                ? `Active Race #${targetSerial} winner successfully set to Horse #${winnerRecord.horseSerial} (${winnerRecord.horseName})`
                : `Future Race #${targetSerial} winner successfully scheduled to Horse #${winnerRecord.horseSerial} (${winnerRecord.horseName})`,
            gameSerial: targetSerial,
            isLive: isCurrentActive,
            forcedWinner: winnerRecord,
        };
    }

    /**
     * Admin Extend Running Time: Adds seconds to active race
     */
    async extendRaceTime({ extraSeconds }) {
        const sec = Math.max(1, parseInt(extraSeconds, 10) || 5);
        const extraMs = sec * 1000;
        this.extraRunningMs += extraMs;

        const currentState = this.getCurrentState();
        console.log(`[RaceEngine] ⏱️ Admin added +${sec}s to Race #${currentState.gameSerial}. Total extra time: ${this.extraRunningMs / 1000}s`);

        try {
            const { socketService } = require('./socket.service');
            if (socketService.io) {
                socketService.io.to('admin').emit('admin:race_control_updated', {
                    type: 'TIME_EXTENDED',
                    extraSeconds: sec,
                    totalExtraSeconds: this.extraRunningMs / 1000,
                    timeRemainingSec: currentState.timeRemainingSec + sec,
                    timestamp: new Date().toISOString(),
                });
                socketService.io.to('races').emit('race:time_extended', {
                    extraSeconds: sec,
                    timeRemainingSec: currentState.timeRemainingSec + sec,
                });
            }
        } catch (sErr) { }

        return {
            success: true,
            message: `Added +${sec} seconds to current race`,
            extraSeconds: sec,
            totalExtraSeconds: this.extraRunningMs / 1000,
            gameSerial: currentState.gameSerial,
        };
    }

    /**
     * Cancel forced winner for a gameSerial
     */
    async clearForcedWinner(gameSerial) {
        const targetSerial = gameSerial || this.currentRace?.game_serial;
        if (!targetSerial) return { success: false, message: 'No game serial provided' };

        if (this.currentRace && String(this.currentRace.game_serial) === String(targetSerial)) {
            this.forcedCurrentWinner = null;
        }

        this.scheduledWinners.delete(targetSerial);

        try {
            await pool.query(
                "UPDATE scheduled_race_winners SET status = 'CANCELLED' WHERE game_serial = ?",
                [targetSerial]
            );
        } catch (dbErr) { }

        try {
            const { socketService } = require('./socket.service');
            if (socketService.io) {
                socketService.io.to('admin').emit('admin:race_control_updated', {
                    type: 'FORCED_WINNER_CANCELLED',
                    gameSerial: targetSerial,
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (sErr) { }

        return {
            success: true,
            message: `Forced winner cancelled for Race #${targetSerial}. Reverted to Smart/Auto calculation.`,
            gameSerial: targetSerial,
        };
    }

    /**
     * Get all active and scheduled forced winners
     */
    async getScheduledWinners() {
        const currentActive = this.forcedCurrentWinner ? {
            gameSerial: this.currentRace?.game_serial,
            raceId: this.currentRace?.id,
            isLive: true,
            forcedWinner: this.forcedCurrentWinner,
        } : null;

        let dbScheduled = [];
        try {
            const [rows] = await pool.query(
                "SELECT id, game_serial, horse_id, horse_serial, horse_name, reason, status, created_at FROM scheduled_race_winners WHERE status = 'PENDING' ORDER BY id ASC"
            );
            dbScheduled = rows.map((r) => ({
                id: Number(r.id),
                gameSerial: r.game_serial,
                horseId: r.horse_id ? Number(r.horse_id) : null,
                horseSerial: Number(r.horse_serial),
                horseName: r.horse_name,
                reason: r.reason,
                status: r.status,
                createdAt: r.created_at,
            }));
        } catch (dbErr) { }

        return {
            currentLiveOverride: currentActive,
            scheduledFutureWinners: dbScheduled,
        };
    }

    scheduleTransition(nextStatus, delayMs) {
        if (this.activeTimer) clearTimeout(this.activeTimer);
        this.activeTimer = setTimeout(() => {
            this.transitionTo(nextStatus);
        }, Math.max(0, delayMs));
    }

    scheduleNextRaceCreation(delayMs) {
        if (this.activeTimer) clearTimeout(this.activeTimer);
        this.activeTimer = setTimeout(async () => {
            await this.createNextRace();
        }, Math.max(0, delayMs));
    }

    scheduleNextAttempt(delayMs) {
        if (this.activeTimer) clearTimeout(this.activeTimer);
        this.activeTimer = setTimeout(async () => {
            try {
                await this.recoverOrCreateRace();
            } catch (error) {
                console.error('[RaceEngine] ❌ Error retrying race initialization:', error);
                if (this.isRunning) this.scheduleNextAttempt(delayMs);
            }
        }, Math.max(0, delayMs));
    }

    /**
     * Get real-time authoritative snapshot of current global race
     * Handles ANY stage the user joins in: BETTING_OPEN, BETTING_CLOSED, COUNTDOWN, RUNNING, FINISHING, RESULT, FINISHED
     */
    getCurrentState() {
        if (!this.currentRace) {
            return {
                active: false,
                message: 'No global race active. Initializing next race...',
            };
        }

        const now = Date.now();
        const status = this.currentRace.status;
        let timeRemainingSec = 0;
        let elapsedSec = 0;
        let countdownDisplay = null;
        let stageDescription = '';

        if (status === RACE_STATUSES.BETTING_OPEN && this.currentRace.betting_close_at) {
            const closeTime = new Date(this.currentRace.betting_close_at).getTime();
            timeRemainingSec = Math.max(0, Number(((closeTime - now) / 1000).toFixed(1)));
            stageDescription = 'Betting is open. Place your bets.';
        } else if (status === RACE_STATUSES.BETTING_CLOSED && this.currentRace.countdown_at) {
            const countTime = new Date(this.currentRace.countdown_at).getTime();
            timeRemainingSec = Math.max(0, Number(((countTime - now) / 1000).toFixed(1)));
            stageDescription = 'Betting locked. Preparing race countdown.';
        } else if (status === RACE_STATUSES.COUNTDOWN) {
            const countdownStartTime = this.currentRace.countdown_at ? new Date(this.currentRace.countdown_at).getTime() : now;
            const diffMs = now - countdownStartTime;
            let countdownDisplay = 3;
            if (diffMs >= 3000) {
                countdownDisplay = 'GO';
            } else if (diffMs >= 2000) {
                countdownDisplay = 1;
            } else if (diffMs >= 1000) {
                countdownDisplay = 2;
            }
            timeRemainingSec = Math.max(0, Number(((3000 - diffMs) / 1000).toFixed(1)));
            stageDescription = `Race starting in ${countdownDisplay}...`;
        } else if (status === RACE_STATUSES.RUNNING) {
            const raceStartTime = this.currentRace.started_at ? new Date(this.currentRace.started_at).getTime() : now;
            const runElapsedMs = now - raceStartTime;
            elapsedSec = Number((runElapsedMs / 1000).toFixed(1));
            timeRemainingSec = Math.max(0, Number(((raceConfig.RUNNING_MS - runElapsedMs) / 1000).toFixed(1)));
            stageDescription = 'Race in progress. Horses running.';
        } else if (status === RACE_STATUSES.FINISHING) {
            stageDescription = 'Horses crossing the finish line.';
            timeRemainingSec = Math.max(0, Number((raceConfig.FINISHING_MS / 1000).toFixed(1)));
        } else if (status === RACE_STATUSES.RESULT) {
            stageDescription = 'Race completed. Winner announced.';
            timeRemainingSec = Math.max(0, Number((raceConfig.RESULT_MS / 1000).toFixed(1)));
        } else if (status === RACE_STATUSES.FINISHED) {
            stageDescription = 'Race finished. Preparing next round.';
            timeRemainingSec = 0;
        }

        const winnerHorse = this.currentHorses.find(
            (h) => h.horse_id === this.currentRace.winner_horse_id || h.finish_position === 1
        );

        return {
            active: true,
            id: Number(this.currentRace.id),
            gameSerial: String(this.currentRace.game_serial),
            status: this.currentRace.status,
            stageDescription,
            bettingAllowed: RaceStateMachine.isBettingAllowed(this.currentRace.status),
            timeRemainingSec,
            elapsedSec,
            countdownDisplay,
            bettingOpenAt: this.currentRace.betting_open_at,
            bettingCloseAt: this.currentRace.betting_close_at,
            countdownAt: this.currentRace.countdown_at,
            startedAt: this.currentRace.started_at,
            finishedAt: this.currentRace.finished_at,
            resultAt: this.currentRace.result_at,
            winnerHorseId: this.currentRace.winner_horse_id,
            winner: winnerHorse ? {
                id: winnerHorse.horse_id,
                serialNumber: winnerHorse.serial_number,
                name: winnerHorse.horse_name_snapshot,
                finishPosition: winnerHorse.finish_position,
                finishTime: winnerHorse.finish_time,
                result: winnerHorse.result,
            } : null,
            jackpot: {
                isJackpot: (this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1) > 1,
                multiplier: Number(this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1),
                label: (this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1) > 1
                    ? `${Number(this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1)}X`
                    : 'N',
                slots: ['N', '2X', '3X', '4X'],
                message: (this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1) > 1
                    ? `🔥 JACKPOT ACTIVE: ${Number(this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1)}X PAYOUT! 🔥`
                    : 'N (Nothing - Standard Payout)',
            },
            horses: this.currentHorses.map((h) => ({
                id: h.horse_id,
                serialNumber: h.serial_number,
                name: h.horse_name_snapshot,
                imageUrl: h.image_url || null,
                startingPosition: h.starting_position,
                finishPosition: h.finish_position,
                finishTime: h.finish_time,
                result: h.result,
            })),
        };
    }

    /**
     * Resolves jackpot multiplier for a new race based on Admin schedules & flexible config modes
     * Supports: EVERY_ROUND, ROUND_INTERVAL (e.g. every 5 rounds), TIME_INTERVAL (e.g. every 180s), PROBABILITY, MANUAL
     */
    async evaluateRaceJackpot(gameSerial) {
        this.roundCounter++;
        const now = Date.now();

        // The GLOBAL_CONTINUOUS row survives app restarts and applies to every new race.
        if (!this.continuousJackpot) {
            try {
                const [rows] = await pool.query("SELECT multiplier, reason FROM scheduled_jackpots WHERE game_serial = 'GLOBAL_CONTINUOUS' AND status = 'PENDING' LIMIT 1");
                if (rows.length) this.continuousJackpot = { multiplier: Number(rows[0].multiplier), reason: rows[0].reason || 'Admin continuous jackpot', endsAt: null, roundsRemaining: null };
            } catch (err) { /* Keep engine usable if persistence is temporarily unavailable. */ }
        }

        // Continuous modes take precedence over one-off schedules and auto rules.
        if (this.continuousJackpot) {
            const control = this.continuousJackpot;
            const expiredByTime = control.endsAt && now >= control.endsAt;
            const expiredByRounds = Number.isFinite(control.roundsRemaining) && control.roundsRemaining <= 0;
            if (expiredByTime || expiredByRounds) {
                this.continuousJackpot = null;
                this.emitJackpotControlUpdate({ active: false, multiplier: 1, reason: 'Continuous jackpot expired' });
            } else {
                if (Number.isFinite(control.roundsRemaining)) control.roundsRemaining--;
                this.forcedCurrentJackpot = { multiplier: control.multiplier, reason: control.reason };
                this.lastJackpotTime = now;
                this.lastJackpotRound = this.roundCounter;
                return { multiplier: control.multiplier, isJackpot: control.multiplier > 1, source: 'CONTINUOUS' };
            }
        }

        // 1. Check in-memory pre-scheduled jackpot for this specific serial
        const preScheduled = this.scheduledJackpots.get(gameSerial);
        if (preScheduled) {
            const mult = Number(preScheduled.multiplier) || 1;
            this.forcedCurrentJackpot = preScheduled;
            if (mult > 1) {
                this.lastJackpotTime = now;
                this.lastJackpotRound = this.roundCounter;
            }
            console.log(`[RaceEngine] 🎰 In-Memory Pre-scheduled Jackpot loaded for Race #${gameSerial}: ${mult}X`);
            return { multiplier: mult, isJackpot: mult > 1, source: 'PRE_SCHEDULED' };
        }

        // 2. Check Database scheduled jackpot for this serial
        try {
            const [jackRows] = await pool.query(
                "SELECT multiplier, reason FROM scheduled_jackpots WHERE game_serial = ? AND status = 'PENDING' LIMIT 1",
                [gameSerial]
            );
            if (jackRows.length > 0) {
                const mult = Number(jackRows[0].multiplier) || 1;
                this.forcedCurrentJackpot = {
                    multiplier: mult,
                    reason: jackRows[0].reason,
                };
                if (mult > 1) {
                    this.lastJackpotTime = now;
                    this.lastJackpotRound = this.roundCounter;
                }
                try {
                    await pool.query("UPDATE scheduled_jackpots SET status = 'APPLIED' WHERE game_serial = ?", [gameSerial]);
                } catch (uErr) { }
                console.log(`[RaceEngine] 🎰 Database scheduled Jackpot loaded for Race #${gameSerial}: ${mult}X`);
                return { multiplier: mult, isJackpot: mult > 1, source: 'DB_SCHEDULED' };
            }
        } catch (dbErr) { }

        // 3. Check Time-Scheduled Jackpot Queue (Set by Admin e.g. after X seconds or at specific time)
        if (this.timeScheduledJackpots && this.timeScheduledJackpots.length > 0) {
            const dueIndex = this.timeScheduledJackpots.findIndex((item) => now >= item.targetTimestamp);
            if (dueIndex !== -1) {
                const dueItem = this.timeScheduledJackpots.splice(dueIndex, 1)[0];
                const mult = Number(dueItem.multiplier) || 2;
                this.forcedCurrentJackpot = {
                    multiplier: mult,
                    reason: dueItem.reason || 'Time-Scheduled Jackpot',
                };
                if (mult > 1) {
                    this.lastJackpotTime = now;
                    this.lastJackpotRound = this.roundCounter;
                }
                console.log(`[RaceEngine] ⏰ Admin Time-Scheduled Jackpot TRIGGERED [${mult}X] for Race #${gameSerial}! [${dueItem.reason}]`);
                return { multiplier: mult, isJackpot: mult > 1, source: 'TIME_SCHEDULED' };
            }
        }

        // 4. Evaluate Engine Global Config Modes
        if (!this.jackpotConfig.enabled || this.jackpotConfig.mode === 'DISABLED' || this.jackpotConfig.mode === 'MANUAL') {
            return { multiplier: 1, isJackpot: false, source: 'STANDARD' };
        }

        const allowed = (Array.isArray(this.jackpotConfig.allowedMultipliers) && this.jackpotConfig.allowedMultipliers.length > 0)
            ? this.jackpotConfig.allowedMultipliers
            : [2, 3, 4];

        const pickMultiplier = () => {
            const target = this.jackpotConfig.targetMultiplier;
            if (target === 2 || target === '2' || target === '2X') return 2;
            if (target === 3 || target === '3' || target === '3X') return 3;
            if (target === 4 || target === '4' || target === '4X') return 4;
            return allowed[Math.floor(Math.random() * allowed.length)] || 2;
        };

        let shouldTrigger = false;
        let triggerReason = '';

        const mode = (this.jackpotConfig.mode || 'PROBABILITY').toUpperCase();

        if (mode === 'EVERY_ROUND') {
            shouldTrigger = true;
            triggerReason = 'Admin Mode: Every Round Jackpot';
        } else if (mode === 'ROUND_INTERVAL') {
            const interval = Math.max(1, Number(this.jackpotConfig.intervalRounds) || 5);
            if (this.roundCounter % interval === 0 || (this.roundCounter - this.lastJackpotRound) >= interval) {
                shouldTrigger = true;
                triggerReason = `Admin Mode: Every ${interval} Rounds (Round #${this.roundCounter})`;
            }
        } else if (mode === 'TIME_INTERVAL') {
            const intervalSec = Math.max(5, Number(this.jackpotConfig.intervalSeconds) || 180);
            const elapsedSec = (now - this.lastJackpotTime) / 1000;
            if (elapsedSec >= intervalSec) {
                shouldTrigger = true;
                triggerReason = `Admin Mode: Every ${intervalSec}s (${Math.floor(elapsedSec)}s elapsed)`;
            }
        } else if (mode === 'PROBABILITY') {
            const prob = Math.max(0, Math.min(1, Number(this.jackpotConfig.probability) || 0.02));
            if (Math.random() < prob) {
                shouldTrigger = true;
                triggerReason = `Admin Mode: Auto Probability (${(prob * 100).toFixed(1)}%)`;
            }
        }

        if (shouldTrigger) {
            const chosenMult = pickMultiplier();
            this.lastJackpotTime = now;
            this.lastJackpotRound = this.roundCounter;
            this.forcedCurrentJackpot = {
                multiplier: chosenMult,
                reason: triggerReason,
            };
            console.log(`[RaceEngine] 🔥 JACKPOT TRIGGERED [${chosenMult}X] for Race #${gameSerial}! [${triggerReason}] 🔥`);
            return { multiplier: chosenMult, isJackpot: chosenMult > 1, source: mode };
        }

        return { multiplier: 1, isJackpot: false, source: 'STANDARD' };
    }

    /**
     * Admin Force Jackpot: Sets forced jackpot multiplier for active or future race
     * Supports:
     * - Specific round / gameSerial (e.g. "20260923050")
     * - Round offset (e.g. roundsAfter: 5 -> 5 rounds from now)
     * - Time offset (e.g. afterSeconds: 180 -> in 180s)
     * - Specific time (e.g. scheduledTime: "2026-09-23T12:00:00Z")
     * - Multiplier: 2, 3, 4, 'RANDOM', or 'N' (1X / cancel)
     */
    async setForcedJackpot(params = {}) {
        const {
            gameSerial,
            game_serial,
            roundsAfter,
            roundOffset,
            afterSeconds,
            scheduledAt,
            scheduledTime,
            multiplier = 2,
            reason = 'Admin Forced Jackpot',
        } = params;

        let targetSerial = gameSerial || game_serial;

        // Resolve Multiplier value
        let mult = 1;
        if (typeof multiplier === 'string') {
            const clean = multiplier.trim().toUpperCase();
            if (clean === 'N' || clean === 'NONE' || clean === 'NOTHING' || clean === '1X' || clean === '1') {
                mult = 1;
            } else if (clean === 'RANDOM' || clean === 'AUTO') {
                const allowed = this.jackpotConfig.allowedMultipliers || [2, 3, 4];
                mult = allowed[Math.floor(Math.random() * allowed.length)] || 2;
            } else if (clean.startsWith('2')) {
                mult = 2;
            } else if (clean.startsWith('3')) {
                mult = 3;
            } else if (clean.startsWith('4')) {
                mult = 4;
            } else {
                mult = Math.max(1, parseInt(clean, 10) || 1);
            }
        } else {
            mult = Math.max(1, Number(multiplier) || 1);
        }

        const label = mult > 1 ? `${mult}X` : 'N';

        // 1. Calculate Target Game Serial by relative round offset (e.g. roundsAfter: 5)
        const roundDiff = Number(roundsAfter || roundOffset);
        if (!targetSerial && roundDiff && this.currentRace?.game_serial) {
            const curStr = String(this.currentRace.game_serial);
            const prefix = curStr.slice(0, 8);
            const seq = parseInt(curStr.slice(8), 10) || 1;
            targetSerial = `${prefix}${String(seq + roundDiff).padStart(3, '0')}`;
        }

        // 2. Handle Time-based scheduling (afterSeconds or scheduledTime)
        const delaySec = Number(afterSeconds);
        let targetTimestamp = null;
        if (delaySec && delaySec > 0) {
            targetTimestamp = Date.now() + (delaySec * 1000);
        } else if (scheduledAt || scheduledTime) {
            const parsed = new Date(scheduledAt || scheduledTime).getTime();
            if (!isNaN(parsed) && parsed > Date.now()) {
                targetTimestamp = parsed;
            }
        }

        if (targetTimestamp && !targetSerial) {
            if (!this.timeScheduledJackpots) this.timeScheduledJackpots = [];
            const timeRecord = {
                targetTimestamp,
                targetTimeIso: new Date(targetTimestamp).toISOString(),
                multiplier: mult,
                label,
                reason: reason === 'Admin Forced Jackpot' ? `Time Scheduled in ${Math.round((targetTimestamp - Date.now()) / 1000)}s` : reason,
                createdAt: new Date().toISOString(),
            };
            this.timeScheduledJackpots.push(timeRecord);

            console.log(`[RaceEngine] ⏰ Admin scheduled Jackpot for ${new Date(targetTimestamp).toLocaleTimeString()} (${label})`);

            try {
                const { socketService } = require('./socket.service');
                if (socketService.io) {
                    socketService.io.to('admin').emit('admin:jackpot_time_scheduled', timeRecord);
                }
            } catch (sErr) { }

            return {
                success: true,
                message: `Jackpot ${label} scheduled for time ${new Date(targetTimestamp).toLocaleTimeString()}`,
                scheduledTime: new Date(targetTimestamp).toISOString(),
                multiplier: mult,
                label,
            };
        }

        targetSerial = targetSerial || this.currentRace?.game_serial;
        const isCurrentActive = this.currentRace && String(this.currentRace.game_serial) === String(targetSerial);

        const jackpotRecord = {
            gameSerial: String(targetSerial),
            multiplier: mult,
            label,
            slots: ['N', '2X', '3X', '4X'],
            reason,
            setAt: new Date().toISOString(),
        };

        if (targetSerial && roundDiff) {
            this.roundQueue = {
                active: true,
                targetGameSerial: String(targetSerial),
                roundsTotal: roundDiff,
                multiplier: mult,
                multiplierLabel: label,
                setAt: Date.now(),
            };
        }

        if (isCurrentActive) {
            this.currentRace.jackpot_multiplier = mult;
            this.currentRace.jackpotMultiplier = mult;
            this.currentRace.is_jackpot = mult > 1 ? 1 : 0;
            this.currentRace.isJackpot = mult > 1;
            this.forcedCurrentJackpot = jackpotRecord;
            if (mult > 1) {
                this.lastJackpotTime = Date.now();
                this.lastJackpotRound = this.roundCounter;
            }

            try {
                await RaceModel.updateJackpotMultiplier(this.currentRace.id, mult, mult > 1);
            } catch (dbErr) { }

            console.log(`[RaceEngine] 🎰 Admin set LIVE forced Jackpot for active Race #${targetSerial}: ${label}`);
        } else {
            this.scheduledJackpots.set(String(targetSerial), jackpotRecord);
            try {
                await RaceModel.saveScheduledJackpot({
                    gameSerial: String(targetSerial),
                    multiplier: mult,
                    reason,
                });
            } catch (dbErr) { }
            console.log(`[RaceEngine] 🎰 Admin pre-scheduled forced Jackpot for future Game Serial #${targetSerial}: ${label}`);
        }

        // Broadcast real-time Socket updates
        try {
            const { socketService } = require('./socket.service');
            if (socketService.io) {
                const payload = {
                    gameSerial: String(targetSerial),
                    isLive: isCurrentActive,
                    jackpotMultiplier: mult,
                    isJackpot: mult > 1,
                    multiplierLabel: label,
                    slots: ['1X', '2X', '3X', '4X'],
                    message: mult > 1 ? `🔥 JACKPOT ACTIVE: ${label} PAYOUT! 🔥` : '1X (Standard Payout)',
                    reason,
                    timestamp: new Date().toISOString(),
                };

                socketService.io.to('admin').emit('admin:jackpot_updated', payload);
                if (isCurrentActive) {
                    socketService.io.to('races').emit('race:jackpot', payload);
                    socketService.io.to('races').emit('race:state_change', this.getCurrentState());
                }
            }
        } catch (sErr) { }

        return {
            success: true,
            message: isCurrentActive
                ? `Active Race #${targetSerial} Jackpot successfully set to ${label}`
                : `Future Race #${targetSerial} Jackpot successfully scheduled to ${label}`,
            gameSerial: targetSerial,
            isLive: isCurrentActive,
            jackpot: jackpotRecord,
            roundQueue: this.roundQueue,
        };
    }

    emitJackpotControlUpdate(extra = {}) {
        try {
            const { socketService } = require('./socket.service');
            if (!socketService.io) return;
            const payload = {
                ...this.getJackpotControlState(),
                ...extra,
                timestamp: new Date().toISOString(),
            };
            socketService.io.to('admin').emit('admin:jackpot_updated', payload);
            socketService.io.to('races').emit('race:jackpot', payload);
            socketService.io.to('races').emit('race:state_changed', this.getCurrentState());
        } catch (err) { /* Socket broadcast is best effort. */ }
    }

    getJackpotControlState() {
        const c = this.continuousJackpot;
        const now = Date.now();
        return {
            enabled: Boolean(c),
            mode: c ? (c.endsAt ? 'DURATION' : c.roundsRemaining !== null ? 'ROUNDS' : 'CONTINUOUS') : 'OFF',
            multiplier: c?.multiplier || 1,
            multiplierLabel: c?.multiplier > 1 ? `${c.multiplier}X` : '1X',
            endsAt: c?.endsAt ? new Date(c.endsAt).toISOString() : null,
            secondsLeft: c?.endsAt ? Math.max(0, Math.ceil((c.endsAt - now) / 1000)) : null,
            roundsRemaining: Number.isFinite(c?.roundsRemaining) ? c.roundsRemaining : null,
            reason: c?.reason || null,
        };
    }

    async configureContinuousJackpot(options = {}) {
        const { enabled = true, mode = 'CONTINUOUS', multiplier = 'RANDOM', durationSeconds, rounds } = options;
        if (enabled === false || String(mode).toUpperCase() === 'OFF') {
            this.continuousJackpot = null;
            await RaceModel.clearScheduledJackpot('GLOBAL_CONTINUOUS');
            const state = this.getJackpotControlState();
            this.emitJackpotControlUpdate({ ...state, message: 'Jackpot turned off (1X)' });
            return { success: true, message: 'Jackpot turned off (1X)', ...state };
        }
        const allowed = this.jackpotConfig.allowedMultipliers?.length ? this.jackpotConfig.allowedMultipliers : [2, 3, 4];
        const normalized = String(multiplier).trim().toUpperCase();
        let mult = normalized === 'RANDOM' || normalized === 'AUTO'
            ? allowed[Math.floor(Math.random() * allowed.length)] || 2
            : Number(normalized.replace(/X$/, ''));
        if (![2, 3, 4].includes(mult)) throw Object.assign(new Error('multiplier must be 2, 3, 4, or RANDOM'), { statusCode: 400 });

        const cleanMode = String(mode).toUpperCase();
        const seconds = Number(durationSeconds);
        const roundCount = Number(rounds);
        const endsAt = cleanMode === 'DURATION' || (Number.isFinite(seconds) && seconds > 0)
            ? Date.now() + Math.max(1, seconds || 180) * 1000
            : null;
        const roundsRemaining = cleanMode === 'ROUNDS' || (Number.isFinite(roundCount) && roundCount > 0)
            ? Math.max(1, Math.floor(roundCount || 1))
            : null;

        this.continuousJackpot = {
            multiplier: mult,
            endsAt,
            roundsRemaining,
            reason: `Admin continuous jackpot ${mult}X`,
        };
        // Persist indefinite ON mode. Finite duration/round modes intentionally expire with process lifetime.
        if (!endsAt && roundsRemaining === null) {
            await RaceModel.saveScheduledJackpot({ gameSerial: 'GLOBAL_CONTINUOUS', multiplier: mult, reason: this.continuousJackpot.reason });
        } else {
            await RaceModel.clearScheduledJackpot('GLOBAL_CONTINUOUS');
        }
        this.jackpotConfig.enabled = true;
        this.jackpotConfig.mode = 'MANUAL';

        // Apply to the current race immediately; future races read continuousJackpot in evaluateRaceJackpot.
        if (this.currentRace && !['RESULT', 'FINISHED'].includes(this.currentRace.status)) {
            this.currentRace.jackpot_multiplier = mult;
            this.currentRace.jackpotMultiplier = mult;
            this.currentRace.is_jackpot = 1;
            this.currentRace.isJackpot = true;
            RaceModel.updateJackpotMultiplier(this.currentRace.id, mult, true).catch(() => {});
        }
        const state = this.getJackpotControlState();
        this.emitJackpotControlUpdate({ ...state, message: `Continuous ${mult}X jackpot enabled` });
        return { success: true, message: `Continuous ${mult}X jackpot enabled`, ...state };
    }

    /**
     * Cancel forced jackpot override for a gameSerial (Reset to 1X / Normal)
     */
    async clearForcedJackpot(gameSerial) {
        const targetSerial = gameSerial || this.currentRace?.game_serial;

        this.roundQueue = null;
        this.timeScheduledJackpots = [];
        this.continuousJackpot = null;

        if (this.currentRace) {
            this.currentRace.jackpot_multiplier = 1;
            this.currentRace.jackpotMultiplier = 1;
            this.currentRace.is_jackpot = 0;
            this.currentRace.isJackpot = false;
            this.forcedCurrentJackpot = null;
            try {
                await RaceModel.updateJackpotMultiplier(this.currentRace.id, 1, false);
            } catch (dbErr) { }
        }

        await RaceModel.clearScheduledJackpot('GLOBAL_CONTINUOUS');

        if (targetSerial) {
            this.scheduledJackpots.delete(String(targetSerial));
            try {
                await RaceModel.clearScheduledJackpot(String(targetSerial));
            } catch (dbErr) { }
        }

        try {
            const { socketService } = require('./socket.service');
            if (socketService.io) {
                const payload = {
                    gameSerial: String(targetSerial),
                    jackpotMultiplier: 1,
                    isJackpot: false,
                    multiplierLabel: '1X',
                    slots: ['1X', '2X', '3X', '4X'],
                    message: 'Jackpot reset to 1X (Standard)',
                    timestamp: new Date().toISOString(),
                };
                socketService.io.to('admin').emit('admin:jackpot_updated', payload);
                socketService.io.to('races').emit('race:jackpot', payload);
                socketService.io.to('races').emit('race:state_change', this.getCurrentState());
            }
        } catch (sErr) { }

        return {
            success: true,
            message: `Jackpot cancelled for Race #${targetSerial}. Reverted to 1X (Standard).`,
            gameSerial: targetSerial,
        };
    }

    /**
     * Configure global Jackpot settings and control modes:
     * - mode: 'EVERY_ROUND' | 'ROUND_INTERVAL' | 'TIME_INTERVAL' | 'PROBABILITY' | 'MANUAL' | 'DISABLED'
     * - targetMultiplier: 2 | 3 | 4 | 'RANDOM'
     * - intervalRounds: number (e.g. 5 rounds)
     * - intervalSeconds: number (e.g. 180 seconds)
     * - probabilityPercent / probability: number (e.g. 10%)
     * - allowedMultipliers: [2, 3, 4]
     * - enabled: boolean
     */
    updateJackpotConfig(options = {}) {
        const {
            enabled,
            mode,
            targetMultiplier,
            intervalRounds,
            intervalSeconds,
            probabilityPercent,
            probability,
            allowedMultipliers,
        } = options;

        if (enabled !== undefined) {
            this.jackpotConfig.enabled = Boolean(enabled);
        }

        if (mode !== undefined) {
            const cleanMode = String(mode).trim().toUpperCase();
            const validModes = ['EVERY_ROUND', 'ROUND_INTERVAL', 'TIME_INTERVAL', 'PROBABILITY', 'MANUAL', 'DISABLED', 'OFF', 'AUTO'];
            if (cleanMode === 'AUTO') {
                this.jackpotConfig.mode = 'PROBABILITY';
            } else if (cleanMode === 'OFF') {
                this.jackpotConfig.mode = 'DISABLED';
                this.jackpotConfig.enabled = false;
            } else if (validModes.includes(cleanMode)) {
                this.jackpotConfig.mode = cleanMode;
                if (cleanMode !== 'DISABLED') this.jackpotConfig.enabled = true;
            }
        }

        if (targetMultiplier !== undefined) {
            const cleanTarget = String(targetMultiplier).trim().toUpperCase();
            if (cleanTarget === '2' || cleanTarget === '2X') {
                this.jackpotConfig.targetMultiplier = 2;
            } else if (cleanTarget === '3' || cleanTarget === '3X') {
                this.jackpotConfig.targetMultiplier = 3;
            } else if (cleanTarget === '4' || cleanTarget === '4X') {
                this.jackpotConfig.targetMultiplier = 4;
            } else {
                this.jackpotConfig.targetMultiplier = 'RANDOM';
            }
        }

        if (intervalRounds !== undefined) {
            this.jackpotConfig.intervalRounds = Math.max(1, parseInt(intervalRounds, 10) || 5);
        }

        if (intervalSeconds !== undefined) {
            this.jackpotConfig.intervalSeconds = Math.max(5, parseInt(intervalSeconds, 10) || 180);
        }

        if (probabilityPercent !== undefined) {
            this.jackpotConfig.probability = Math.max(0, Math.min(100, Number(probabilityPercent))) / 100;
        } else if (probability !== undefined) {
            this.jackpotConfig.probability = Math.max(0, Math.min(1, Number(probability)));
        }

        if (Array.isArray(allowedMultipliers) && allowedMultipliers.length > 0) {
            const filtered = allowedMultipliers
                .map((m) => parseInt(String(m).replace(/\D/g, ''), 10))
                .filter((m) => [2, 3, 4].includes(m));
            if (filtered.length > 0) {
                this.jackpotConfig.allowedMultipliers = filtered;
            }
        }

        console.log(`[RaceEngine] 🎰 Admin updated Jackpot config: Mode=${this.jackpotConfig.mode}, Target=${this.jackpotConfig.targetMultiplier}, RoundInterval=${this.jackpotConfig.intervalRounds}, TimeInterval=${this.jackpotConfig.intervalSeconds}s, Prob=${(this.jackpotConfig.probability * 100).toFixed(1)}%, Allowed=[${this.jackpotConfig.allowedMultipliers.join(', ')}]`);

        const summary = this.getJackpotConfigSummary();

        // Broadcast to admin room via sockets
        try {
            const { socketService } = require('./socket.service');
            if (socketService.io) {
                socketService.io.to('admin').emit('admin:jackpot_config_updated', summary);
            }
        } catch (sErr) { }

        return {
            success: true,
            message: 'Jackpot configuration and control mode updated successfully',
            config: summary,
        };
    }

    /**
     * Get detailed config summary with human-readable mode description and live counters
     */
    getJackpotConfigSummary() {
        const now = Date.now();
        const elapsedSecSinceLast = Math.floor((now - this.lastJackpotTime) / 1000);
        const roundsSinceLast = Math.max(0, this.roundCounter - this.lastJackpotRound);
        const probVal = Number((this.jackpotConfig.probability * 100).toFixed(1));

        let modeDescription = '';
        switch (this.jackpotConfig.mode) {
            case 'EVERY_ROUND':
                modeDescription = `Every single round gets ${this.jackpotConfig.targetMultiplier === 'RANDOM' ? 'Random (2X/3X/4X)' : `${this.jackpotConfig.targetMultiplier}X`} Jackpot`;
                break;
            case 'ROUND_INTERVAL':
                modeDescription = `Jackpot ${this.jackpotConfig.targetMultiplier === 'RANDOM' ? 'Random (2X/3X/4X)' : `${this.jackpotConfig.targetMultiplier}X`} triggers every ${this.jackpotConfig.intervalRounds} rounds (Next in: ${Math.max(0, this.jackpotConfig.intervalRounds - (this.roundCounter % this.jackpotConfig.intervalRounds))} rounds)`;
                break;
            case 'TIME_INTERVAL':
                modeDescription = `Jackpot ${this.jackpotConfig.targetMultiplier === 'RANDOM' ? 'Random (2X/3X/4X)' : `${this.jackpotConfig.targetMultiplier}X`} triggers after every ${this.jackpotConfig.intervalSeconds}s (Next in: ${Math.max(0, this.jackpotConfig.intervalSeconds - elapsedSecSinceLast)}s)`;
                break;
            case 'PROBABILITY':
                modeDescription = `Automatic Random Jackpot with ${probVal}% probability per round`;
                break;
            case 'MANUAL':
                modeDescription = 'Manual Mode: Only triggers when Admin explicitly sets or schedules a jackpot';
                break;
            case 'DISABLED':
                modeDescription = 'Jackpot system is disabled (Standard 1X only)';
                break;
            default:
                modeDescription = 'Standard Jackpot';
        }

        return {
            continuousJackpot: this.getJackpotControlState(),
            enabled: this.jackpotConfig.enabled,
            mode: this.jackpotConfig.mode,
            targetMultiplier: this.jackpotConfig.targetMultiplier,
            targetMultiplierLabel: this.jackpotConfig.targetMultiplier === 'RANDOM' ? 'Random (2X, 3X, 4X)' : `${this.jackpotConfig.targetMultiplier}X`,
            intervalRounds: this.jackpotConfig.intervalRounds,
            intervalSeconds: this.jackpotConfig.intervalSeconds,
            probability: this.jackpotConfig.probability,
            probabilityPercent: `${probVal}%`,
            probabilityValue: probVal,
            chancePercent: probVal,
            allowedMultipliers: this.jackpotConfig.allowedMultipliers,
            slots: ['1X', '2X', '3X', '4X'],
            modeDescription,
            stats: {
                totalRoundsCreated: this.roundCounter,
                lastJackpotRound: this.lastJackpotRound,
                roundsSinceLastJackpot: roundsSinceLast,
                lastJackpotTimestamp: new Date(this.lastJackpotTime).toISOString(),
                secondsSinceLastJackpot: elapsedSecSinceLast,
            },
        };
    }

    /**
     * Get current jackpot status, configuration, queues and scheduled jackpots
     */
    async getJackpotStatus() {
        const now = Date.now();
        const currentActive = this.currentRace ? {
            gameSerial: this.currentRace.game_serial,
            raceId: this.currentRace.id,
            isJackpot: (this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1) > 1,
            multiplier: Number(this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1),
            multiplierLabel: (this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1) > 1
                ? `${Number(this.currentRace.jackpot_multiplier || this.currentRace.jackpotMultiplier || 1)}X`
                : '1X',
            status: this.currentRace.status,
            slots: ['1X', '2X', '3X', '4X'],
        } : null;

        // Calculate Round Queue status for UI
        let roundQueue = {
            active: false,
            roundsLeft: 0,
            totalRounds: 0,
            targetGameSerial: null,
            multiplier: 1,
            multiplierLabel: '1X',
        };

        if (this.roundQueue && this.roundQueue.active) {
            const curStr = String(this.currentRace?.game_serial || '');
            const curSeq = parseInt(curStr.slice(8), 10) || 0;
            const targetSeq = parseInt(String(this.roundQueue.targetGameSerial).slice(8), 10) || 0;
            const roundsLeft = Math.max(0, targetSeq - curSeq);
            roundQueue = {
                active: roundsLeft > 0,
                roundsLeft,
                totalRounds: this.roundQueue.roundsTotal,
                targetGameSerial: this.roundQueue.targetGameSerial,
                multiplier: this.roundQueue.multiplier,
                multiplierLabel: this.roundQueue.multiplierLabel,
            };
        }

        // Calculate Time Queue status for UI
        let timeQueue = {
            active: false,
            secondsLeft: 0,
            targetTimestamp: null,
            targetTimeIso: null,
            multiplier: 1,
            multiplierLabel: '1X',
        };

        if (this.timeScheduledJackpots && this.timeScheduledJackpots.length > 0) {
            const nextTime = this.timeScheduledJackpots[0];
            const secondsLeft = Math.max(0, Math.round((nextTime.targetTimestamp - now) / 1000));
            timeQueue = {
                active: secondsLeft > 0,
                secondsLeft,
                targetTimestamp: nextTime.targetTimestamp,
                targetTimeIso: nextTime.targetTimeIso,
                multiplier: nextTime.multiplier,
                multiplierLabel: nextTime.label,
            };
        }

        let scheduled = [];
        try {
            scheduled = await RaceModel.getScheduledJackpots();
        } catch (err) { }

        return {
            activeRaceJackpot: currentActive,
            config: this.getJackpotConfigSummary(),
            roundQueue,
            timeQueue,
            scheduledJackpots: scheduled,
        };
    }
}

const raceEngine = new RaceEngine();
module.exports = { raceEngine, RaceEngine };
