"use strict";

const crypto = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");
const { getPlinkoSocket, generateSimulatedBet } = require("./plinko.socket");

function validateBet({ userid, game_id, amount, type }, minimumAmount) {
  const userId = Number(userid);
  const gameId = Number(game_id);
  const betAmount = Number(amount);
  if (!Number.isInteger(userId) || userId < 1) {
    throw new AppError(400, "VALIDATION_ERROR", "The userid field is required.");
  }
  if (!Number.isInteger(gameId) || gameId < 1) {
    throw new AppError(400, "VALIDATION_ERROR", "The game_id field is required.");
  }
  if (!Number.isFinite(betAmount) || betAmount < minimumAmount) {
    throw new AppError(
      400,
      "INVALID_AMOUNT",
      `Bet placed minimum ${minimumAmount} rupees`,
    );
  }
  if (type === undefined || type === null || String(type).trim() === "") {
    throw new AppError(400, "VALIDATION_ERROR", "The type field is required.");
  }
  return { userId, gameId, betAmount, type };
}

function makeOrderId(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}${crypto.randomInt(11111, 100000)}`;
}

// 9 slots base multipliers requested: 1.70x, 1.40x, 1.20x, 1.20x, 1.00x, 1.20x, 1.20x, 1.40x, 1.70x
const DEFAULT_SLOT_MULTS = [1.7, 1.4, 1.2, 1.2, 1.0, 1.2, 1.2, 1.4, 1.7];
const DEFAULT_CHIPS = [5, 10, 20, 50, 100, 200, 500, 1000];
const DEFAULT_TIER_BALLS = { 0: 25, 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
const DEFAULT_SLOT_LEVELS = [1, 1, 1, 1, 1, 1, 1, 1, 1];
const DEFAULT_UNIFY = { ballValue: 0, cooldown: 0, autoSpeed: 0, ballCount: 0, ballWeight: 0, ballXp: 0 };
const DEFAULT_STATS = { drops: 0, totalEarned: 0, bestWin: 0, cashouts: 0, totalSpEarned: 0 };

function safeJsonParse(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return fallback;
  }
}

// Slot probability weights when not OUT (slot 0..8)
const SLOT_WEIGHTS = [8, 12, 16, 18, 20, 18, 16, 12, 8];

class PlinkoService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  // ---------------------------------------------------------------------------
  // Settings & Outcome Control Helpers
  // ---------------------------------------------------------------------------

  async getActiveSettings(connectionOrPool) {
    const conn = connectionOrPool || this.poolProvider();
    try {
      const [rows] = await conn.execute(
        "SELECT * FROM plinko_settings WHERE id = 1 LIMIT 1",
      );
      if (rows && rows[0]) {
        const r = rows[0];
        return {
          id: r.id,
          slot_multipliers: safeJsonParse(r.slot_multipliers, [...DEFAULT_SLOT_MULTS]),
          chips: safeJsonParse(r.chips, [...DEFAULT_CHIPS]),
          out_rate_percent: Number(r.out_rate_percent ?? 35.0),
          control_mode: r.control_mode || "auto",
          forced_target: r.forced_target ?? null,
          forced_rounds_left: Number(r.forced_rounds_left || 0),
          min_bet: Number(r.min_bet || 5.0),
          max_bet: Number(r.max_bet || 10000.0),
          is_active: Boolean(r.is_active ?? 1),
        };
      }
    } catch (_) {}

    return {
      id: 1,
      slot_multipliers: [...DEFAULT_SLOT_MULTS],
      chips: [...DEFAULT_CHIPS],
      out_rate_percent: 35.0,
      control_mode: "auto",
      forced_target: null,
      forced_rounds_left: 0,
      min_bet: 5.0,
      max_bet: 10000.0,
      is_active: true,
    };
  }

  determineOutcome(settings, betAmount, tier = 0) {
    const mults = Array.isArray(settings.slot_multipliers) && settings.slot_multipliers.length === 9
      ? settings.slot_multipliers
      : [...DEFAULT_SLOT_MULTS];

    // 1. FORCED / CEILING / RANGE MODE:
    // Admin sets max multiplier or slot cap (e.g. "2x", "1.40x", "out", "#4"):
    // - Outcome will NEVER exceed this multiplier (slotMult <= targetMultVal).
    // - Ball can either go OUT (based on out_rate_percent), or land on ANY slot where slotMult <= targetMultVal.
    // - If target is OUT or 0x, it is 100% OUT.
    // - If target is prefixed with "exact:" or "only:", it lands strictly on that multiplier.
    if (
      (settings.control_mode === "forced" || settings.control_mode === "cap" || settings.control_mode === "max") &&
      settings.forced_target !== null &&
      settings.forced_target !== undefined
    ) {
      const rawTarget = String(settings.forced_target).trim().toLowerCase();
      const targetStr = rawTarget.replace(/x$/i, "").trim();

      // Check 100% OUT / LOSS (e.g., "out", "loss", "0", "0.0", "0.00", "0x")
      if (
        targetStr === "out" ||
        targetStr === "loss" ||
        targetStr === "0" ||
        targetStr === "0.0" ||
        targetStr === "0.00" ||
        rawTarget === "0x" ||
        rawTarget.includes("loss") ||
        rawTarget.includes("out")
      ) {
        return {
          is_out: true,
          target_slot: null,
          target_mult: 0,
          expected_payout: 0,
        };
      }

      const isExact = rawTarget.startsWith("exact:") || rawTarget.startsWith("only:");
      const cleanTarget = targetStr.replace(/^(?:exact|only)[:_\s\-]?/i, "").trim();

      // Determine the target multiplier limit
      let targetMultVal = null;

      // Check center slot / break-even keywords (or slot 4)
      if (
        targetMultVal === null &&
        (cleanTarget.includes("center") ||
          cleanTarget.includes("break-even") ||
          cleanTarget.includes("breakeven") ||
          cleanTarget === "4" ||
          cleanTarget === "#4" ||
          cleanTarget === "slot 4" ||
          cleanTarget === "slot_4" ||
          cleanTarget === "slot:4")
      ) {
        targetMultVal = Number(mults[4] ?? 1.0);
      }

      // Check if target is a slot reference: e.g. "slot:2", "slot 2", "slot_2", "#2"
      const slotMatch = cleanTarget.match(/^(?:slot|index|#)[:_\s\-]?(\d+)$/i);
      if (targetMultVal === null && slotMatch) {
        const num = Number(slotMatch[1]);
        const sIdx = num >= 0 && num < mults.length ? num : (num >= 1 && num <= mults.length ? num - 1 : 0);
        targetMultVal = Number(mults[sIdx]);
      }

      // Check numeric multiplier (e.g. "2", "2.00", "1.4", "3.4", etc.)
      if (targetMultVal === null) {
        const floatVal = Number.parseFloat(cleanTarget);
        if (!Number.isNaN(floatVal) && floatVal > 0) {
          targetMultVal = floatVal;
        }
      }

      if (targetMultVal !== null && targetMultVal > 0) {
        if (isExact) {
          // Exact mode: only slots with exact multiplier
          const exactSlots = [];
          mults.forEach((m, idx) => {
            if (Math.abs(Number(m) - targetMultVal) < 0.05) exactSlots.push(idx);
          });
          if (exactSlots.length > 0) {
            const chosenSlot = exactSlots[Math.floor(Math.random() * exactSlots.length)];
            const slotMult = Number(mults[chosenSlot]);
            return {
              is_out: false,
              target_slot: chosenSlot,
              target_mult: slotMult,
              expected_payout: Number((betAmount * slotMult).toFixed(2)),
            };
          }
        }

        // Cap / Ceiling Mode:
        // Outcome will NEVER exceed targetMultVal (slotMult <= targetMultVal).
        // It can also drop OUT if out_rate_percent is configured (> 0).
        const outRate = settings.out_rate_percent !== undefined
          ? Math.min(100, Math.max(0, Number(settings.out_rate_percent)))
          : 0;
        if (outRate > 0 && Math.random() * 100 < outRate) {
          return {
            is_out: true,
            target_slot: null,
            target_mult: 0,
            expected_payout: 0,
          };
        }

        // Filter all slots whose multiplier is <= targetMultVal
        const eligibleSlots = [];
        for (let i = 0; i < mults.length; i++) {
          if (Number(mults[i]) <= targetMultVal + 0.05) {
            eligibleSlots.push(i);
          }
        }

        if (eligibleSlots.length > 0) {
          // Weighted random selection among eligible slots
          const totalWeight = eligibleSlots.reduce((sum, idx) => sum + (SLOT_WEIGHTS[idx] || 10), 0);
          let rnd = Math.random() * totalWeight;
          let chosenSlot = eligibleSlots[0];
          for (const idx of eligibleSlots) {
            const w = SLOT_WEIGHTS[idx] || 10;
            if (rnd < w) {
              chosenSlot = idx;
              break;
            }
            rnd -= w;
          }

          const slotMult = Number(mults[chosenSlot]);
          return {
            is_out: false,
            target_slot: chosenSlot,
            target_mult: slotMult,
            expected_payout: Number((betAmount * slotMult).toFixed(2)),
          };
        }
      }
    }

    // 2. AUTO / RANDOM MODE: Admin controlled OUT rate percentage vs random win slot
    const outRate = Math.min(100, Math.max(0, Number(settings.out_rate_percent ?? 35)));
    const roll = Math.random() * 100;

    if (roll < outRate) {
      return {
        is_out: true,
        target_slot: null,
        target_mult: 0,
        expected_payout: 0,
      };
    }

    // Pick weighted winning slot
    const totalWeight = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
    let rnd = Math.random() * totalWeight;
    let chosenSlot = 4; // center slot fallback
    for (let i = 0; i < SLOT_WEIGHTS.length; i++) {
      if (rnd < SLOT_WEIGHTS[i]) {
        chosenSlot = i;
        break;
      }
      rnd -= SLOT_WEIGHTS[i];
    }

    const slotMult = Number(mults[chosenSlot] ?? 1.0);
    const payout = Number((betAmount * slotMult).toFixed(2));

    return {
      is_out: false,
      target_slot: chosenSlot,
      target_mult: slotMult,
      expected_payout: payout,
    };
  }

  // ---------------------------------------------------------------------------
  // Legacy Plinko methods (backward compatibility)
  // ---------------------------------------------------------------------------

  async placeBet(input, { legacyWalletMode = false } = {}) {
    const { userId, gameId, betAmount, type } = validateBet(
      input,
      legacyWalletMode ? 10 : 0.1,
    );
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [users] = await connection.execute(
        "SELECT id, wallet FROM users WHERE id = ? FOR UPDATE",
        [userId],
      );
      if (!users[0]) {
        throw new AppError(400, "USER_NOT_FOUND", "Failed to get data of user!");
      }

      const [activeBets] = await connection.execute(
        `SELECT id FROM plinko_bets
         WHERE userid = ? AND status = 0
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [userId],
      );
      if (activeBets.length > 0) {
        throw new AppError(400, "ACTIVE_BET_EXISTS", "Already Bet placed");
      }
      if (Number(users[0].wallet) < betAmount) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      }

      const orderId = makeOrderId();
      const [insertResult] = await connection.execute(
        `INSERT INTO plinko_bets
          (amount, game_id, type, userid, status, created_at, tax, after_tax, orderid)
         VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, 0, ?, ?)`,
        [betAmount, gameId, type, userId, betAmount, orderId],
      );
      await connection.execute(
        "UPDATE users SET wallet = wallet - ? WHERE id = ?",
        [betAmount, userId],
      );
      const [bets] = await connection.execute(
        "SELECT * FROM plinko_bets WHERE id = ?",
        [insertResult.insertId],
      );

      await connection.commit();
      transactionStarted = false;
      return {
        status: 200,
        message: "Bet placed successfully",
        data: bets[0],
      };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getIndexList(type) {
    if (type === undefined || type === null || String(type).trim() === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The type field is required.");
    }
    const [rows] = await this.poolProvider().execute(
      "SELECT * FROM plinko_index_lists WHERE type = ?",
      [type],
    );
    if (rows.length === 0) {
      return { status: 400, message: "No data found" };
    }
    return { status: 200, message: "Success", data: rows };
  }

  async calculateMultiplier({ userid, index }) {
    const userId = Number(userid);
    const selectedIndex = Number(index);
    if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(selectedIndex)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "The userid and index fields are required and must be integers.",
      );
    }

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [bets] = await connection.execute(
        `SELECT id, amount, type FROM plinko_bets
         WHERE userid = ? AND status = 0
         ORDER BY id ASC LIMIT 1 FOR UPDATE`,
        [userId],
      );
      const bet = bets[0];
      if (!bet) {
        throw new AppError(400, "ACTIVE_BET_NOT_FOUND", "No active plinko bet found for the user");
      }

      const [multipliers] = await connection.execute(
        `SELECT multiplier FROM plinko_index_lists
         WHERE type = ? AND indexs = ? LIMIT 1`,
        [bet.type, selectedIndex],
      );
      const multiplier = multipliers[0]?.multiplier;
      if (multiplier === undefined || multiplier === null) {
        await connection.execute(
          `UPDATE plinko_bets
           SET status = 2, indexs = ?, multipler = 'out', win_amount = 0
           WHERE id = ?`,
          [selectedIndex, bet.id],
        );
        await connection.commit();
        transactionStarted = false;
        return {
          status: 200,
          message: "Plinko result calculated successfully",
          win_amount: "0",
        };
      }

      const winAmount = Number((Number(bet.amount) * Number(multiplier)).toFixed(2));
      await connection.execute(
        `UPDATE plinko_bets
         SET status = 1, indexs = ?, multipler = ?, win_amount = ?
         WHERE id = ?`,
        [selectedIndex, multiplier, winAmount, bet.id],
      );
      await connection.execute(
        "UPDATE users SET wallet = wallet + ? WHERE id = ?",
        [winAmount, userId],
      );
      await connection.commit();
      transactionStarted = false;
      return {
        status: 200,
        message: "Plinko result calculated successfully",
        win_amount: winAmount,
      };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getResults({ userid, limit = 0, offset = 0 }) {
    const userId = Number(userid);
    const resultLimit = Number(limit);
    const resultOffset = Number(offset);
    if (
      !Number.isInteger(userId) ||
      userId < 1 ||
      !Number.isInteger(resultLimit) ||
      resultLimit < 0 ||
      !Number.isInteger(resultOffset) ||
      resultOffset < 0
    ) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid, limit, or offset is invalid.");
    }

    const [rows] = resultLimit === 0
      ? await this.poolProvider().execute(
          "SELECT * FROM plinko_bets WHERE userid = ? AND status = 1 ORDER BY id DESC",
          [userId],
        )
      : await this.poolProvider().execute(
          `SELECT * FROM plinko_bets
           WHERE userid = ? AND status = 1
           ORDER BY id DESC LIMIT ? OFFSET ?`,
          [userId, resultLimit, resultOffset],
        );
    if (rows.length === 0) {
      return { status: 400, message: "No data found" };
    }
    return { status: 200, message: "Success", data: rows };
  }

  // ---------------------------------------------------------------------------
  // Plinko Arcade Player APIs
  // ---------------------------------------------------------------------------

  /**
   * Public / User Configuration: GET /api/plinko/config
   */
  async getConfig() {
    const settings = await this.getActiveSettings();
    return {
      status: 200,
      message: "Config fetched successfully",
      data: {
        slot_multipliers: settings.slot_multipliers,
        chips: settings.chips,
        min_bet: settings.min_bet,
        max_bet: settings.max_bet,
        is_active: settings.is_active,
      },
    };
  }

  /**
   * 1. Game Session Handshake: POST /api/plinko/session/init
   */
  async initSession({ userId }) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid user ID");
    }

    const pool = this.poolProvider();
    const [users] = await pool.execute(
      "SELECT id, username, mobile, wallet, winning_wallet FROM users WHERE id = ? LIMIT 1",
      [uid],
    );
    if (!users[0]) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const user = {
      id: users[0].id,
      username: users[0].username || `Player_${users[0].id}`,
      mobile: users[0].mobile || null,
      wallet: Number(users[0].wallet || 0),
      winning_wallet: Number(users[0].winning_wallet || 0),
    };

    // Load active settings for dynamic multipliers and chips
    const settings = await this.getActiveSettings(pool);

    // Load or create game state
    const [states] = await pool.execute(
      "SELECT * FROM plinko_game_state WHERE userid = ? OR user_id = ? LIMIT 1",
      [uid, uid],
    );

    let gameState;
    if (states[0]) {
      const s = states[0];
      gameState = {
        coins: Number(s.coins || 1000),
        sp: Number(s.sp || 0),
        ascensions: Number(s.ascensions || 0),
        selectedTier: Number(s.selected_tier || 0),
        slotLevels: safeJsonParse(s.slot_levels, [...DEFAULT_SLOT_LEVELS]),
        unify: safeJsonParse(s.unify, { ...DEFAULT_UNIFY }),
        tierBalls: safeJsonParse(s.tier_balls, { ...DEFAULT_TIER_BALLS }),
        investments: safeJsonParse(s.investments, []),
        stats: safeJsonParse(s.stats, { ...DEFAULT_STATS }),
      };
    } else {
      gameState = {
        coins: 1000,
        sp: 0,
        ascensions: 0,
        selectedTier: 0,
        slotLevels: [...DEFAULT_SLOT_LEVELS],
        unify: { ...DEFAULT_UNIFY },
        tierBalls: { ...DEFAULT_TIER_BALLS },
        investments: [],
        stats: { ...DEFAULT_STATS },
      };
      await pool.execute(
        `INSERT INTO plinko_game_state
          (user_id, userid, coins, sp, ascensions, selected_tier, slot_levels, unify, tier_balls, investments, stats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE coins = VALUES(coins)`,
        [
          uid,
          uid,
          gameState.coins,
          gameState.sp,
          gameState.ascensions,
          gameState.selectedTier,
          JSON.stringify(gameState.slotLevels),
          JSON.stringify(gameState.unify),
          JSON.stringify(gameState.tierBalls),
          JSON.stringify(gameState.investments),
          JSON.stringify(gameState.stats),
        ],
      );
    }

    const config = {
      baseBallCost: 5,
      startCoins: 1000,
      slotBaseMultipliers: settings.slot_multipliers,
      chips: settings.chips,
      minBet: settings.min_bet,
      maxBet: settings.max_bet,
      tiers: [
        { id: 0, mult: 1, name: "Bronze" },
        { id: 1, mult: 10, name: "Silver" },
        { id: 2, mult: 100, name: "Gold" },
      ],
    };

    return {
      status: 200,
      message: "Session initialized successfully",
      data: {
        user,
        gameState,
        config,
      },
    };
  }

  /**
   * 2. Place Bet / Drop Ball: POST /api/plinko/bet/drop
   * Calculates predetermined outcome based on Admin control & OUT rate
   */
  async dropBall({ userId, amount, tier = 0, isFree = false }) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid user ID");
    }
    const betTier = Math.max(0, Number.parseInt(tier, 10) || 0);
    const free = Boolean(isFree);
    const betAmount = free ? 0 : Number(amount ?? 5);

    if (!free && (!Number.isFinite(betAmount) || betAmount < 0.1)) {
      throw new AppError(400, "INVALID_AMOUNT", "Bet amount must be at least 0.1");
    }

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [users] = await connection.execute(
        "SELECT id, wallet, winning_wallet FROM users WHERE id = ? FOR UPDATE",
        [uid],
      );
      if (!users[0]) {
        throw new AppError(400, "USER_NOT_FOUND", "User not found");
      }

      const userWallet = Number(users[0].wallet || 0);
      const userWinWallet = Number(users[0].winning_wallet || 0);

      if (!free && userWallet < betAmount) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      }

      // Fetch active admin settings
      const settings = await this.getActiveSettings(connection);

      // Determine outcome according to admin forced control or auto out-percentage
      const outcome = this.determineOutcome(settings, betAmount, betTier);

      // If forced rounds left > 0, decrement and reset when finished
      if (settings.control_mode === "forced" && settings.forced_rounds_left > 0) {
        const nextRounds = settings.forced_rounds_left - 1;
        if (nextRounds <= 0) {
          await connection.execute(
            "UPDATE plinko_settings SET control_mode = 'auto', forced_target = NULL, forced_rounds_left = 0 WHERE id = 1",
          );
        } else {
          await connection.execute(
            "UPDATE plinko_settings SET forced_rounds_left = ? WHERE id = 1",
            [nextRounds],
          );
        }
      }

      const orderId = makeOrderId();
      const serverSeed = crypto.randomBytes(16).toString("hex");

      const [insertResult] = await connection.execute(
        `INSERT INTO plinko_bets
          (amount, game_id, type, userid, status, created_at, tax, after_tax, orderid, tier, server_seed, is_out, target_slot, target_mult)
         VALUES (?, 1, 'plinko_arcade', ?, 0, CURRENT_TIMESTAMP, 0, ?, ?, ?, ?, ?, ?, ?)`,
        [
          betAmount,
          uid,
          betAmount,
          orderId,
          betTier,
          serverSeed,
          outcome.is_out ? 1 : 0,
          outcome.target_slot,
          String(outcome.target_mult),
        ],
      );

      let updatedWallet = userWallet;
      let updatedWinWallet = userWinWallet;

      if (!free && betAmount > 0) {
        updatedWallet = Number((userWallet - betAmount).toFixed(2));
        updatedWinWallet = Math.max(0, Number((userWinWallet - betAmount).toFixed(2)));
        await connection.execute(
          "UPDATE users SET wallet = ?, winning_wallet = ? WHERE id = ?",
          [updatedWallet, updatedWinWallet, uid],
        );
      }

      await connection.commit();
      transactionStarted = false;

      return {
        status: 200,
        message: "Ball dropped successfully",
        data: {
          drop_id: insertResult.insertId,
          orderid: orderId,
          amount: betAmount,
          tier: betTier,
          server_seed: serverSeed,
          target_slot: outcome.target_slot,
          target_mult: outcome.target_mult,
          is_out: outcome.is_out,
          expected_payout: outcome.expected_payout,
          is_free: free,
          wallet: updatedWallet,
          winning_wallet: updatedWinWallet,
        },
      };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 3. Settle Bet (Outcome): POST /api/plinko/bet/settle
   * Settles according to server predetermined target or client validated land
   */
  async settleBet({ userId, dropId, orderId, slot, mult, payout, isOut, tier, amount }) {
    const uid = Number(userId);
    const dropIdNum = Number(dropId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid user ID");
    }

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [users] = await connection.execute(
        "SELECT id, username, wallet, winning_wallet FROM users WHERE id = ? FOR UPDATE",
        [uid],
      );
      if (!users[0]) {
        throw new AppError(400, "USER_NOT_FOUND", "User not found");
      }

      let bet = null;

      // 1. By numeric ID
      if (dropIdNum > 0) {
        const [bets] = await connection.execute(
          "SELECT * FROM plinko_bets WHERE id = ? AND userid = ? FOR UPDATE",
          [dropIdNum, uid],
        );
        bet = bets[0];
      }

      // 2. By order ID (if orderId was supplied or dropId matches an order ID string)
      if (!bet && (orderId || dropId)) {
        const orderKey = String(orderId || dropId).trim();
        if (orderKey) {
          const [bets] = await connection.execute(
            "SELECT * FROM plinko_bets WHERE orderid = ? AND userid = ? FOR UPDATE",
            [orderKey, uid],
          );
          bet = bets[0];
        }
      }

      // 3. Fallback: Search for the user's latest pending bet drop (status = 0)
      if (!bet) {
        const [pending] = await connection.execute(
          "SELECT * FROM plinko_bets WHERE userid = ? AND status = 0 ORDER BY id DESC LIMIT 1 FOR UPDATE",
          [uid],
        );
        if (pending[0]) {
          bet = pending[0];
        }
      }

      // 4. Fallback: Check if the user's latest bet was already settled (idempotency fallback)
      if (!bet) {
        const [latest] = await connection.execute(
          "SELECT * FROM plinko_bets WHERE userid = ? ORDER BY id DESC LIMIT 1 FOR UPDATE",
          [uid],
        );
        if (latest[0] && latest[0].status !== 0) {
          bet = latest[0];
        }
      }

      // 5. Fallback: Auto-create pending bet if none exists (self-healing for direct settle requests / arcade tests)
      if (!bet) {
        const orderIdVal = orderId ? String(orderId) : makeOrderId();
        const betAmt = amount !== undefined && Number(amount) >= 0 ? Number(amount) : 0;
        const betTier = tier !== undefined ? Number(tier) : 0;
        const sSeed = crypto.randomBytes(16).toString("hex");

        if (betAmt > 0 && Number(users[0].wallet || 0) >= betAmt) {
          const updatedWallet = Number((Number(users[0].wallet) - betAmt).toFixed(2));
          const updatedWin = Math.max(0, Number((Number(users[0].winning_wallet) - betAmt).toFixed(2)));
          await connection.execute(
            "UPDATE users SET wallet = ?, winning_wallet = ? WHERE id = ?",
            [updatedWallet, updatedWin, uid],
          );
          users[0].wallet = updatedWallet;
          users[0].winning_wallet = updatedWin;
        }

        const [insertResult] = await connection.execute(
          `INSERT INTO plinko_bets
            (amount, game_id, type, userid, status, created_at, tax, after_tax, orderid, tier, server_seed, is_out, target_slot, target_mult)
           VALUES (?, 1, 'plinko_arcade', ?, 0, CURRENT_TIMESTAMP, 0, ?, ?, ?, ?, ?, ?, ?)`,
          [
            betAmt,
            uid,
            betAmt,
            orderIdVal,
            betTier,
            sSeed,
            isOut ? 1 : 0,
            slot !== undefined && slot !== null ? Number(slot) : 0,
            mult !== undefined && mult !== null ? String(mult) : "1",
          ],
        );

        const [createdBets] = await connection.execute(
          "SELECT * FROM plinko_bets WHERE id = ? FOR UPDATE",
          [insertResult.insertId],
        );
        bet = createdBets[0];
      }

      if (!bet) {
        throw new AppError(404, "BET_NOT_FOUND", "Active bet drop not found");
      }

      // Check if already settled (idempotency)
      if (bet.status !== 0) {
        await connection.commit();
        transactionStarted = false;
        return {
          status: 200,
          message: "Bet already settled",
          data: {
            drop_id: bet.id,
            orderid: bet.orderid,
            status: bet.status,
            slot: bet.slot,
            multiplier: bet.multipler,
            payout: Number(bet.win_amount || 0),
            is_out: Boolean(bet.is_out),
            wallet: Number(users[0].wallet || 0),
            winning_wallet: Number(users[0].winning_wallet || 0),
          },
        };
      }

      // Use predetermined server outcome if available, ensuring security
      const hasPredetermined = bet.target_mult !== null && bet.target_mult !== undefined;
      const predeterminedOut = Boolean(bet.is_out);

      let out;
      let multiplierVal;
      let slotIndex;

      if (hasPredetermined) {
        out = predeterminedOut;
        multiplierVal = out ? 0 : Number(bet.target_mult || 0);
        slotIndex = out ? null : (bet.target_slot !== null ? Number(bet.target_slot) : Number(slot ?? 0));
      } else {
        out = Boolean(isOut || mult === 0 || mult === "0" || slot === null || slot === undefined);
        multiplierVal = out ? 0 : Number(mult || 1);
        slotIndex = out ? null : Number(slot);
      }

      const betTier = tier !== undefined ? Number(tier) : Number(bet.tier || 0);
      let winAmount = 0;
      if (!out && multiplierVal > 0) {
        winAmount = Math.max(0, Number((Number(bet.amount) * multiplierVal).toFixed(2)));
      }
      const betStatus = out ? 2 : (winAmount > 0 ? 1 : 2);
      const multStr = out ? "out" : String(multiplierVal);
      const isOutFlag = out ? 1 : 0;

      await connection.execute(
        `UPDATE plinko_bets
         SET status = ?, slot = ?, indexs = ?, multipler = ?, win_amount = ?, is_out = ?, tier = ?, settled_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [betStatus, slotIndex, slotIndex, multStr, winAmount, isOutFlag, betTier, bet.id],
      );

      let currentWallet = Number(users[0].wallet || 0);
      let currentWinWallet = Number(users[0].winning_wallet || 0);

      if (winAmount > 0) {
        currentWallet = Number((currentWallet + winAmount).toFixed(2));
        currentWinWallet = Number((currentWinWallet + winAmount).toFixed(2));
        await connection.execute(
          "UPDATE users SET wallet = ?, winning_wallet = ? WHERE id = ?",
          [currentWallet, currentWinWallet, uid],
        );
      }

      // Update game state stats
      const [stateRows] = await connection.execute(
        "SELECT id, stats FROM plinko_game_state WHERE userid = ? OR user_id = ? LIMIT 1 FOR UPDATE",
        [uid, uid],
      );
      if (stateRows[0]) {
        const stats = safeJsonParse(stateRows[0].stats, { ...DEFAULT_STATS });
        stats.drops = (stats.drops || 0) + 1;
        stats.totalEarned = Number(((stats.totalEarned || 0) + winAmount).toFixed(2));
        stats.bestWin = Math.max(stats.bestWin || 0, winAmount);
        await connection.execute(
          "UPDATE plinko_game_state SET stats = ? WHERE id = ?",
          [JSON.stringify(stats), stateRows[0].id],
        );
      }

      await connection.commit();
      transactionStarted = false;

      // Broadcast live bet to socket stream
      const socket = getPlinkoSocket();
      if (socket) {
        socket.broadcastBet({
          id: bet.id,
          username: users[0].username || `Player_${uid}`,
          amount: Number(bet.amount || 0),
          tier: betTier,
          mult: multiplierVal,
          is_out: out,
          win_amount: winAmount,
        });
      }

      return {
        status: 200,
        message: "Bet settled successfully",
        data: {
          drop_id: bet.id,
          orderid: bet.orderid,
          status: betStatus,
          slot: slotIndex,
          multiplier: multiplierVal,
          payout: winAmount,
          is_out: out,
          wallet: currentWallet,
          winning_wallet: currentWinWallet,
        },
      };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 4. My Bet History: GET /api/plinko/bets/my-history
   */
  async getMyHistory({ userId, limit = 20, offset = 0, page = 1 }) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid user ID");
    }

    const take = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const skip = offset !== undefined && offset !== null && offset !== ""
      ? Math.max(0, Number.parseInt(offset, 10) || 0)
      : (pageNum - 1) * take;

    const pool = this.poolProvider();
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) AS total FROM plinko_bets WHERE userid = ?",
      [uid],
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.execute(
      `SELECT id, orderid, amount, win_amount, multipler, slot, target_slot, target_mult, tier, is_out, status, created_at, settled_at
       FROM plinko_bets
       WHERE userid = ?
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [uid, take, skip],
    );

    const formatted = rows.map((r) => ({
      id: r.id,
      orderid: r.orderid,
      amount: Number(r.amount || 0),
      win_amount: Number(r.win_amount || 0),
      multiplier: r.multipler === "out" ? 0 : Number(r.multipler || r.target_mult || 0),
      slot: r.slot !== null ? Number(r.slot) : (r.target_slot !== null ? Number(r.target_slot) : null),
      tier: Number(r.tier || 0),
      is_out: Boolean(r.is_out || r.multipler === "out"),
      status: Number(r.status),
      created_at: r.created_at,
      settled_at: r.settled_at,
    }));

    return {
      status: 200,
      message: "Bet history fetched successfully",
      data: formatted,
      total,
      page: Math.floor(skip / take) + 1,
      limit: take,
    };
  }

  /**
   * 5. Live Bets Stream: GET /api/plinko/bets/live
   */
  async getLiveBets({ limit = 20 } = {}) {
    const take = Math.min(50, Math.max(5, Number.parseInt(limit, 10) || 20));
    const pool = this.poolProvider();

    const [rows] = await pool.execute(
      `SELECT b.id, b.amount, b.win_amount, b.multipler, b.target_mult, b.tier, b.is_out, b.settled_at, b.created_at, u.username
       FROM plinko_bets b
       LEFT JOIN users u ON b.userid = u.id
       WHERE b.status IN (1, 2)
       ORDER BY b.id DESC
       LIMIT ?`,
      [take],
    );

    const realBets = rows.map((r) => {
      const out = Boolean(r.is_out || r.multipler === "out");
      const mult = out ? 0 : Number(r.multipler || r.target_mult || 0);
      return {
        id: `bet-${r.id}`,
        player: r.username || `Player_${r.id}`,
        bet: Number(r.amount || 0),
        tier: Number(r.tier || 0),
        mult,
        isOut: out,
        payout: Number(r.win_amount || 0),
        timeAgo: "Just now",
        isUser: true,
        timestamp: r.settled_at ? new Date(r.settled_at).getTime() : Date.now(),
      };
    });

    while (realBets.length < take) {
      realBets.push(generateSimulatedBet());
    }

    const onlineCount = 2480 + Math.floor(Math.random() * 50);

    return {
      status: 200,
      message: "Live bets fetched successfully",
      data: {
        onlineCount,
        bets: realBets.slice(0, take),
      },
    };
  }

  /**
   * 6. Cashout / Ascend / Action: POST /api/plinko/game/action
   */
  async handleGameAction({ userId, action, payload = {} }) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid user ID");
    }

    const act = String(action || "").toLowerCase().trim();
    if (!act) {
      throw new AppError(400, "VALIDATION_ERROR", "Action is required");
    }

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [rows] = await connection.execute(
        "SELECT * FROM plinko_game_state WHERE userid = ? OR user_id = ? LIMIT 1 FOR UPDATE",
        [uid, uid],
      );

      let state;
      let stateId;

      if (rows[0]) {
        stateId = rows[0].id;
        state = {
          coins: Number(rows[0].coins || 1000),
          sp: Number(rows[0].sp || 0),
          ascensions: Number(rows[0].ascensions || 0),
          selectedTier: Number(rows[0].selected_tier || 0),
          slotLevels: safeJsonParse(rows[0].slot_levels, [...DEFAULT_SLOT_LEVELS]),
          unify: safeJsonParse(rows[0].unify, { ...DEFAULT_UNIFY }),
          tierBalls: safeJsonParse(rows[0].tier_balls, { ...DEFAULT_TIER_BALLS }),
          investments: safeJsonParse(rows[0].investments, []),
          stats: safeJsonParse(rows[0].stats, { ...DEFAULT_STATS }),
        };
      } else {
        state = {
          coins: 1000,
          sp: 0,
          ascensions: 0,
          selectedTier: 0,
          slotLevels: [...DEFAULT_SLOT_LEVELS],
          unify: { ...DEFAULT_UNIFY },
          tierBalls: { ...DEFAULT_TIER_BALLS },
          investments: [],
          stats: { ...DEFAULT_STATS },
        };
      }

      if (act === "cashout") {
        const coins = Number(payload.coins ?? state.coins ?? 1000);
        const gain = Math.max(0, Math.floor((coins - 1000) / 25));
        state.sp = (state.sp || 0) + gain;
        state.coins = 1000;
        state.slotLevels = [...DEFAULT_SLOT_LEVELS];
        state.unify = { ...DEFAULT_UNIFY };
        state.stats.cashouts = (state.stats.cashouts || 0) + 1;
        state.stats.totalSpEarned = (state.stats.totalSpEarned || 0) + gain;
      } else if (act === "ascend") {
        const invCount = Array.isArray(state.investments) ? state.investments.length : 0;
        if (invCount < 5 && !(payload && payload.force)) {
          throw new AppError(400, "REQUIREMENT_NOT_MET", "Need all 5 investments to ascend");
        }
        state.ascensions = (state.ascensions || 0) + 1;
        state.coins = 1000;
        state.investments = [];
        state.slotLevels = [...DEFAULT_SLOT_LEVELS];
        state.unify = { ...DEFAULT_UNIFY };
      } else if (act === "invest") {
        if (payload.investments && Array.isArray(payload.investments)) {
          state.investments = payload.investments;
        } else if (payload.investment) {
          if (!state.investments.includes(payload.investment)) {
            state.investments.push(payload.investment);
          }
        }
        if (payload.sp !== undefined) state.sp = Number(payload.sp);
      } else if (act === "upgrade_slot") {
        if (Array.isArray(payload.slotLevels) && payload.slotLevels.length === 9) {
          state.slotLevels = payload.slotLevels;
        } else if (payload.slotIndex !== undefined && payload.level !== undefined) {
          state.slotLevels[payload.slotIndex] = payload.level;
        }
        if (payload.coins !== undefined) state.coins = Number(payload.coins);
      } else if (act === "upgrade_unify") {
        if (payload.unify && typeof payload.unify === "object") {
          state.unify = { ...state.unify, ...payload.unify };
        }
        if (payload.coins !== undefined) state.coins = Number(payload.coins);
      } else if (act === "sync_state") {
        if (payload.coins !== undefined) state.coins = Number(payload.coins);
        if (payload.sp !== undefined) state.sp = Number(payload.sp);
        if (payload.ascensions !== undefined) state.ascensions = Number(payload.ascensions);
        if (payload.selectedTier !== undefined) state.selectedTier = Number(payload.selectedTier);
        if (Array.isArray(payload.slotLevels)) state.slotLevels = payload.slotLevels;
        if (payload.unify && typeof payload.unify === "object") state.unify = { ...state.unify, ...payload.unify };
        if (payload.tierBalls && typeof payload.tierBalls === "object") state.tierBalls = { ...state.tierBalls, ...payload.tierBalls };
        if (Array.isArray(payload.investments)) state.investments = payload.investments;
        if (payload.stats && typeof payload.stats === "object") state.stats = { ...state.stats, ...payload.stats };
      } else {
        throw new AppError(400, "INVALID_ACTION", `Unknown action: ${act}`);
      }

      if (stateId) {
        await connection.execute(
          `UPDATE plinko_game_state
           SET coins = ?, sp = ?, ascensions = ?, selected_tier = ?,
               slot_levels = ?, unify = ?, tier_balls = ?, investments = ?, stats = ?
           WHERE id = ?`,
          [
            state.coins,
            state.sp,
            state.ascensions,
            state.selectedTier,
            JSON.stringify(state.slotLevels),
            JSON.stringify(state.unify),
            JSON.stringify(state.tierBalls),
            JSON.stringify(state.investments),
            JSON.stringify(state.stats),
            stateId,
          ],
        );
      } else {
        await connection.execute(
          `INSERT INTO plinko_game_state
            (user_id, userid, coins, sp, ascensions, selected_tier, slot_levels, unify, tier_balls, investments, stats)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uid,
            uid,
            state.coins,
            state.sp,
            state.ascensions,
            state.selectedTier,
            JSON.stringify(state.slotLevels),
            JSON.stringify(state.unify),
            JSON.stringify(state.tierBalls),
            JSON.stringify(state.investments),
            JSON.stringify(state.stats),
          ],
        );
      }

      await connection.commit();
      transactionStarted = false;

      return {
        status: 200,
        message: "Action processed successfully",
        data: {
          action: act,
          gameState: state,
        },
      };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Admin Management APIs
  // ---------------------------------------------------------------------------

  /**
   * Admin: Get Plinko Settings & Control Status: GET /api/admin/plinko/settings
   */
  async getAdminSettings() {
    const settings = await this.getActiveSettings();

    // Quick stats summary
    const pool = this.poolProvider();
    const [counts] = await pool.execute(`
      SELECT
        COUNT(*) AS total_bets,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(win_amount), 0) AS total_win,
        COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) AS total_wins,
        COALESCE(SUM(CASE WHEN is_out = 1 OR multipler = 'out' THEN 1 ELSE 0 END), 0) AS total_outs
      FROM plinko_bets
    `);

    const summary = {
      totalBets: Number(counts[0]?.total_bets || 0),
      totalAmount: Number(counts[0]?.total_amount || 0),
      totalWin: Number(counts[0]?.total_win || 0),
      totalWins: Number(counts[0]?.total_wins || 0),
      totalOuts: Number(counts[0]?.total_outs || 0),
      netProfit: Number(((counts[0]?.total_amount || 0) - (counts[0]?.total_win || 0)).toFixed(2)),
    };

    return {
      status: 200,
      message: "Admin settings fetched successfully",
      data: {
        settings,
        summary,
      },
    };
  }

  /**
   * Admin: Update Settings: POST /api/admin/plinko/settings
   */
  async updateAdminSettings(input = {}) {
    const pool = this.poolProvider();
    const current = await this.getActiveSettings(pool);

    let slotMultipliers = current.slot_multipliers;
    const rawMults = input.slot_multipliers ?? input.slotMultipliers ?? input.multipliers ?? input.slots;

    if (rawMults !== undefined && rawMults !== null) {
      if (typeof rawMults === "string") {
        const parsed = rawMults
          .split(",")
          .map((s) => s.trim().toLowerCase().replace(/x$/i, ""))
          .filter((s) => s.length > 0)
          .map((s) => Number(s));

        if (parsed.length !== 9 || parsed.some((n) => !Number.isFinite(n) || n < 0)) {
          throw new AppError(400, "VALIDATION_ERROR", "slot_multipliers requires exactly 9 numbers (e.g. '2.0x, 1.50x, 1.20x, 1.20x, 1x, 1.20x, 1.20x, 1.50x, 2.0x')");
        }
        slotMultipliers = parsed;
      } else if (Array.isArray(rawMults)) {
        const parsed = rawMults.map((m) => {
          const clean = typeof m === "string" ? m.trim().toLowerCase().replace(/x$/i, "") : m;
          return Number(clean);
        });

        if (parsed.length !== 9 || parsed.some((n) => !Number.isFinite(n) || n < 0)) {
          throw new AppError(400, "VALIDATION_ERROR", "slot_multipliers array requires exactly 9 numbers (e.g. [2.0, 1.5, 1.2, 1.2, 1.0, 1.2, 1.2, 1.5, 2.0])");
        }
        slotMultipliers = parsed;
      }
    }

    const chips = Array.isArray(input.chips) && input.chips.length > 0
      ? input.chips.map((c) => Math.max(1, Number(c)))
      : current.chips;

    const outRate = input.out_rate_percent !== undefined
      ? Math.min(100, Math.max(0, Number(input.out_rate_percent)))
      : (input.outRate !== undefined ? Math.min(100, Math.max(0, Number(input.outRate))) : current.out_rate_percent);

    const minBet = input.min_bet !== undefined ? Math.max(0.1, Number(input.min_bet)) : current.min_bet;
    const maxBet = input.max_bet !== undefined ? Math.max(minBet, Number(input.max_bet)) : current.max_bet;
    const isActive = input.is_active !== undefined ? (input.is_active ? 1 : 0) : (current.is_active ? 1 : 0);

    await pool.execute(
      `INSERT INTO plinko_settings
        (id, slot_multipliers, chips, out_rate_percent, min_bet, max_bet, is_active)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        slot_multipliers = VALUES(slot_multipliers),
        chips = VALUES(chips),
        out_rate_percent = VALUES(out_rate_percent),
        min_bet = VALUES(min_bet),
        max_bet = VALUES(max_bet),
        is_active = VALUES(is_active)`,
      [
        JSON.stringify(slotMultipliers),
        JSON.stringify(chips),
        outRate,
        minBet,
        maxBet,
        isActive,
      ],
    );

    const updated = await this.getActiveSettings(pool);

    return {
      status: 200,
      message: "Settings updated successfully",
      data: {
        slot_multipliers: updated.slot_multipliers,
        chips: updated.chips,
        out_rate_percent: updated.out_rate_percent,
        min_bet: updated.min_bet,
        max_bet: updated.max_bet,
        is_active: updated.is_active ? 1 : 0,
      },
    };
  }

  /**
   * Admin: Quick Control Target / Mode: POST /api/admin/plinko/control
   * Sets forced target: '1.70', '1.40', '1.20', '1.00', 'out', or slot index 0..8, or auto mode
   */
  async setAdminControl(input = {}) {
    const pool = this.poolProvider();
    const mode = String(input.control_mode || input.mode || "auto").toLowerCase().trim();
    const forcedTarget = input.forced_target !== undefined ? input.forced_target : (input.target ?? null);
    const rounds = Math.max(0, Number.parseInt(input.forced_rounds || input.rounds, 10) || 0);

    const controlMode = mode === "forced" ? "forced" : "auto";
    const targetVal = controlMode === "forced" && forcedTarget !== null ? String(forcedTarget).trim() : null;

    await pool.execute(
      `INSERT INTO plinko_settings
        (id, control_mode, forced_target, forced_rounds_left)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        control_mode = VALUES(control_mode),
        forced_target = VALUES(forced_target),
        forced_rounds_left = VALUES(forced_rounds_left)`,
      [controlMode, targetVal, rounds],
    );

    return {
      status: 200,
      message: controlMode === "forced"
        ? `Plinko control set to FORCED target [${targetVal}] for ${rounds === 0 ? "continuous rounds" : `${rounds} round(s)`}`
        : "Plinko control set to AUTO / RANDOM mode",
      data: {
        control_mode: controlMode,
        forced_target: targetVal,
        forced_rounds_left: rounds,
      },
    };
  }

  /**
   * Admin: Bets History & Filters: GET /api/admin/plinko/bets
   */
  async getAdminBets({ page = 1, limit = 20, userid, status, orderid, date_from, date_to } = {}) {
    const take = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const skip = (pageNum - 1) * take;

    const conditions = [];
    const params = [];

    if (userid) {
      conditions.push("b.userid = ?");
      params.push(Number(userid));
    }
    if (status !== undefined && status !== null && status !== "") {
      conditions.push("b.status = ?");
      params.push(Number(status));
    }
    if (orderid) {
      conditions.push("b.orderid LIKE ?");
      params.push(`%${orderid}%`);
    }
    if (date_from) {
      conditions.push("b.created_at >= ?");
      params.push(date_from);
    }
    if (date_to) {
      conditions.push("b.created_at <= ?");
      params.push(date_to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const pool = this.poolProvider();
    const [countRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(b.amount), 0) AS total_amount,
         COALESCE(SUM(b.win_amount), 0) AS total_win,
         COALESCE(SUM(CASE WHEN b.status = 1 THEN 1 ELSE 0 END), 0) AS total_wins,
         COALESCE(SUM(CASE WHEN b.is_out = 1 OR b.multipler = 'out' THEN 1 ELSE 0 END), 0) AS total_outs
       FROM plinko_bets b ${whereClause}`,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.execute(
      `SELECT
         b.id, b.orderid, b.userid, b.amount, b.win_amount, b.multipler, b.target_mult,
         b.slot, b.target_slot, b.tier, b.is_out, b.status, b.created_at, b.settled_at,
         u.username, u.mobile
       FROM plinko_bets b
       LEFT JOIN users u ON b.userid = u.id
       ${whereClause}
       ORDER BY b.id DESC
       LIMIT ? OFFSET ?`,
      [...params, take, skip],
    );

    return {
      status: 200,
      message: "Admin bets fetched successfully",
      data: rows.map((r) => ({
        id: r.id,
        orderid: r.orderid,
        userid: r.userid,
        username: r.username || `Player_${r.userid}`,
        mobile: r.mobile,
        amount: Number(r.amount || 0),
        win_amount: Number(r.win_amount || 0),
        multiplier: r.multipler === "out" ? 0 : Number(r.multipler || r.target_mult || 0),
        slot: r.slot !== null ? Number(r.slot) : (r.target_slot !== null ? Number(r.target_slot) : null),
        tier: Number(r.tier || 0),
        is_out: Boolean(r.is_out || r.multipler === "out"),
        status: Number(r.status), // 0: pending, 1: won, 2: out/lost
        created_at: r.created_at,
        settled_at: r.settled_at,
      })),
      summary: {
        totalBets: total,
        totalAmount: Number(countRows[0]?.total_amount || 0),
        totalWin: Number(countRows[0]?.total_win || 0),
        totalWins: Number(countRows[0]?.total_wins || 0),
        totalOuts: Number(countRows[0]?.total_outs || 0),
        netProfit: Number(((countRows[0]?.total_amount || 0) - (countRows[0]?.total_win || 0)).toFixed(2)),
      },
      page: pageNum,
      limit: take,
      total,
    };
  }

  /**
   * Admin: Plinko Dashboard Stats: GET /api/admin/plinko/dashboard
   */
  async getAdminDashboard() {
    const pool = this.poolProvider();
    const settings = await this.getActiveSettings(pool);

    const [allTime] = await pool.execute(`
      SELECT
        COUNT(*) AS total_bets,
        COUNT(DISTINCT userid) AS unique_players,
        COALESCE(SUM(amount), 0) AS total_volume,
        COALESCE(SUM(win_amount), 0) AS total_payout,
        COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) AS total_wins,
        COALESCE(SUM(CASE WHEN is_out = 1 OR multipler = 'out' THEN 1 ELSE 0 END), 0) AS total_outs
      FROM plinko_bets
    `);

    const [today] = await pool.execute(`
      SELECT
        COUNT(*) AS today_bets,
        COUNT(DISTINCT userid) AS today_players,
        COALESCE(SUM(amount), 0) AS today_volume,
        COALESCE(SUM(win_amount), 0) AS today_payout,
        COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) AS today_wins,
        COALESCE(SUM(CASE WHEN is_out = 1 OR multipler = 'out' THEN 1 ELSE 0 END), 0) AS today_outs
      FROM plinko_bets
      WHERE DATE(created_at) = CURDATE()
    `);

    const at = allTime[0] || {};
    const td = today[0] || {};

    const totalVolume = Number(at.total_volume || 0);
    const totalPayout = Number(at.total_payout || 0);
    const todayVolume = Number(td.today_volume || 0);
    const todayPayout = Number(td.today_payout || 0);

    return {
      status: 200,
      message: "Dashboard stats fetched successfully",
      data: {
        settings,
        metrics: {
          allTime: {
            bets: Number(at.total_bets || 0),
            players: Number(at.unique_players || 0),
            volume: totalVolume,
            payout: totalPayout,
            ggr: Number((totalVolume - totalPayout).toFixed(2)),
            wins: Number(at.total_wins || 0),
            outs: Number(at.total_outs || 0),
            winRate: at.total_bets ? Number(((at.total_wins / at.total_bets) * 100).toFixed(2)) : 0,
            outRate: at.total_bets ? Number(((at.total_outs / at.total_bets) * 100).toFixed(2)) : 0,
          },
          today: {
            bets: Number(td.today_bets || 0),
            players: Number(td.today_players || 0),
            volume: todayVolume,
            payout: todayPayout,
            ggr: Number((todayVolume - todayPayout).toFixed(2)),
            wins: Number(td.today_wins || 0),
            outs: Number(td.today_outs || 0),
          },
        },
      },
    };
  }
}

module.exports = { PlinkoService, makeOrderId, DEFAULT_SLOT_MULTS, DEFAULT_CHIPS };
