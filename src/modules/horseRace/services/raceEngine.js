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
        this.setMaxListeners(50);
        this.isRunning = false;
        this.currentRace = null;
        this.currentHorses = [];
        this.activeTimer = null;
        this.isTransitioning = false;
        this.horseBetsMap = new Map(); // horseSerial -> { totalBetsAmount, totalBetsCount }
        this.totalPot = 0;
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

    recordBets(bets) {
        if (!bets) return;
        const betList = Array.isArray(bets) ? bets : [bets];
        for (const b of betList) {
            const serial = Number(b.horseSerial || b.horse_serial || b.serialNumber || b.serial_number);
            const amount = Number(b.amount) || 0;
            if (!serial || amount <= 0) continue;

            const cur = this.horseBetsMap.get(serial) || { totalBetsAmount: 0, totalBetsCount: 0 };
            cur.totalBetsAmount = Number((cur.totalBetsAmount + amount).toFixed(2));
            cur.totalBetsCount += 1;
            this.horseBetsMap.set(serial, cur);
            this.totalPot = Number((this.totalPot + amount).toFixed(2));
        }
    }

    removeBet(horseSerial, amount) {
        const serial = Number(horseSerial);
        const amt = Number(amount) || 0;
        if (!serial || amt <= 0) return;

        const cur = this.horseBetsMap.get(serial);
        if (cur) {
            cur.totalBetsAmount = Math.max(0, Number((cur.totalBetsAmount - amt).toFixed(2)));
            cur.totalBetsCount = Math.max(0, cur.totalBetsCount - 1);
            this.horseBetsMap.set(serial, cur);
            this.totalPot = Math.max(0, Number((this.totalPot - amt).toFixed(2)));
        }
    }

    getHorseBetsPool() {
        const pool = [];
        const default12 = this.getDefaultHorses();
        const baseHorses = (this.currentHorses && this.currentHorses.length > 0 ? this.currentHorses : default12);
        const mapBySerial = new Map();
        for (const h of baseHorses) {
            const s = Number(h.serial_number || h.serialNumber);
            if (s) mapBySerial.set(s, h);
        }
        const horses = default12.map((def, idx) => {
            const s = idx + 1;
            return mapBySerial.get(s) || def;
        });

        let totalCount = 0;
        const horsesMap = {};
        horses.forEach((h, index) => {
            const serial = Number(h.serial_number || h.serialNumber || index + 1);
            const id = Number(h.horse_id || h.id || index + 1);
            const betInfo = this.horseBetsMap.get(serial) || { totalBetsAmount: 0, totalBetsCount: 0 };
            totalCount += betInfo.totalBetsCount;
            const percentage = this.totalPot > 0 ? Number(((betInfo.totalBetsAmount / this.totalPot) * 100).toFixed(2)) : 0;
            const horseItem = {
                horseId: id,
                id,
                serialNumber: serial,
                serial_number: serial,
                horseSerial: serial,
                horse_serial: serial,
                horse: serial,
                horseNumber: serial,
                name: h.horse_name_snapshot || h.name || `Horse #${serial}`,
                horseName: h.horse_name_snapshot || h.name || `Horse #${serial}`,
                totalBetsAmount: betInfo.totalBetsAmount,
                totalAmount: betInfo.totalBetsAmount,
                totalBets: betInfo.totalBetsAmount,
                betAmount: betInfo.totalBetsAmount,
                amount: betInfo.totalBetsAmount,
                displayTotalBetsAmount: `₹${betInfo.totalBetsAmount.toFixed(2)}`,
                totalBetsCount: betInfo.totalBetsCount,
                betsCount: betInfo.totalBetsCount,
                totalBettorsCount: 0,
                percentage,
                imageUrl: h.imageUrl || h.image_url || null,
                odds: 10,
                oddsMultiplier: '10X',
            };
            pool.push(horseItem);
            horsesMap[serial] = horseItem;
        });
        return {
            raceId: this.currentRace?.id,
            gameSerial: String(this.currentRace?.game_serial || ''),
            allowedCoins: raceConfig.ALLOWED_COINS || [2, 5, 10, 100, 500, 1000],
            chips: raceConfig.ALLOWED_COINS || [2, 5, 10, 100, 500, 1000],
            totalPot: this.totalPot,
            totalBetsAmount: this.totalPot,
            displayTotalPot: `₹${this.totalPot.toFixed(2)}`,
            totalBetsCount: totalCount,
            horsesCount: 12,
            horses: pool,
            horsesMap,
            byHorse: horsesMap,
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

        let nextSequence = 1;

        try {
            const dbOrConn = connection || pool;
            const [rows] = await dbOrConn.execute(
                'SELECT game_serial FROM races WHERE game_serial LIKE ? ORDER BY LENGTH(game_serial) DESC, game_serial DESC, id DESC LIMIT 1 FOR UPDATE',
                [`${datePrefix}%`]
            );

            if (rows && rows.length > 0) {
                const lastSerial = String(rows[0].game_serial);
                const suffix = lastSerial.startsWith(datePrefix)
                    ? lastSerial.slice(datePrefix.length)
                    : (lastSerial.length > 8 ? lastSerial.slice(8) : lastSerial.replace(/^[^\d]+/, ''));
                const parsed = parseInt(suffix, 10);
                if (!isNaN(parsed) && parsed >= nextSequence) {
                    nextSequence = parsed + 1;
                }
            }
        } catch (err) {
            console.warn('[RaceEngine] ⚠️ Error querying last game_serial from DB:', err.message);
        }

        // Also ensure nextSequence is strictly greater than current active/memory race serial
        if (this.currentRace && this.currentRace.game_serial) {
            const curStr = String(this.currentRace.game_serial);
            if (curStr.startsWith(datePrefix)) {
                const curSuffix = curStr.slice(datePrefix.length);
                const curParsed = parseInt(curSuffix, 10);
                if (!isNaN(curParsed) && curParsed >= nextSequence) {
                    nextSequence = curParsed + 1;
                }
            }
        }

        if (this.roundCounter && this.roundCounter >= nextSequence) {
            nextSequence = this.roundCounter + 1;
        }

        this.roundCounter = nextSequence;
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
            console.warn('[RaceEngine] ⚠️ Database not ready or unavailable, starting in-memory race cycle:', error.message);
            await this.startInMemoryRaceCycle();
        }
    }

    clearAllTimers() {
        if (this.activeTimer) {
            clearTimeout(this.activeTimer);
            this.activeTimer = null;
        }
        if (this.bettingOpenTimers && this.bettingOpenTimers.length > 0) {
            this.bettingOpenTimers.forEach((t) => clearTimeout(t));
            this.bettingOpenTimers = [];
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
        let activeRace = null;
        try {
            activeRace = await RaceModel.findActiveRace();
        } catch (err) {
            console.warn('[RaceEngine] ⚠️ Error querying active race:', err.message);
            return this.startInMemoryRaceCycle();
        }

        if (activeRace) {
            // Check if this active race is stale / expired (e.g. from past day or > 5 minutes ago)
            const now = Date.now();
            const raceCreatedAt = activeRace.created_at ? new Date(activeRace.created_at).getTime() : 0;
            const isStale = raceCreatedAt > 0 && (now - raceCreatedAt) > 5 * 60 * 1000;

            if (isStale) {
                console.log(`[RaceEngine] ⚠️ Found stale active Race #${activeRace.game_serial} from ${new Date(raceCreatedAt).toISOString()}. Marking CANCELLED and creating next race...`);
                try {
                    await RaceModel.updateStatus(activeRace.id, RACE_STATUSES.CANCELLED, { finished_at: new Date() });
                } catch (_) { }
                return this.createNextRace();
            }

            console.log(`[RaceEngine] 🔄 Engine Recovery: Found active Race #${activeRace.game_serial} (status: '${activeRace.status}'). Resuming persisted state...`);
            this.currentRace = activeRace;
            if (activeRace.game_serial) {
                const curSeq = parseInt(String(activeRace.game_serial).slice(8), 10);
                if (!isNaN(curSeq) && curSeq > (this.roundCounter || 0)) {
                    this.roundCounter = curSeq;
                }
            }
            try {
                this.currentHorses = await RaceModel.getRaceHorses(activeRace.id);
            } catch (_) {
                this.currentHorses = [];
            }

            if (!this.currentHorses || this.currentHorses.length === 0) {
                try {
                    let activeHorses = await HorseModel.findAllActive();
                    if (activeHorses.length === 0) {
                        await this.seedDefaultHorses(pool);
                        activeHorses = await HorseModel.findAllActive();
                    }
                    if (activeHorses.length > 0) {
                        this.currentHorses = await RaceModel.addRaceHorses(activeRace.id, activeHorses.slice(0, raceConfig.HORSES_COUNT));
                    }
                } catch (_) { }
                if (!this.currentHorses || this.currentHorses.length === 0) {
                    this.currentHorses = this.getDefaultHorses();
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
                this.runBettingOpenSequence(remaining);
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

    getDefaultHorses() {
        return [
            { id: 1, horse_id: 1, serial_number: 1, name: 'Thunder Bolt', horse_name_snapshot: 'Thunder Bolt', starting_position: 1 },
            { id: 2, horse_id: 2, serial_number: 2, name: 'Storm Runner', horse_name_snapshot: 'Storm Runner', starting_position: 2 },
            { id: 3, horse_id: 3, serial_number: 3, name: 'Golden Arrow', horse_name_snapshot: 'Golden Arrow', starting_position: 3 },
            { id: 4, horse_id: 4, serial_number: 4, name: 'Shadow Blaze', horse_name_snapshot: 'Shadow Blaze', starting_position: 4 },
            { id: 5, horse_id: 5, serial_number: 5, name: 'Midnight Star', horse_name_snapshot: 'Midnight Star', starting_position: 5 },
            { id: 6, horse_id: 6, serial_number: 6, name: 'Royal Knight', horse_name_snapshot: 'Royal Knight', starting_position: 6 },
            { id: 7, horse_id: 7, serial_number: 7, name: 'Silver Bullet', horse_name_snapshot: 'Silver Bullet', starting_position: 7 },
            { id: 8, horse_id: 8, serial_number: 8, name: 'Fire Steed', horse_name_snapshot: 'Fire Steed', starting_position: 8 },
            { id: 9, horse_id: 9, serial_number: 9, name: 'Wild Pegasus', horse_name_snapshot: 'Wild Pegasus', starting_position: 9 },
            { id: 10, horse_id: 10, serial_number: 10, name: 'Iron Gallop', horse_name_snapshot: 'Iron Gallop', starting_position: 10 },
            { id: 11, horse_id: 11, serial_number: 11, name: 'Desert Comet', horse_name_snapshot: 'Desert Comet', starting_position: 11 },
            { id: 12, horse_id: 12, serial_number: 12, name: 'Victory Spirit', horse_name_snapshot: 'Victory Spirit', starting_position: 12 },
        ];
    }

    async seedDefaultHorses(dbOrConn) {
        const defaultHorses = [
            [1, 'Thunder Bolt', 'active'],
            [2, 'Storm Runner', 'active'],
            [3, 'Golden Arrow', 'active'],
            [4, 'Shadow Blaze', 'active'],
            [5, 'Midnight Star', 'active'],
            [6, 'Royal Knight', 'active'],
            [7, 'Silver Bullet', 'active'],
            [8, 'Fire Steed', 'active'],
            [9, 'Wild Pegasus', 'active'],
            [10, 'Iron Gallop', 'active'],
            [11, 'Desert Comet', 'active'],
            [12, 'Victory Spirit', 'active'],
        ];
        for (const h of defaultHorses) {
            try {
                await dbOrConn.execute(
                    'INSERT IGNORE INTO horses (serial_number, name, status) VALUES (?, ?, ?)',
                    h
                );
            } catch (_) { }
        }
    }

    async ensureSchema(connection) {
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS horses (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    serial_number INT UNSIGNED NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    image_url MEDIUMTEXT NULL,
                    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX idx_serial_number (serial_number),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS races (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    game_serial VARCHAR(30) NOT NULL UNIQUE,
                    status ENUM('WAITING', 'BETTING_OPEN', 'BETTING_CLOSED', 'COUNTDOWN', 'RUNNING', 'FINISHING', 'RESULT', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
                    betting_open_at DATETIME NULL,
                    betting_close_at DATETIME NULL,
                    countdown_at DATETIME NULL,
                    started_at DATETIME NULL,
                    finished_at DATETIME NULL,
                    result_at DATETIME NULL,
                    winner_horse_id BIGINT UNSIGNED NULL,
                    jackpot_multiplier DECIMAL(5, 2) NOT NULL DEFAULT '1.00',
                    is_jackpot TINYINT(1) NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX idx_game_serial (game_serial),
                    INDEX idx_race_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS race_horses (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    race_id BIGINT UNSIGNED NOT NULL,
                    horse_id BIGINT UNSIGNED NOT NULL,
                    serial_number INT UNSIGNED NOT NULL,
                    horse_name_snapshot VARCHAR(100) NOT NULL,
                    starting_position INT UNSIGNED NOT NULL DEFAULT 1,
                    finish_position INT UNSIGNED NULL,
                    finish_time DECIMAL(6, 3) NULL,
                    result VARCHAR(50) NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX idx_race_id (race_id),
                    INDEX idx_horse_id (horse_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS wallets (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
                    balance DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
                    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                    status ENUM('active', 'locked', 'suspended') NOT NULL DEFAULT 'active',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_user_id (user_id),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS wallet_transactions (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    wallet_id BIGINT UNSIGNED NOT NULL,
                    user_id BIGINT UNSIGNED NOT NULL,
                    type ENUM('credit', 'debit') NOT NULL,
                    category VARCHAR(50) NOT NULL DEFAULT 'manual',
                    amount DECIMAL(18, 4) NOT NULL,
                    balance_before DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
                    balance_after DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
                    reference_id VARCHAR(100) NULL,
                    reference_type VARCHAR(50) NULL,
                    description VARCHAR(255) NULL,
                    status ENUM('pending', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'completed',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user_created (user_id, created_at DESC),
                    INDEX idx_wallet_created (wallet_id, created_at DESC),
                    INDEX idx_reference (reference_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS games (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
                    game_code VARCHAR(32) NOT NULL UNIQUE,
                    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_user_id (user_id),
                    INDEX idx_game_code (game_code)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL,
                    token_hash CHAR(64) NOT NULL UNIQUE,
                    last_activity_at DATETIME NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user_session_user (user_id),
                    INDEX idx_user_session_expiry (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS scheduled_race_winners (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    game_serial VARCHAR(30) NOT NULL,
                    horse_id BIGINT UNSIGNED NULL,
                    horse_serial INT UNSIGNED NULL,
                    horse_name VARCHAR(100) NULL,
                    reason VARCHAR(255) NULL,
                    status ENUM('PENDING', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_game_serial (game_serial),
                    INDEX idx_game_serial (game_serial),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            try {
                await connection.execute(`ALTER TABLE scheduled_race_winners ADD COLUMN horse_name VARCHAR(100) NULL AFTER horse_serial;`);
            } catch (_) {}
            try {
                await connection.execute(`ALTER TABLE scheduled_race_winners ADD UNIQUE KEY uq_game_serial (game_serial);`);
            } catch (_) {}
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS scheduled_jackpots (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    game_serial VARCHAR(30) NOT NULL,
                    multiplier DECIMAL(5, 2) NOT NULL DEFAULT '1.00',
                    reason VARCHAR(255) NULL,
                    status ENUM('PENDING', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_game_serial (game_serial),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        } catch (_) { }
    }

    async startInMemoryRaceCycle() {
        this.isRunning = true;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;

        let nextSeq = (this.roundCounter || 0) + 1;
        if (this.currentRace && this.currentRace.game_serial) {
            const curStr = String(this.currentRace.game_serial);
            if (curStr.startsWith(datePrefix)) {
                const curParsed = parseInt(curStr.slice(datePrefix.length), 10);
                if (!isNaN(curParsed) && curParsed >= nextSeq) {
                    nextSeq = curParsed + 1;
                }
            }
        }
        this.roundCounter = nextSeq;
        const seq = String(this.roundCounter).padStart(3, '0');
        const gameSerial = `${datePrefix}${seq}`;

        const bettingCloseAt = new Date(now.getTime() + raceConfig.BETTING_OPEN_MS);
        const countdownAt = new Date(bettingCloseAt.getTime() + raceConfig.BETTING_CLOSED_MS);
        const horses = this.getDefaultHorses();

        this.forcedCurrentWinner = null;
        this.predeterminedWinner = null;
        this.forcedCurrentJackpot = null;
        this.horseBetsMap.clear();
        this.totalPot = 0;

        let jackpotMultiplier = 1;
        let isJackpot = false;
        try {
            const ev = await this.evaluateRaceJackpot(gameSerial);
            jackpotMultiplier = ev.multiplier || 1;
            isJackpot = Boolean(ev.isJackpot);
        } catch (_) { }

        this.currentRace = {
            id: this.roundCounter,
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

        this.currentHorses = horses;

        console.log(`[RaceEngine] 🏁 New Global Race #${gameSerial} created (In-Memory/Active). [BETTING OPEN] (${raceConfig.BETTING_OPEN_MS / 1000}s window) [Jackpot: ${jackpotMultiplier}X]`);

        this.emit('race:created', this.getCurrentState());
        this.emit('race:betting_open', this.getCurrentState());

        this.runBettingOpenSequence(raceConfig.BETTING_OPEN_MS);
    }

    /**
     * Create the next global race and attach 12 horses
     */
    async createNextRace() {
        if (!this.isRunning) return;

        let connection;
        try {
            connection = await pool.getConnection();
        } catch (connErr) {
            console.warn('[RaceEngine] ⚠️ DB connection unavailable, running in-memory race cycle:', connErr.message);
            return this.startInMemoryRaceCycle();
        }

        try {
            // Auto-ensure schema tables exist outside transaction
            await this.ensureSchema(connection);

            await connection.beginTransaction();

            const gameSerial = await this.generateGameSerial(connection);
            const now = new Date();
            const bettingCloseAt = new Date(now.getTime() + raceConfig.BETTING_OPEN_MS);
            const countdownAt = new Date(bettingCloseAt.getTime() + raceConfig.BETTING_CLOSED_MS);

            // Fetch active horses from master table
            let activeHorses = await HorseModel.findAllActive(connection);
            if (!activeHorses || activeHorses.length === 0) {
                console.log('[RaceEngine] 🐎 No horses found in database. Auto-seeding 12 default horses...');
                await this.seedDefaultHorses(connection);
                activeHorses = await HorseModel.findAllActive(connection);
            }

            const selectedHorses = (activeHorses && activeHorses.length > 0 ? activeHorses : this.getDefaultHorses()).slice(0, raceConfig.HORSES_COUNT);

            this.forcedCurrentWinner = null;
            this.predeterminedWinner = null;
            this.forcedCurrentJackpot = null;

            // 3. Evaluate Jackpot Multiplier (Scheduled Override vs Flexible Modes: EVERY_ROUND, ROUND_INTERVAL, TIME_INTERVAL, PROBABILITY)
            let jackpotMultiplier = 1;
            let isJackpot = false;
            try {
                const jEval = await this.evaluateRaceJackpot(gameSerial);
                jackpotMultiplier = jEval.multiplier || 1;
                isJackpot = Boolean(jEval.isJackpot);
            } catch (_) { }

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
                const horseId = Number(h.horse_id || h.id || index + 1);
                const serial = Number(h.serial_number || h.serialNumber || index + 1);
                const name = h.horse_name_snapshot || h.name || `Horse #${serial}`;
                horseValues.push(raceId, horseId, serial, name, index + 1);
                return '(?, ?, ?, ?, ?)';
            }).join(', ');

            await connection.execute(
                `INSERT INTO race_horses (race_id, horse_id, serial_number, horse_name_snapshot, starting_position)
                 VALUES ${horsePlaceholders}`,
                horseValues
            );

            await connection.commit();

            const curSeq = parseInt(String(gameSerial).slice(8), 10);
            if (!isNaN(curSeq) && curSeq > (this.roundCounter || 0)) {
                this.roundCounter = curSeq;
            }

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

            try {
                this.currentHorses = await RaceModel.getRaceHorses(raceId);
            } catch (_) {
                this.currentHorses = selectedHorses;
            }

            // Check for pre-scheduled forced winner for this gameSerial
            this.forcedCurrentWinner = null;
            this.predeterminedWinner = null;
            this.extraRunningMs = 0;
            this.horseBetsMap.clear();
            this.totalPot = 0;

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

            this.runBettingOpenSequence(raceConfig.BETTING_OPEN_MS);

        } catch (error) {
            if (connection) {
                try { await connection.rollback(); } catch (_) { }
            }
            console.error('[RaceEngine] ❌ Failed to create next race via DB, falling back to in-memory cycle:', error.message);
            return this.startInMemoryRaceCycle();
        } finally {
            if (connection) {
                try { connection.release(); } catch (_) { }
            }
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
                try {
                    const updated = await RaceModel.updateStatus(this.currentRace.id, nextStatus, updateFields);
                    if (updated) {
                        this.currentRace = {
                            ...this.currentRace,
                            ...updated,
                            status: nextStatus,
                            ...updateFields,
                        };
                    } else {
                        this.currentRace = {
                            ...this.currentRace,
                            status: nextStatus,
                            ...updateFields,
                        };
                    }
                } catch (_) {
                    this.currentRace = {
                        ...this.currentRace,
                        status: nextStatus,
                        ...updateFields,
                    };
                }
            }

            console.log(`[RaceEngine] 🔄 Race #${this.currentRace?.game_serial || 'ACTIVE'} ➔ [${nextStatus}]`);
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
            let horses = [];
            try {
                horses = await RaceModel.getRaceHorses(raceId);
            } catch (_) { }
            if (!horses || horses.length === 0) {
                horses = this.currentHorses && this.currentHorses.length > 0 ? this.currentHorses : this.getDefaultHorses();
            }
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
     * Runs second-by-second Betting Open ticks so clients receive live timer heartbeat:
     * 35s -> 34s -> ... -> 1s -> Transition to BETTING_CLOSED
     */
    runBettingOpenSequence(durationMs = raceConfig.BETTING_OPEN_MS) {
        this.clearAllTimers();
        this.bettingOpenTimers = [];

        const totalSec = Math.max(1, Math.round(durationMs / 1000));

        for (let i = 0; i < totalSec; i++) {
            const secRemaining = totalSec - i;
            const delay = i * 1000;

            const timer = setTimeout(() => {
                if (this.currentRace && (this.currentRace.status === RACE_STATUSES.BETTING_OPEN || this.currentRace.status === RACE_STATUSES.WAITING)) {
                    const state = this.getCurrentState();
                    state.timeRemainingSec = secRemaining;
                    const tickPayload = {
                        raceId: this.currentRace.id,
                        gameSerial: this.currentRace.game_serial,
                        stage: 'BETTING_OPEN',
                        secondsRemaining: secRemaining,
                        timeRemainingSec: secRemaining,
                        message: `Betting Open. Time remaining: ${secRemaining}s`,
                    };
                    this.emit('race:betting_open_tick', tickPayload);
                    this.emit('race:tick', tickPayload);
                }
            }, delay);
            this.bettingOpenTimers.push(timer);
        }

        this.scheduleTransition(RACE_STATUSES.BETTING_CLOSED, durationMs);
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
        let horses = [];
        try {
            horses = await RaceModel.getRaceHorses(raceId);
        } catch (_) { }
        if (!horses || horses.length === 0) {
            horses = this.currentHorses && this.currentHorses.length > 0 ? this.currentHorses : this.getDefaultHorses();
        }
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

        // The live control override takes highest authority
        forcedWinner = this.forcedCurrentWinner || forcedWinner;

        let winnerHorse = null;

        if (forcedWinner) {
            const fSerial = Number(forcedWinner.horseSerial || forcedWinner.serial_number || forcedWinner.serialNumber);
            const fId = Number(forcedWinner.horseId || forcedWinner.horse_id || forcedWinner.id);

            winnerHorse = horses.find(
                (h) => (fSerial && Number(h.serial_number || h.serialNumber) === fSerial) ||
                       (fId && Number(h.horse_id || h.id) === fId)
            ) || {
                horse_id: fId || fSerial || 1,
                serial_number: fSerial || 1,
                horse_name_snapshot: forcedWinner.horseName || `Horse #${fSerial || 1}`,
            };

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
                (predSerial && Number(h.serial_number || h.serialNumber) === Number(predSerial)) ||
                (predId && Number(h.horse_id || h.id) === Number(predId))
            ) || this.predeterminedWinner;
        }

        if (!winnerHorse) {
            winnerHorse = await this.calculateSmartWinner(horses, this.currentRace.id);
            this.predeterminedWinner = winnerHorse;
        }

        if (!this.currentRace || Number(this.currentRace.id) !== Number(raceId)) return;

        // 3. Realistic Rankings Generation: Winner is #1, other 11 horses ranked strictly behind
        const winnerSerial = Number(winnerHorse.serial_number || winnerHorse.serialNumber);
        const winnerId = Number(winnerHorse.horse_id || winnerHorse.id);
        const otherHorses = horses.filter((h) => {
            const hSerial = Number(h.serial_number || h.serialNumber);
            const hId = Number(h.horse_id || h.id);
            if (winnerSerial && hSerial === winnerSerial) return false;
            if (winnerId && hId === winnerId) return false;
            return true;
        });
        const shuffledOthers = [...otherHorses].sort(() => Math.random() - 0.5);

        const orderedHorses = [winnerHorse, ...shuffledOthers];
        const baseTime = ((raceConfig.RUNNING_MS + this.extraRunningMs) / 1000); // ~20s + extra

        const horseResults = orderedHorses.map((horse, index) => {
            const finishPosition = index + 1;
            const variance = Number((index * 0.15 + (Math.random() * 0.08)).toFixed(3));
            const finishTime = Number((baseTime + variance).toFixed(3));
            const result = finishPosition === 1 ? 'WINNER' : finishPosition <= 3 ? 'PLACED' : 'COMPLETED';
            const horseId = Number(horse.horse_id || horse.id || index + 1);
            const serialNumber = Number(horse.serial_number || horse.serialNumber || index + 1);
            const horseName = horse.horse_name_snapshot || horse.name || `Horse #${serialNumber}`;

            return {
                horse_id: horseId,
                serial_number: serialNumber,
                horse_name_snapshot: horseName,
                finish_position: finishPosition,
                finish_time: finishTime,
                result,
            };
        });

        const winner = horseResults[0];
        const winnerHorseId = Number(winner.horse_id || winner.id || 1);

        try {
            const resultData = await RaceModel.completeRace(this.currentRace.id, winnerHorseId, horseResults);
            if (resultData && resultData.race) {
                this.currentRace = resultData.race;
                this.currentHorses = resultData.horses || horseResults;
            } else {
                throw new Error('completeRace returned no data');
            }
        } catch (_) {
            this.currentRace = {
                ...this.currentRace,
                status: RACE_STATUSES.RESULT,
                winner_horse_id: winnerHorseId,
                result_at: new Date(),
            };
            this.currentHorses = horseResults;
        }

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
    /**
     * Smart Risk & House Edge Winner Calculation Engine
     * Implements 4 strict business rules based on live betting records:
     * 
     * CONDITION 1: Agar kisi bhi horse pe bet nahi laga (total bets = 0)
     *   -> 12 horses me se koi ek random horse jitega.
     * 
     * CONDITION 2: Agar kuch horses pe bet lage hain (e.g. 7, 8, 9) aur baki pe ₹0
     *   -> Jinpe bet lage hain unko 100% KABHI NAHI jitana.
     *   -> Jispe ₹0 bet hai unme se random jitega (House Payout = ₹0).
     * 
     * CONDITION 3: Agar sabhi 12 horses pe bet lage hain
     *   -> Sabse kam (minimum) amount wala horse jitega (Minimum House Payout).
     * 
     * CONDITION 4: Agar sabhi horses pe barabar bets hain ya multiple horses par tied lowest amount hai
     *   -> Tied/equal minimum amount wale horses me se random horse jitega.
     */
    async calculateSmartWinner(horses, raceId) {
        if (!horses || horses.length === 0) return null;

        try {
            const betsMap = new Map();
            let totalPot = 0;

            // 1. Fetch live pending bets from DB
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

                if (potRows && potRows.length > 0) {
                    potRows.forEach((r) => {
                        const hId = Number(r.horse_id);
                        const hSerial = Number(r.horse_serial);
                        const bets = Number(r.totalBets) || 0;
                        if (hId) betsMap.set(hId, bets);
                        if (hSerial) betsMap.set(hSerial, bets);
                        if (hSerial) betsMap.set(`s_${hSerial}`, bets);
                        totalPot += bets;
                    });
                }
            } catch (dbErr) {
                console.warn('[RaceEngine] ⚠️ Warning fetching bets from DB in calculateSmartWinner:', dbErr.message);
            }

            // 2. Merge with in-memory bets tracking (this.horseBetsMap) to ensure no bets are missed
            if (this.horseBetsMap && this.horseBetsMap.size > 0) {
                for (const [serial, data] of this.horseBetsMap.entries()) {
                    const s = Number(serial);
                    const amt = Number(data?.totalBetsAmount) || 0;
                    if (s && amt > 0) {
                        const existing = betsMap.get(s) || betsMap.get(`s_${s}`) || 0;
                        if (amt > existing) {
                            betsMap.set(s, amt);
                            betsMap.set(`s_${s}`, amt);
                            totalPot = Math.max(totalPot, this.totalPot || 0, amt);
                        }
                    }
                }
            }

            // 3. Map all 12 horses with their respective live bet amounts
            const enrichedHorses = horses.map((h, index) => {
                const hId = Number(h.horse_id || h.id || index + 1);
                const hSerial = Number(h.serial_number || h.serialNumber || index + 1);
                const bets = betsMap.get(hId) ?? betsMap.get(hSerial) ?? betsMap.get(`s_${hSerial}`) ?? (Number(this.horseBetsMap?.get(hSerial)?.totalBetsAmount) || 0);
                return {
                    ...h,
                    horse_id: hId,
                    serial_number: hSerial,
                    horse_name_snapshot: h.horse_name_snapshot || h.name || `Horse #${hSerial}`,
                    totalBets: Number(bets) || 0,
                    hasBets: Number(bets) > 0,
                };
            });

            const zeroBetHorses = enrichedHorses.filter((h) => h.totalBets === 0);
            const bettedHorses = enrichedHorses.filter((h) => h.totalBets > 0);

            // ----------------------------------------------------------------------
            // CONDITION 1 (RULE 1): Agar kisi bhi horse pe bet nahi laga (total bets = 0)
            // -> 12 horses me se koi ek random horse jitega
            // ----------------------------------------------------------------------
            if (bettedHorses.length === 0 || totalPot === 0) {
                const randomWinner = horses[Math.floor(Math.random() * horses.length)];
                console.log(`[RaceEngine] 🏆 CONDITION 1 APPLIED: No bets placed on any horse (Pot: ₹0). Random winner: Horse #${randomWinner.serial_number || randomWinner.serialNumber} (${randomWinner.horse_name_snapshot || randomWinner.name})`);
                return randomWinner;
            }

            // ----------------------------------------------------------------------
            // CONDITION 2 (RULE 2): Agar kuch horses pe bet lage hain (e.g. 7, 8, 9) aur baki pe ₹0
            // -> Jinpe bet lage hain unko 100% KABHI NAHI jitana!
            // -> Jispe ₹0 bet hai unme se random jitega (Platform Payout: ₹0, 100% Profit)
            // ----------------------------------------------------------------------
            if (zeroBetHorses.length > 0) {
                const chosenZeroHorse = zeroBetHorses[Math.floor(Math.random() * zeroBetHorses.length)];
                const winnerHorse = horses.find((h) =>
                    (chosenZeroHorse.serial_number && Number(h.serial_number || h.serialNumber) === Number(chosenZeroHorse.serial_number)) ||
                    (chosenZeroHorse.horse_id && Number(h.horse_id || h.id) === Number(chosenZeroHorse.horse_id))
                ) || chosenZeroHorse;

                console.log(`[RaceEngine] 🏆 CONDITION 2 APPLIED: Bets placed on ${bettedHorses.length} horses (Pot: ₹${totalPot}). Picked unbetted horse: Horse #${winnerHorse.serial_number || winnerHorse.serialNumber} (${winnerHorse.horse_name_snapshot || winnerHorse.name}) [₹0 Bet, House Payout: ₹0]`);
                return winnerHorse;
            }

            // ----------------------------------------------------------------------
            // CONDITION 3 & 4 (RULE 3 & 4): Agar sabhi 12 horses pe bet lage hain
            // -> Condition 3: Sabse kam (minimum) amount wala horse jitega
            // -> Condition 4: Agar multiple horses par tied/equal lowest amount hai to unme se random jitega
            // ----------------------------------------------------------------------
            const minAmount = Math.min(...enrichedHorses.map((h) => h.totalBets));
            const lowestBetHorses = enrichedHorses.filter((h) => h.totalBets === minAmount);

            const chosenLowestHorse = lowestBetHorses[Math.floor(Math.random() * lowestBetHorses.length)];
            const winnerHorse = horses.find((h) =>
                (chosenLowestHorse.serial_number && Number(h.serial_number || h.serialNumber) === Number(chosenLowestHorse.serial_number)) ||
                (chosenLowestHorse.horse_id && Number(h.horse_id || h.id) === Number(chosenLowestHorse.horse_id))
            ) || chosenLowestHorse;

            if (lowestBetHorses.length === 1) {
                console.log(`[RaceEngine] 🏆 CONDITION 3 APPLIED: All horses have bets. Winner with LEAST bet amount (₹${minAmount}): Horse #${winnerHorse.serial_number || winnerHorse.serialNumber} (${winnerHorse.horse_name_snapshot || winnerHorse.name})`);
            } else {
                console.log(`[RaceEngine] 🏆 CONDITION 4 APPLIED: Tied/Equal minimum bets (₹${minAmount}) across ${lowestBetHorses.length} horses. Randomly picked: Horse #${winnerHorse.serial_number || winnerHorse.serialNumber} (${winnerHorse.horse_name_snapshot || winnerHorse.name})`);
            }

            return winnerHorse;
        } catch (error) {
            console.error('[RaceEngine] Error in calculateSmartWinner, evaluating fallback:', error.message);
            // In-memory fallback: Ensure the conditions still hold even on unhandled errors
            try {
                const enriched = horses.map((h, index) => {
                    const hSerial = Number(h.serial_number || h.serialNumber || index + 1);
                    const inMem = this.horseBetsMap?.get(hSerial);
                    const bets = Number(inMem?.totalBetsAmount) || 0;
                    return {
                        ...h,
                        serial_number: hSerial,
                        horse_id: Number(h.horse_id || h.id || hSerial),
                        totalBets: bets,
                    };
                });
                const zeroBets = enriched.filter((h) => h.totalBets === 0);
                const betted = enriched.filter((h) => h.totalBets > 0);
                if (betted.length > 0 && zeroBets.length > 0) {
                    const picked = zeroBets[Math.floor(Math.random() * zeroBets.length)];
                    return horses.find((h) => Number(h.serial_number || h.serialNumber || h.horse_id || h.id) === picked.serial_number) || picked;
                }
                if (betted.length > 0 && zeroBets.length === 0) {
                    const minAmount = Math.min(...enriched.map((h) => h.totalBets));
                    const lowest = enriched.filter((h) => h.totalBets === minAmount);
                    const picked = lowest[Math.floor(Math.random() * lowest.length)];
                    return horses.find((h) => Number(h.serial_number || h.serialNumber || h.horse_id || h.id) === picked.serial_number) || picked;
                }
            } catch (_) {}
            return horses[Math.floor(Math.random() * horses.length)];
        }
    }

    /**
     * Admin Force Winner: Sets forced winner for active or future race
     */
    async setForcedWinner(params = {}) {
        let payload = params;
        if (typeof params === 'number' || typeof params === 'string') {
            payload = { horseSerial: Number(params) };
        }

        const rawSerial = payload.horseSerial ?? payload.horse_serial ?? payload.serialNumber ?? payload.serial_number ?? payload.horse ?? payload.horseNumber ?? payload.winner ?? (typeof payload.selectedHorse === 'object' ? (payload.selectedHorse?.serialNumber ?? payload.selectedHorse?.serial_number) : payload.selectedHorse);
        const serialNum = (rawSerial !== undefined && rawSerial !== null && !isNaN(Number(rawSerial))) ? Number(rawSerial) : null;

        const rawId = payload.horseId ?? payload.horse_id ?? payload.id ?? (typeof payload.selectedHorse === 'object' ? (payload.selectedHorse?.id ?? payload.selectedHorse?.horseId) : undefined);
        const horseId = (rawId !== undefined && rawId !== null && !isNaN(Number(rawId))) ? Number(rawId) : null;

        const rawGameSerial = payload.gameSerial || payload.game_serial || payload.gameId || payload.game_id;
        const targetSerial = rawGameSerial ? String(rawGameSerial) : (this.currentRace?.game_serial ? String(this.currentRace.game_serial) : null);
        const horseName = payload.horseName || payload.horse_name || payload.name || null;
        const reason = payload.reason || 'Admin Live Override';

        if (!horseId && (!Number.isInteger(serialNum) || serialNum <= 0)) {
            return { success: false, message: 'Please provide a valid horseSerial (1-12) or horseId.', locked: false };
        }

        let targetHorse = null;
        if (this.currentHorses && this.currentHorses.length > 0) {
            targetHorse = this.currentHorses.find(
                (h) => (serialNum && Number(h.serial_number || h.serialNumber) === serialNum) ||
                       (horseId && Number(h.horse_id || h.id) === horseId)
            );
        }

        if (!targetHorse && horseId) {
            try {
                const dbHorse = await HorseModel.findById(horseId);
                if (dbHorse) {
                    targetHorse = {
                        horse_id: dbHorse.id,
                        serial_number: dbHorse.serial_number,
                        horse_name_snapshot: dbHorse.name,
                    };
                }
            } catch (_) { }
        }

        if (!targetHorse && serialNum) {
            try {
                const serialHorse = await HorseModel.findBySerialNumber(serialNum);
                if (serialHorse) {
                    targetHorse = {
                        horse_id: serialHorse.id,
                        serial_number: serialHorse.serial_number,
                        horse_name_snapshot: serialHorse.name,
                    };
                }
            } catch (_) { }
        }

        // Guaranteed fallback from default horses table
        if (!targetHorse) {
            const defaults = this.getDefaultHorses();
            targetHorse = defaults.find(
                (h) => (serialNum && Number(h.serial_number || h.serialNumber) === serialNum) ||
                       (horseId && Number(h.horse_id || h.id) === horseId)
            ) || defaults[0];
        }

        const isCurrentActive = this.currentRace && (!targetSerial || String(this.currentRace.game_serial) === String(targetSerial));

        if (this.currentRace) {
            if ([RACE_STATUSES.FINISHING, RACE_STATUSES.RESULT, RACE_STATUSES.FINISHED].includes(this.currentRace.status)) {
                return {
                    success: false,
                    message: `Cannot change forced winner while race is in ${this.currentRace.status} state. Race has already finished.`,
                    locked: true,
                };
            }
        }

        const winnerRecord = {
            gameSerial: targetSerial ? String(targetSerial) : String(this.currentRace?.game_serial || 'ACTIVE'),
            horseId: targetHorse ? (targetHorse.horse_id || targetHorse.id) : (horseId || serialNum || 1),
            horseSerial: targetHorse ? (targetHorse.serial_number || targetHorse.serialNumber) : (serialNum || 1),
            horseName: targetHorse ? (targetHorse.horse_name_snapshot || targetHorse.name) : (horseName || `Horse #${serialNum || 1}`),
            reason,
            setAt: new Date().toISOString(),
        };

        this.forcedCurrentWinner = winnerRecord;
        this.predeterminedWinner = targetHorse;

        if (this.currentRace) {
            this.currentRace.winner_horse_id = winnerRecord.horseId;
            this.currentHorses = this.currentHorses.map((h) => ({ ...h }));
        }

        console.log(`[RaceEngine] 🎮 Admin set LIVE forced winner for active Race #${targetSerial || this.currentRace?.game_serial}: Horse #${winnerRecord.horseSerial} (${winnerRecord.horseName})`);

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
                if (dbErr.message && dbErr.message.includes('horse_name')) {
                    try {
                        await pool.query(`ALTER TABLE scheduled_race_winners ADD COLUMN horse_name VARCHAR(100) NULL AFTER horse_serial;`);
                        try { await pool.query(`ALTER TABLE scheduled_race_winners ADD UNIQUE KEY uq_game_serial (game_serial);`); } catch (_) {}
                        await pool.query(
                            `INSERT INTO scheduled_race_winners (game_serial, horse_id, horse_serial, horse_name, reason, status)
                             VALUES (?, ?, ?, ?, ?, 'PENDING')
                             ON DUPLICATE KEY UPDATE horse_id = VALUES(horse_id), horse_serial = VALUES(horse_serial), horse_name = VALUES(horse_name), reason = VALUES(reason), status = 'PENDING'`,
                            [targetSerial, winnerRecord.horseId, winnerRecord.horseSerial, winnerRecord.horseName, reason]
                        );
                    } catch (retryErr) {
                        console.warn('[RaceEngine] Error saving scheduled winner in DB:', retryErr.message);
                    }
                } else {
                    console.warn('[RaceEngine] Error saving scheduled winner in DB:', dbErr.message);
                }
            }
        }

        try {
            const { socketService } = require('./socket.service');
            if (socketService) {
                socketService.syncForcedWinner(winnerRecord);
                if (socketService.io) {
                    const eventPayload = {
                        gameSerial: String(targetSerial || this.currentRace?.game_serial || ''),
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
            }
        } catch (sErr) { }

        return {
            success: true,
            message: isCurrentActive
                ? `Active Race #${targetSerial || this.currentRace?.game_serial} winner successfully set to Horse #${winnerRecord.horseSerial} (${winnerRecord.horseName})`
                : `Future Race #${targetSerial} winner successfully scheduled to Horse #${winnerRecord.horseSerial} (${winnerRecord.horseName})`,
            gameSerial: targetSerial || this.currentRace?.game_serial,
            isLive: isCurrentActive,
            forcedWinner: winnerRecord,
            winner: winnerRecord,
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
            countdownDisplay = 3;
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

        const horseBetsPool = this.getHorseBetsPool();
        const betsBySerial = new Map(horseBetsPool.horses.map((b) => [b.serialNumber, b]));

        return {
            active: true,
            id: Number(this.currentRace.id),
            gameSerial: String(this.currentRace.game_serial),
            game_serial: String(this.currentRace.game_serial),
            games_no: String(this.currentRace.game_serial),
            game_sr_num: String(this.currentRace.game_serial),
            game_sr: String(this.currentRace.game_serial),
            serialNumber: String(this.currentRace.game_serial),
            serial_number: String(this.currentRace.game_serial),
            period: String(this.currentRace.game_serial),
            period_num: String(this.currentRace.game_serial),
            status: this.currentRace.status,
            stageDescription,
            bettingAllowed: RaceStateMachine.isBettingAllowed(this.currentRace.status),
            timeRemainingSec,
            elapsedSec,
            countdownDisplay,
            totalPot: this.totalPot,
            totalBetsAmount: this.totalPot,
            displayTotalPot: `₹${this.totalPot.toFixed(2)}`,
            totalBetsCount: horseBetsPool.totalBetsCount || 0,
            pool: horseBetsPool,
            betPool: horseBetsPool,
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
            horses: this.currentHorses.map((h, index) => {
                const serial = Number(h.serial_number || h.serialNumber || index + 1);
                const betInfo = betsBySerial.get(serial) || { totalBetsAmount: 0, totalBetsCount: 0 };
                return {
                    id: h.horse_id || h.id,
                    horseId: h.horse_id || h.id,
                    serialNumber: serial,
                    serial_number: serial,
                    horseSerial: serial,
                    horse_serial: serial,
                    name: h.horse_name_snapshot || h.name,
                    horseName: h.horse_name_snapshot || h.name,
                    imageUrl: h.image_url || null,
                    startingPosition: h.starting_position,
                    finishPosition: h.finish_position,
                    finishTime: h.finish_time,
                    result: h.result,
                    totalBetsAmount: betInfo.totalBetsAmount,
                    totalAmount: betInfo.totalBetsAmount,
                    totalBets: betInfo.totalBetsAmount,
                    betAmount: betInfo.totalBetsAmount,
                    amount: betInfo.totalBetsAmount,
                    displayTotalBetsAmount: `₹${betInfo.totalBetsAmount.toFixed(2)}`,
                    totalBetsCount: betInfo.totalBetsCount,
                    betsCount: betInfo.totalBetsCount,
                };
            }),
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

                socketService.emitToAdmin('admin:jackpot_updated', payload);
                if (isCurrentActive) {
                    socketService.emitToRaces('race:jackpot', payload);
                    socketService.emitToRaces('jackpot:update', payload);
                    socketService.emitToRaces('race:state_change', this.getCurrentState());
                    socketService.emitToRaces('race:state_changed', this.getCurrentState());
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
            socketService.emitToAdmin('admin:jackpot_updated', payload);
            socketService.emitToRaces('race:jackpot', payload);
            socketService.emitToRaces('jackpot:update', payload);
            socketService.emitToRaces('race:state_changed', this.getCurrentState());
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
                socketService.emitToAdmin('admin:jackpot_updated', payload);
                socketService.emitToRaces('race:jackpot', payload);
                socketService.emitToRaces('jackpot:update', payload);
                socketService.emitToRaces('race:state_change', this.getCurrentState());
                socketService.emitToRaces('race:state_changed', this.getCurrentState());
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
