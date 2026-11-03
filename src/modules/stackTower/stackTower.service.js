"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

function requiredInteger(value, field) {
  const number = Number(value);
  if (value === undefined || value === null || value === "" || !Number.isInteger(number)) {
    throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is required and must be an integer.`);
  }
  return number;
}

function requiredNumber(value, field) {
  const number = Number(value);
  if (value === undefined || value === null || value === "" || !Number.isFinite(number)) {
    throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is required and must be numeric.`);
  }
  return number;
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
  return `ST${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}${randomInt(11111, 99999)}`;
}

// In-memory fallback map for testing or standalone execution when MySQL pool is unavailable
const memoryBets = new Map();
const memoryUsers = new Map();

class StackTowerService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async getDbConnection() {
    try {
      const pool = this.poolProvider();
      return await pool.getConnection();
    } catch (_) {
      return null;
    }
  }

  /**
   * Place Bet / Start Game
   */
  async placeBet({ userid, uid, user_id, amount, difficulty = "MEDIUM", game_id = 45 }) {
    const rawUid = userid ?? uid ?? user_id;
    const userId = requiredInteger(rawUid, "userid");
    const betAmount = requiredNumber(amount, "amount");
    const gameId = Number(game_id) || 45;
    const diff = String(difficulty || "MEDIUM").toUpperCase();

    if (userId < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid must be a positive integer.");
    }
    if (betAmount < 1) {
      throw new AppError(400, "INVALID_AMOUNT", "Minimum bet amount is ₹1.00");
    }

    const roundId = makeOrderId();
    const conn = await this.getDbConnection();

    if (!conn) {
      // In-memory fallback
      let user = memoryUsers.get(userId) || { wallet: 10000, winning_wallet: 10000 };
      if (user.wallet < betAmount) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient wallet balance.");
      }
      user.wallet -= betAmount;
      memoryUsers.set(userId, user);

      const betRecord = {
        id: memoryBets.size + 1,
        round_id: roundId,
        user_id: userId,
        game_id: gameId,
        difficulty: diff,
        amount: betAmount,
        current_level: 0,
        multiplier: 1.0,
        win_amount: 0,
        status: 0, // 0: PLAYING
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryBets.set(roundId, betRecord);

      return {
        status: 200,
        success: true,
        message: "Bet placed successfully",
        data: {
          round_id: roundId,
          roundId,
          game_sr_num: roundId,
          bet_amount: betAmount,
          betAmount,
          difficulty: diff,
          current_level: 0,
          multiplier: 1.0,
          wallet_balance: Number(user.wallet.toFixed(2)),
          walletBalance: Number(user.wallet.toFixed(2)),
          status: "PLAYING",
        },
      };
    }

    let txStarted = false;
    try {
      await conn.beginTransaction();
      txStarted = true;

      const [users] = await conn.execute(
        "SELECT id, wallet, winning_wallet FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );

      if (!users || !users[0]) {
        throw new AppError(404, "USER_NOT_FOUND", "User does not exist.");
      }

      const user = users[0];
      const curWallet = Number(user.wallet || 0);

      if (curWallet < betAmount) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient wallet balance to place bet.");
      }

      const newWallet = Number((curWallet - betAmount).toFixed(4));
      const winningWallet = Math.max(0, Number((Number(user.winning_wallet || 0) - betAmount).toFixed(4)));

      // Deduct from user wallet
      await conn.execute(
        "UPDATE users SET wallet = ?, winning_wallet = ?, today_turnover = today_turnover + ? WHERE id = ?",
        [newWallet, winningWallet, betAmount, userId]
      );

      // Create bet record
      await conn.execute(
        `INSERT INTO stack_tower_bets 
         (user_id, round_id, game_id, difficulty, amount, current_level, multiplier, win_amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 1.0000, 0.0000, 0, NOW(), NOW())`,
        [userId, roundId, gameId, diff, betAmount]
      );

      // Log wallet history
      try {
        await conn.execute(
          `INSERT INTO wallet_history (userid, amount, subtypeid, created_at, updated_at)
           VALUES (?, ?, 45, NOW(), NOW())`,
          [userId, betAmount]
        );
      } catch (_) { }

      await conn.commit();
      txStarted = false;

      return {
        status: 200,
        success: true,
        message: "Bet placed successfully",
        data: {
          round_id: roundId,
          roundId,
          game_sr_num: roundId,
          bet_amount: betAmount,
          betAmount,
          difficulty: diff,
          current_level: 0,
          multiplier: 1.0,
          wallet_balance: Number(newWallet.toFixed(2)),
          walletBalance: Number(newWallet.toFixed(2)),
          status: "PLAYING",
        },
      };
    } catch (err) {
      if (txStarted) await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Cash Out: Player locks in current multiplier & claims payout
   */
  async cashout({ userid, uid, user_id, round_id, roundId, level = 0, multiplier = 1.0 }) {
    const rawUid = userid ?? uid ?? user_id;
    const userId = requiredInteger(rawUid, "userid");
    const activeRoundId = String(round_id || roundId || "").trim();
    const finalMult = requiredNumber(multiplier, "multiplier");
    const finalLevel = Number(level) || 0;

    if (!activeRoundId) {
      throw new AppError(400, "VALIDATION_ERROR", "The round_id field is required.");
    }
    if (finalMult <= 0) {
      throw new AppError(400, "VALIDATION_ERROR", "The multiplier must be greater than zero.");
    }

    const conn = await this.getDbConnection();

    if (!conn) {
      const bet = memoryBets.get(activeRoundId);
      if (!bet || Number(bet.user_id) !== Number(userId)) {
        throw new AppError(404, "BET_NOT_FOUND", "Active bet not found for this round.");
      }
      if (bet.status !== 0) {
        throw new AppError(400, "ROUND_ALREADY_FINISHED", "This round is already settled.");
      }

      const winAmount = Number((bet.amount * finalMult).toFixed(2));
      const profit = Number((winAmount - bet.amount).toFixed(2));

      bet.status = 1; // 1: WON / CASHED_OUT
      bet.current_level = finalLevel;
      bet.multiplier = finalMult;
      bet.win_amount = winAmount;
      bet.updated_at = new Date();

      let user = memoryUsers.get(userId) || { wallet: 10000, winning_wallet: 10000 };
      user.wallet += winAmount;
      user.winning_wallet += winAmount;
      memoryUsers.set(userId, user);

      return {
        status: 200,
        success: true,
        message: "Cashout successful",
        data: {
          round_id: activeRoundId,
          roundId: activeRoundId,
          bet_amount: bet.amount,
          betAmount: bet.amount,
          level: finalLevel,
          multiplier: finalMult,
          win_amount: winAmount,
          winAmount,
          payout: winAmount,
          profit,
          wallet_balance: Number(user.wallet.toFixed(2)),
          walletBalance: Number(user.wallet.toFixed(2)),
          status: "CASHED_OUT",
        },
      };
    }

    let txStarted = false;
    try {
      await conn.beginTransaction();
      txStarted = true;

      const [bets] = await conn.execute(
        `SELECT id, user_id, round_id, amount, status 
         FROM stack_tower_bets 
         WHERE round_id = ? AND user_id = ? FOR UPDATE`,
        [activeRoundId, userId]
      );

      if (!bets || !bets[0]) {
        throw new AppError(404, "BET_NOT_FOUND", "Active bet not found for this round.");
      }

      const bet = bets[0];
      if (bet.status !== 0) {
        throw new AppError(400, "ROUND_ALREADY_FINISHED", "This round is already finished or settled.");
      }

      const betAmount = Number(bet.amount || 0);
      const winAmount = Number((betAmount * finalMult).toFixed(4));
      const profit = Number((winAmount - betAmount).toFixed(2));

      // Credit winnings to user wallet & winning_wallet
      await conn.execute(
        `UPDATE users 
         SET wallet = wallet + ?, winning_wallet = winning_wallet + ? 
         WHERE id = ?`,
        [winAmount, winAmount, userId]
      );

      // Mark bet as WON / CASHED_OUT (status = 1)
      await conn.execute(
        `UPDATE stack_tower_bets 
         SET status = 1, current_level = ?, multiplier = ?, win_amount = ?, updated_at = NOW() 
         WHERE id = ?`,
        [finalLevel, finalMult, winAmount, bet.id]
      );

      // Log wallet credit
      try {
        await conn.execute(
          `INSERT INTO wallet_history (userid, amount, subtypeid, created_at, updated_at)
           VALUES (?, ?, 45, NOW(), NOW())`,
          [userId, winAmount]
        );
      } catch (_) { }

      const [updatedUsers] = await conn.execute("SELECT wallet FROM users WHERE id = ?", [userId]);
      const newBal = updatedUsers && updatedUsers[0] ? Number(updatedUsers[0].wallet) : 0;

      await conn.commit();
      txStarted = false;

      return {
        status: 200,
        success: true,
        message: "Cashout successful",
        data: {
          round_id: activeRoundId,
          roundId: activeRoundId,
          bet_amount: betAmount,
          betAmount,
          level: finalLevel,
          multiplier: finalMult,
          win_amount: Number(winAmount.toFixed(2)),
          winAmount: Number(winAmount.toFixed(2)),
          payout: Number(winAmount.toFixed(2)),
          profit,
          wallet_balance: Number(newBal.toFixed(2)),
          walletBalance: Number(newBal.toFixed(2)),
          status: "CASHED_OUT",
        },
      };
    } catch (err) {
      if (txStarted) await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Game Over: Block missed / tower toppled
   */
  async gameOver({ userid, uid, user_id, round_id, roundId, final_level = 0, finalLevel = 0, multiplier = 1.0, final_multiplier }) {
    const rawUid = userid ?? uid ?? user_id;
    const userId = requiredInteger(rawUid, "userid");
    const activeRoundId = String(round_id || roundId || "").trim();
    const level = Number(final_level || finalLevel || 0);
    const mult = Number(final_multiplier || multiplier || 1.0);

    if (!activeRoundId) {
      throw new AppError(400, "VALIDATION_ERROR", "The round_id field is required.");
    }

    const conn = await this.getDbConnection();

    if (!conn) {
      const bet = memoryBets.get(activeRoundId);
      if (bet) {
        bet.status = 2; // 2: LOST
        bet.current_level = level;
        bet.multiplier = mult;
        bet.win_amount = 0;
        bet.updated_at = new Date();
      }
      return {
        status: 200,
        success: true,
        message: "Game over - Round lost",
        data: {
          round_id: activeRoundId,
          roundId: activeRoundId,
          level,
          multiplier: mult,
          payout: 0,
          status: "LOST",
        },
      };
    }

    try {
      const [bets] = await conn.execute(
        `SELECT id, status FROM stack_tower_bets WHERE round_id = ? AND user_id = ?`,
        [activeRoundId, userId]
      );

      if (bets && bets[0] && bets[0].status === 0) {
        await conn.execute(
          `UPDATE stack_tower_bets 
           SET status = 2, current_level = ?, multiplier = ?, win_amount = 0, updated_at = NOW() 
           WHERE id = ?`,
          [level, mult, bets[0].id]
        );
      }

      return {
        status: 200,
        success: true,
        message: "Game over - Round lost",
        data: {
          round_id: activeRoundId,
          roundId: activeRoundId,
          level,
          multiplier: mult,
          payout: 0,
          status: "LOST",
        },
      };
    } finally {
      conn.release();
    }
  }

  /**
   * Bet History for User
   */
  async getHistory({ userid, uid, user_id, limit = 20, offset = 0 }) {
    const rawUid = userid ?? uid ?? user_id;
    const userId = requiredInteger(rawUid, "userid");
    const lim = Math.max(1, Math.min(100, Number(limit) || 20));
    const off = Math.max(0, Number(offset) || 0);

    const conn = await this.getDbConnection();

    if (!conn) {
      const userBets = Array.from(memoryBets.values())
        .filter((b) => Number(b.user_id) === Number(userId))
        .sort((a, b) => b.id - a.id)
        .slice(off, off + lim)
        .map((b) => ({
          id: b.round_id,
          round_id: b.round_id,
          timestamp: new Date(b.created_at).getTime(),
          betAmount: Number(b.amount),
          bet_amount: Number(b.amount),
          difficulty: b.difficulty,
          level: b.current_level,
          multiplier: Number(b.multiplier),
          payout: Number(b.win_amount),
          profit: Number(b.win_amount) - Number(b.amount),
          status: b.status === 1 ? "CASHED_OUT" : b.status === 2 ? "LOST" : "PLAYING",
        }));

      return {
        status: 200,
        success: true,
        message: "Data found",
        data: userBets,
        results: userBets,
      };
    }

    try {
      const [rows] = await conn.execute(
        `SELECT id, round_id, difficulty, amount, current_level, multiplier, win_amount, status, created_at 
         FROM stack_tower_bets 
         WHERE user_id = ? 
         ORDER BY id DESC LIMIT ? OFFSET ?`,
        [userId, lim, off]
      );

      const data = (rows || []).map((r) => {
        const betAmt = Number(r.amount || 0);
        const winAmt = Number(r.win_amount || 0);
        return {
          id: r.round_id,
          round_id: r.round_id,
          timestamp: new Date(r.created_at).getTime(),
          betAmount: betAmt,
          bet_amount: betAmt,
          difficulty: r.difficulty || "MEDIUM",
          level: Number(r.current_level || 0),
          multiplier: Number(r.multiplier || 1.0),
          payout: winAmt,
          profit: Number((winAmt - betAmt).toFixed(2)),
          status: r.status === 1 ? "CASHED_OUT" : r.status === 2 ? "LOST" : "PLAYING",
        };
      });

      return {
        status: 200,
        success: true,
        message: data.length ? "Data found" : "No history found",
        data,
        results: data,
      };
    } finally {
      conn.release();
    }
  }

  /**
   * Game Configuration
   */
  async getConfig() {
    return {
      status: 200,
      success: true,
      data: {
        game_name: "Stack Tower",
        min_bet: 10,
        max_bet: 50000,
        quick_bets: [10, 50, 100, 500, 1000, 2000],
        difficulties: {
          EASY: {
            angular_speed: 2.2,
            max_swing_angle: 13.5,
            max_safe_offset: 24,
            multiplier_step: 0.12,
          },
          MEDIUM: {
            angular_speed: 2.8,
            max_swing_angle: 16.0,
            max_safe_offset: 20,
            multiplier_step: 0.18,
          },
          HARD: {
            angular_speed: 3.4,
            max_swing_angle: 18.5,
            max_safe_offset: 16,
            multiplier_step: 0.28,
          },
        },
      },
    };
  }
}

module.exports = { StackTowerService };

