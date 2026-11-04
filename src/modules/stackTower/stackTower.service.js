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
const armedObstacles = new Map();

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
        obstacle_dropped: 0,
        obstacle_type: null,
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
         (user_id, round_id, game_id, difficulty, amount, current_level, multiplier, win_amount, status, obstacle_dropped, obstacle_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 1.0000, 0.0000, 0, 0, NULL, NOW(), NOW())`,
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
      if (this.isObstacleArmed(activeRoundId, userId) || bet.obstacle_dropped || bet.status === 2) {
        this.clearArmedObstacle(activeRoundId, userId);
        bet.status = 2; // LOST
        bet.obstacle_dropped = 1;
        throw new AppError(400, "OBSTACLE_COLLAPSE", "An obstacle struck and toppled your tower! You cannot cash out.");
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
        `SELECT id, user_id, round_id, amount, status, obstacle_dropped 
         FROM stack_tower_bets 
         WHERE round_id = ? AND user_id = ? FOR UPDATE`,
        [activeRoundId, userId]
      );

      if (!bets || !bets[0]) {
        throw new AppError(404, "BET_NOT_FOUND", "Active bet not found for this round.");
      }

      const bet = bets[0];
      if (this.isObstacleArmed(activeRoundId, userId) || bet.obstacle_dropped || bet.status === 2) {
        this.clearArmedObstacle(activeRoundId, userId);
        try {
          await conn.execute("UPDATE stack_tower_bets SET status = 2, obstacle_dropped = 1, win_amount = 0 WHERE id = ?", [bet.id]);
        } catch (_) {}
        throw new AppError(400, "OBSTACLE_COLLAPSE", "An obstacle struck and toppled your tower! You cannot cash out.");
      }
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

  /**
   * Get Live / Active Stack Tower Bets & Players currently playing
   */
  async getActiveBets({ limit = 50, offset = 0, status, userid } = {}) {
    const lim = Math.max(1, Math.min(200, Number(limit) || 50));
    const off = Math.max(0, Number(offset) || 0);
    const targetStatus = status !== undefined && status !== null && status !== "" ? Number(status) : 0; // Default: 0 (PLAYING)
    const filterUid = userid ? Number(userid) : null;

    const conn = await this.getDbConnection();

    if (!conn) {
      let bets = Array.from(memoryBets.values());
      if (targetStatus !== -1 && !isNaN(targetStatus)) {
        bets = bets.filter((b) => Number(b.status) === targetStatus);
      }
      if (filterUid) {
        bets = bets.filter((b) => Number(b.user_id) === filterUid);
      }

      const total = bets.length;
      const data = bets
        .sort((a, b) => b.id - a.id)
        .slice(off, off + lim)
        .map((b) => {
          const amt = Number(b.amount || 0);
          const mult = Number(b.multiplier || 1.0);
          const currentWin = Number((amt * mult).toFixed(2));
          return {
            id: b.round_id,
            round_id: b.round_id,
            roundId: b.round_id,
            user_id: b.user_id,
            userid: b.user_id,
            uid: b.user_id,
            username: `User ${b.user_id}`,
            name: `Player ${b.user_id}`,
            mobile: "",
            amount: amt,
            bet_amount: amt,
            betAmount: amt,
            difficulty: b.difficulty || "MEDIUM",
            mode: b.difficulty || "MEDIUM",
            current_level: Number(b.current_level || 0),
            level: Number(b.current_level || 0),
            multiplier: mult,
            potential_payout: currentWin,
            win_amount: Number(b.win_amount || currentWin),
            current_win: currentWin,
            status: b.status === 0 ? "PLAYING" : b.status === 1 ? "CASHED_OUT" : "LOST",
            raw_status: b.status,
            obstacle_dropped: Boolean(b.obstacle_dropped),
            obstacle_type: b.obstacle_type || null,
            created_at: b.created_at,
            timestamp: new Date(b.created_at).getTime(),
          };
        });

      return {
        status: 200,
        success: true,
        message: data.length ? "Active bets found" : "No active players currently playing",
        data,
        results: data,
        total,
        count: data.length,
      };
    }

    try {
      let whereClauses = [];
      let whereParams = [];

      if (targetStatus !== -1 && !isNaN(targetStatus)) {
        whereClauses.push("b.status = ?");
        whereParams.push(targetStatus);
      }
      if (filterUid) {
        whereClauses.push("b.user_id = ?");
        whereParams.push(filterUid);
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

      const [countRows] = await conn.execute(
        `SELECT COUNT(*) AS total FROM stack_tower_bets b ${whereSql}`,
        whereParams
      );
      const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

      const [rows] = await conn.execute(
        `SELECT 
          b.id, b.user_id, b.round_id, b.difficulty, b.amount, b.current_level, 
          b.multiplier, b.win_amount, b.status, b.obstacle_dropped, b.obstacle_type, b.created_at,
          u.username, u.name, u.mobile, u.email
         FROM stack_tower_bets b
         LEFT JOIN users u ON b.user_id = u.id
         ${whereSql}
         ORDER BY b.id DESC
         LIMIT ? OFFSET ?`,
        [...whereParams, lim, off]
      );

      const data = (rows || []).map((r) => {
        const amt = Number(r.amount || 0);
        const mult = Number(r.multiplier || 1.0);
        const currentWin = Number((amt * mult).toFixed(2));
        const username = r.username || r.name || (r.mobile ? r.mobile.slice(-4) : `User ${r.user_id}`);
        return {
          id: r.round_id,
          round_id: r.round_id,
          roundId: r.round_id,
          user_id: r.user_id,
          userid: r.user_id,
          uid: r.user_id,
          username,
          name: r.name || username,
          mobile: r.mobile || "",
          amount: amt,
          bet_amount: amt,
          betAmount: amt,
          difficulty: r.difficulty || "MEDIUM",
          mode: r.difficulty || "MEDIUM",
          current_level: Number(r.current_level || 0),
          level: Number(r.current_level || 0),
          multiplier: mult,
          potential_payout: currentWin,
          win_amount: Number(r.win_amount || currentWin),
          current_win: currentWin,
          status: r.status === 0 ? "PLAYING" : r.status === 1 ? "CASHED_OUT" : "LOST",
          raw_status: r.status,
          obstacle_dropped: Boolean(r.obstacle_dropped),
          obstacle_type: r.obstacle_type || null,
          created_at: r.created_at,
          timestamp: new Date(r.created_at).getTime(),
        };
      });

      return {
        status: 200,
        success: true,
        message: data.length ? "Active bets found" : "No active players currently playing",
        data,
        results: data,
        total,
        count: data.length,
      };
    } finally {
      conn.release();
    }
  }

  /**
   * Helper methods for Armed Force Drop (topples on user's next block drop)
   */
  isObstacleArmed(roundId, userId) {
    if (roundId && armedObstacles.has(String(roundId))) return true;
    if (userId && armedObstacles.has(String(userId))) return true;
    if (armedObstacles.has("ALL")) return true;
    return false;
  }

  getArmedObstacle(roundId, userId) {
    if (roundId && armedObstacles.has(String(roundId))) {
      return armedObstacles.get(String(roundId));
    }
    if (userId && armedObstacles.has(String(userId))) {
      return armedObstacles.get(String(userId));
    }
    if (armedObstacles.has("ALL")) {
      return armedObstacles.get("ALL");
    }
    return null;
  }

  clearArmedObstacle(roundId, userId) {
    if (roundId) armedObstacles.delete(String(roundId));
    if (userId) armedObstacles.delete(String(userId));
    armedObstacles.delete("ALL");
  }

  /**
   * Trigger the armed drop when the user actually drops / stacks the next block!
   */
  async triggerArmedDrop({ round_id, roundId, userid, uid, user_id, level, multiplier } = {}) {
    const rawUid = userid ?? uid ?? user_id;
    const userId = rawUid !== undefined && rawUid !== null && rawUid !== "" ? Number(rawUid) : null;
    const activeRoundId = String(round_id || roundId || "").trim();
    const finalLevel = level !== undefined && level !== null ? Number(level) : 1;
    const mult = multiplier !== undefined && multiplier !== null ? Number(multiplier) : 1.0;

    const armed = this.getArmedObstacle(activeRoundId, userId) || { type: "WRECKING_BALL" };
    this.clearArmedObstacle(activeRoundId, userId);
    const type = String(armed.type || armed.obstacle_type || "WRECKING_BALL").toUpperCase();

    const conn = await this.getDbConnection();

    if (!conn) {
      let b = activeRoundId ? memoryBets.get(activeRoundId) : null;
      if (!b && userId) {
        for (const bet of Array.from(memoryBets.values()).reverse()) {
          if (Number(bet.user_id) === Number(userId) && bet.status === 0) {
            b = bet;
            break;
          }
        }
      }
      if (b) {
        b.status = 2; // LOST
        b.obstacle_dropped = 1;
        b.obstacle_type = type;
        b.current_level = finalLevel;
        b.win_amount = 0;
        b.updated_at = new Date();
      }

      return {
        status: 200,
        success: true,
        message: `Block dropped and obstacle (${type}) toppled the tower!`,
        data: {
          round_id: b ? b.round_id : activeRoundId,
          roundId: b ? b.round_id : activeRoundId,
          user_id: b ? b.user_id : userId,
          obstacle_dropped: true,
          obstacle_type: type,
          level_dropped: finalLevel,
          level: finalLevel,
          multiplier: mult,
          toppled: true,
          block_missed: true,
          status: "OBSTACLE_DROPPED",
          payout: 0,
        },
      };
    }

    try {
      let query = "";
      let params = [];
      if (activeRoundId) {
        query = "SELECT id, user_id, round_id FROM stack_tower_bets WHERE round_id = ? LIMIT 1";
        params = [activeRoundId];
      } else if (userId) {
        query = "SELECT id, user_id, round_id FROM stack_tower_bets WHERE user_id = ? AND status = 0 ORDER BY id DESC LIMIT 1";
        params = [userId];
      } else {
        query = "SELECT id, user_id, round_id FROM stack_tower_bets WHERE status = 0 ORDER BY id DESC LIMIT 1";
        params = [];
      }

      const [rows] = await conn.execute(query, params);
      const targetId = rows && rows[0] ? rows[0].id : null;
      const targetRound = rows && rows[0] ? rows[0].round_id : activeRoundId;
      const targetUser = rows && rows[0] ? rows[0].user_id : userId;

      if (targetId) {
        await conn.execute(
          `UPDATE stack_tower_bets 
           SET status = 2, obstacle_dropped = 1, obstacle_type = ?, current_level = ?, win_amount = 0, updated_at = NOW() 
           WHERE id = ?`,
          [type, finalLevel, targetId]
        );
      }

      return {
        status: 200,
        success: true,
        message: `Block dropped and obstacle (${type}) toppled the tower!`,
        data: {
          round_id: targetRound,
          roundId: targetRound,
          user_id: targetUser,
          obstacle_dropped: true,
          obstacle_type: type,
          level_dropped: finalLevel,
          level: finalLevel,
          multiplier: mult,
          toppled: true,
          block_missed: true,
          status: "OBSTACLE_DROPPED",
          payout: 0,
        },
      };
    } finally {
      conn.release();
    }
  }

  /**
   * Admin Force Obstacle Drop: By default, ARMS the obstacle to topple when user drops the next block!
   * (Pass immediate=true if you want it to drop instantly without waiting for user action)
   */
  async dropObstacle({ round_id, roundId, userid, uid, user_id, obstacle_type, obstacleType, level, reason, immediate } = {}) {
    const rawUid = userid ?? uid ?? user_id;
    const userId = rawUid !== undefined && rawUid !== null && rawUid !== "" ? Number(rawUid) : null;
    const activeRoundId = String(round_id || roundId || "").trim();
    const type = String(obstacle_type || obstacleType || "WRECKING_BALL").toUpperCase();
    const strikeLevel = level !== undefined && level !== null ? Number(level) : null;
    const isImmediate = immediate === true || immediate === "true" || immediate === 1;

    // By default: ARM for next block drop (as requested: "force next floor build karega tab girega, user giraega tabhi girjaega")
    if (!isImmediate) {
      const dropId = activeRoundId || makeOrderId();
      const armKey = activeRoundId || (userId ? String(userId) : "ALL");
      armedObstacles.set(armKey, {
        round_id: dropId,
        user_id: userId,
        type,
        level: strikeLevel,
        timestamp: Date.now(),
      });
      if (userId) {
        armedObstacles.set(String(userId), {
          round_id: dropId,
          user_id: userId,
          type,
          level: strikeLevel,
          timestamp: Date.now(),
        });
      }

      const armResponse = {
        status: 200,
        success: true,
        message: `Force stop armed! Obstacle (${type}) will topple the tower when user drops next block.`,
        data: {
          round_id: dropId,
          roundId: dropId,
          user_id: userId,
          armed: true,
          trigger: "NEXT_BLOCK",
          obstacle_type: type,
          status: "ARMED_FOR_NEXT_BLOCK",
        },
      };

      try {
        const { getStackTowerSocket } = require("./stackTower.socket");
        const socketService = getStackTowerSocket();
        if (socketService) {
          socketService.broadcastObstacleArmed(armResponse.data);
        }
      } catch (_) {}

      return armResponse;
    }

    const conn = await this.getDbConnection();

    if (!conn) {
      let targetBet = null;
      if (activeRoundId) {
        targetBet = memoryBets.get(activeRoundId);
      } else if (userId) {
        for (const b of Array.from(memoryBets.values()).reverse()) {
          if (Number(b.user_id) === Number(userId) && b.status === 0) {
            targetBet = b;
            break;
          }
        }
      } else {
        for (const b of Array.from(memoryBets.values()).reverse()) {
          if (b.status === 0) {
            targetBet = b;
            break;
          }
        }
      }

      if (!targetBet) {
        const dropId = activeRoundId || makeOrderId();
        armedObstacles.set(userId ? String(userId) : "ALL", {
          type,
          level: strikeLevel || 1,
          timestamp: Date.now(),
        });

        const dropResponse = {
          status: 200,
          success: true,
          message: `Obstacle (${type}) dropped successfully! Broadcasted to players.`,
          data: {
            round_id: dropId,
            roundId: dropId,
            user_id: userId || null,
            obstacle_dropped: true,
            obstacle_type: type,
            level_dropped: strikeLevel || 1,
            status: "OBSTACLE_DROPPED",
            payout: 0,
            armed: true,
          },
        };

        try {
          const { getStackTowerSocket } = require("./stackTower.socket");
          const socketService = getStackTowerSocket();
          if (socketService) {
            socketService.broadcastObstacleDrop(dropResponse.data);
          }
        } catch (_) {}

        return dropResponse;
      }

      targetBet.status = 2; // LOST
      targetBet.obstacle_dropped = 1;
      targetBet.obstacle_type = type;
      targetBet.win_amount = 0;
      if (strikeLevel !== null) {
        targetBet.current_level = strikeLevel;
      }
      targetBet.updated_at = new Date();

      const dropResponse = {
        status: 200,
        success: true,
        message: `Obstacle (${type}) dropped successfully! Tower toppled.`,
        data: {
          round_id: targetBet.round_id,
          roundId: targetBet.round_id,
          user_id: targetBet.user_id,
          obstacle_dropped: true,
          obstacle_type: type,
          level_dropped: targetBet.current_level,
          status: "OBSTACLE_DROPPED",
          payout: 0,
        },
      };

      try {
        const { getStackTowerSocket } = require("./stackTower.socket");
        const socketService = getStackTowerSocket();
        if (socketService) {
          socketService.broadcastObstacleDrop(dropResponse.data);
        }
      } catch (_) {}

      return dropResponse;
    }

    try {
      let query = "";
      let params = [];

      if (activeRoundId) {
        query = "SELECT id, user_id, round_id, current_level, status, obstacle_dropped FROM stack_tower_bets WHERE round_id = ? LIMIT 1";
        params = [activeRoundId];
      } else if (userId) {
        query = "SELECT id, user_id, round_id, current_level, status, obstacle_dropped FROM stack_tower_bets WHERE user_id = ? AND status = 0 ORDER BY id DESC LIMIT 1";
        params = [userId];
      } else {
        query = "SELECT id, user_id, round_id, current_level, status, obstacle_dropped FROM stack_tower_bets WHERE status = 0 ORDER BY id DESC LIMIT 1";
        params = [];
      }

      const [rows] = await conn.execute(query, params);
      if (!rows || !rows[0]) {
        const dropId = activeRoundId || makeOrderId();
        armedObstacles.set(userId ? String(userId) : "ALL", {
          type,
          level: strikeLevel || 1,
          timestamp: Date.now(),
        });

        const dropResponse = {
          status: 200,
          success: true,
          message: `Obstacle (${type}) dropped successfully! Broadcasted to players.`,
          data: {
            round_id: dropId,
            roundId: dropId,
            user_id: userId || null,
            obstacle_dropped: true,
            obstacle_type: type,
            level_dropped: strikeLevel || 1,
            status: "OBSTACLE_DROPPED",
            payout: 0,
            armed: true,
          },
        };

        try {
          const { getStackTowerSocket } = require("./stackTower.socket");
          const socketService = getStackTowerSocket();
          if (socketService) {
            socketService.broadcastObstacleDrop(dropResponse.data);
          }
        } catch (_) {}

        return dropResponse;
      }

      const bet = rows[0];
      const finalLevel = strikeLevel !== null ? strikeLevel : Number(bet.current_level || 0);

      await conn.execute(
        `UPDATE stack_tower_bets 
         SET status = 2, obstacle_dropped = 1, obstacle_type = ?, current_level = ?, win_amount = 0, updated_at = NOW() 
         WHERE id = ?`,
        [type, finalLevel, bet.id]
      );

      const dropResponse = {
        status: 200,
        success: true,
        message: `Obstacle (${type}) dropped successfully! Tower toppled.`,
        data: {
          round_id: bet.round_id,
          roundId: bet.round_id,
          user_id: bet.user_id,
          obstacle_dropped: true,
          obstacle_type: type,
          level_dropped: finalLevel,
          status: "OBSTACLE_DROPPED",
          payout: 0,
        },
      };

      try {
        const { getStackTowerSocket } = require("./stackTower.socket");
        const socketService = getStackTowerSocket();
        if (socketService) {
          socketService.broadcastObstacleDrop(dropResponse.data);
        }
      } catch (_) {}

      return dropResponse;
    } finally {
      conn.release();
    }
  }

  /**
   * Check real-time status of a round (useful for frontend to check if obstacle was dropped)
   */
  async getRoundStatus({ round_id, roundId, userid, uid } = {}) {
    const activeRoundId = String(round_id || roundId || "").trim();
    const rawUid = userid ?? uid;
    const userId = rawUid !== undefined && rawUid !== null && rawUid !== "" ? Number(rawUid) : null;

    if (!activeRoundId && !userId) {
      throw new AppError(400, "VALIDATION_ERROR", "Either round_id or userid is required.");
    }

    const conn = await this.getDbConnection();

    if (!conn) {
      let b = null;
      if (activeRoundId) {
        b = memoryBets.get(activeRoundId);
      } else {
        for (const bet of Array.from(memoryBets.values()).reverse()) {
          if (Number(bet.user_id) === Number(userId)) {
            b = bet;
            break;
          }
        }
      }

      if (!b) {
        throw new AppError(404, "BET_NOT_FOUND", "Round not found.");
      }

      return {
        status: 200,
        success: true,
        data: {
          round_id: b.round_id,
          user_id: b.user_id,
          difficulty: b.difficulty,
          current_level: b.current_level,
          multiplier: Number(b.multiplier),
          amount: Number(b.amount),
          win_amount: Number(b.win_amount),
          status: b.obstacle_dropped ? "OBSTACLE_DROPPED" : b.status === 1 ? "CASHED_OUT" : b.status === 2 ? "LOST" : "PLAYING",
          obstacle_dropped: Boolean(b.obstacle_dropped),
          obstacle_type: b.obstacle_type || null,
        },
      };
    }

    try {
      let query = "";
      let params = [];
      if (activeRoundId) {
        query = "SELECT * FROM stack_tower_bets WHERE round_id = ? LIMIT 1";
        params = [activeRoundId];
      } else {
        query = "SELECT * FROM stack_tower_bets WHERE user_id = ? ORDER BY id DESC LIMIT 1";
        params = [userId];
      }

      const [rows] = await conn.execute(query, params);
      if (!rows || !rows[0]) {
        throw new AppError(404, "BET_NOT_FOUND", "Round not found.");
      }

      const b = rows[0];
      return {
        status: 200,
        success: true,
        data: {
          round_id: b.round_id,
          user_id: b.user_id,
          difficulty: b.difficulty,
          current_level: Number(b.current_level || 0),
          multiplier: Number(b.multiplier || 1.0),
          amount: Number(b.amount || 0),
          win_amount: Number(b.win_amount || 0),
          status: b.obstacle_dropped ? "OBSTACLE_DROPPED" : b.status === 1 ? "CASHED_OUT" : b.status === 2 ? "LOST" : "PLAYING",
          obstacle_dropped: Boolean(b.obstacle_dropped),
          obstacle_type: b.obstacle_type || null,
        },
      };
    } finally {
      conn.release();
    }
  }

  /**
   * Frontend User Stats: Modes breakdown & Tower build height
   */
  async getUserStats({ userid, uid, user_id } = {}) {
    const rawUid = userid ?? uid ?? user_id;
    const userId = requiredInteger(rawUid, "userid");

    const MODES = ["EASY", "MEDIUM", "HARD"];
    const initModes = () => {
      const m = {};
      for (const mode of MODES) {
        m[mode] = {
          mode,
          total_bets: 0,
          total_wagered: 0,
          total_won: 0,
          net_profit: 0,
          highest_tower_built: 0,
          avg_tower_height: 0,
          cashed_out: 0,
          lost: 0,
          win_rate: "0.00%",
        };
      }
      return m;
    };

    const conn = await this.getDbConnection();

    if (!conn) {
      const userBets = Array.from(memoryBets.values()).filter(
        (b) => Number(b.user_id) === Number(userId)
      );

      const modes = initModes();
      let totalBets = 0;
      let totalWagered = 0;
      let totalWon = 0;
      let highestTowerGlobal = 0;
      let sumLevels = 0;
      let totalCashedOut = 0;

      for (const b of userBets) {
        const diff = (b.difficulty || "MEDIUM").toUpperCase();
        if (!modes[diff]) {
          modes[diff] = {
            mode: diff,
            total_bets: 0,
            total_wagered: 0,
            total_won: 0,
            net_profit: 0,
            highest_tower_built: 0,
            avg_tower_height: 0,
            cashed_out: 0,
            lost: 0,
            win_rate: "0.00%",
          };
        }

        const amt = Number(b.amount || 0);
        const win = Number(b.win_amount || 0);
        const lvl = Number(b.current_level || 0);

        totalBets += 1;
        totalWagered += amt;
        totalWon += win;
        sumLevels += lvl;
        if (lvl > highestTowerGlobal) highestTowerGlobal = lvl;

        modes[diff].total_bets += 1;
        modes[diff].total_wagered += amt;
        modes[diff].total_won += win;
        if (lvl > modes[diff].highest_tower_built) {
          modes[diff].highest_tower_built = lvl;
        }

        if (b.status === 1) {
          totalCashedOut += 1;
          modes[diff].cashed_out += 1;
        } else if (b.status === 2) {
          modes[diff].lost += 1;
        }
      }

      for (const mode of Object.keys(modes)) {
        const m = modes[mode];
        m.total_wagered = Number(m.total_wagered.toFixed(2));
        m.total_won = Number(m.total_won.toFixed(2));
        m.net_profit = Number((m.total_won - m.total_wagered).toFixed(2));
        m.avg_tower_height = m.total_bets > 0 ? Number((m.highest_tower_built / m.total_bets).toFixed(2)) : 0;
        m.win_rate = m.total_bets > 0 ? `${((m.cashed_out / m.total_bets) * 100).toFixed(2)}%` : "0.00%";
      }

      return {
        status: 200,
        success: true,
        message: "User Stack Tower statistics fetched successfully",
        data: {
          user_id: userId,
          total_bets: totalBets,
          total_wagered: Number(totalWagered.toFixed(2)),
          total_won: Number(totalWon.toFixed(2)),
          net_profit: Number((totalWon - totalWagered).toFixed(2)),
          highest_tower_built: highestTowerGlobal,
          total_towers_built: totalCashedOut,
          average_tower_height: totalBets > 0 ? Number((sumLevels / totalBets).toFixed(2)) : 0,
          win_rate: totalBets > 0 ? `${((totalCashedOut / totalBets) * 100).toFixed(2)}%` : "0.00%",
          modes,
        },
      };
    }

    try {
      const [rows] = await conn.execute(
        `SELECT 
          difficulty,
          COUNT(*) AS total_bets,
          COALESCE(SUM(amount), 0) AS total_wagered,
          COALESCE(SUM(win_amount), 0) AS total_won,
          COALESCE(MAX(current_level), 0) AS highest_tower_built,
          COALESCE(AVG(current_level), 0) AS avg_tower_height,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS cashed_out,
          SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS lost
         FROM stack_tower_bets 
         WHERE user_id = ?
         GROUP BY difficulty`,
        [userId]
      );

      const modes = initModes();
      let totalBets = 0;
      let totalWagered = 0;
      let totalWon = 0;
      let highestTowerGlobal = 0;
      let totalCashedOut = 0;
      let sumLevelsTimesBets = 0;

      for (const r of rows || []) {
        const diff = String(r.difficulty || "MEDIUM").toUpperCase();
        const bets = Number(r.total_bets || 0);
        const wagered = Number(r.total_wagered || 0);
        const won = Number(r.total_won || 0);
        const maxLevel = Number(r.highest_tower_built || 0);
        const avgLevel = Number(r.avg_tower_height || 0);
        const cashedOut = Number(r.cashed_out || 0);
        const lost = Number(r.lost || 0);

        totalBets += bets;
        totalWagered += wagered;
        totalWon += won;
        if (maxLevel > highestTowerGlobal) highestTowerGlobal = maxLevel;
        totalCashedOut += cashedOut;
        sumLevelsTimesBets += avgLevel * bets;

        modes[diff] = {
          mode: diff,
          total_bets: bets,
          total_wagered: Number(wagered.toFixed(2)),
          total_won: Number(won.toFixed(2)),
          net_profit: Number((won - wagered).toFixed(2)),
          highest_tower_built: maxLevel,
          avg_tower_height: Number(avgLevel.toFixed(2)),
          cashed_out: cashedOut,
          lost: lost,
          win_rate: bets > 0 ? `${((cashedOut / bets) * 100).toFixed(2)}%` : "0.00%",
        };
      }

      return {
        status: 200,
        success: true,
        message: "User Stack Tower statistics fetched successfully",
        data: {
          user_id: userId,
          total_bets: totalBets,
          total_wagered: Number(totalWagered.toFixed(2)),
          total_won: Number(totalWon.toFixed(2)),
          net_profit: Number((totalWon - totalWagered).toFixed(2)),
          highest_tower_built: highestTowerGlobal,
          total_towers_built: totalCashedOut,
          average_tower_height: totalBets > 0 ? Number((sumLevelsTimesBets / totalBets).toFixed(2)) : 0,
          win_rate: totalBets > 0 ? `${((totalCashedOut / totalBets) * 100).toFixed(2)}%` : "0.00%",
          modes,
        },
      };
    } finally {
      conn.release();
    }
  }

  /**
   * Admin Panel Stats: Global totals, modes breakdown, and top builders
   */
  async getAdminStats({ userid, uid, user_id, difficulty, mode, limit = 20, offset = 0 } = {}) {
    const rawUid = userid ?? uid ?? user_id;
    const filterUserId = rawUid !== undefined && rawUid !== null && rawUid !== "" ? Number(rawUid) : null;
    const filterDiff = difficulty || mode ? String(difficulty || mode).toUpperCase() : null;
    const lim = Math.max(1, Math.min(100, Number(limit) || 20));
    const off = Math.max(0, Number(offset) || 0);

    const MODES = ["EASY", "MEDIUM", "HARD"];
    const initModes = () => {
      const m = {};
      for (const mName of MODES) {
        m[mName] = {
          mode: mName,
          total_bets: 0,
          total_wagered: 0,
          total_payout: 0,
          house_profit: 0,
          highest_tower_built: 0,
          avg_tower_height: 0,
          win_count: 0,
          loss_count: 0,
        };
      }
      return m;
    };

    const conn = await this.getDbConnection();

    if (!conn) {
      let allBets = Array.from(memoryBets.values());
      if (filterUserId) {
        allBets = allBets.filter((b) => Number(b.user_id) === filterUserId);
      }
      if (filterDiff) {
        allBets = allBets.filter((b) => String(b.difficulty).toUpperCase() === filterDiff);
      }

      const distinctUsers = new Set();
      let totalBets = 0;
      let totalWagered = 0;
      let totalPayout = 0;
      let globalMaxLevel = 0;
      let sumLevels = 0;
      let obstacleDrops = 0;

      const modes = initModes();
      const userAggregate = new Map();

      for (const b of allBets) {
        const uId = Number(b.user_id);
        distinctUsers.add(uId);

        const amt = Number(b.amount || 0);
        const win = Number(b.win_amount || 0);
        const lvl = Number(b.current_level || 0);
        const diff = (b.difficulty || "MEDIUM").toUpperCase();

        totalBets += 1;
        totalWagered += amt;
        totalPayout += win;
        sumLevels += lvl;
        if (lvl > globalMaxLevel) globalMaxLevel = lvl;
        if (b.obstacle_dropped) obstacleDrops += 1;

        if (!modes[diff]) {
          modes[diff] = {
            mode: diff,
            total_bets: 0,
            total_wagered: 0,
            total_payout: 0,
            house_profit: 0,
            highest_tower_built: 0,
            avg_tower_height: 0,
            win_count: 0,
            loss_count: 0,
          };
        }

        modes[diff].total_bets += 1;
        modes[diff].total_wagered += amt;
        modes[diff].total_payout += win;
        if (lvl > modes[diff].highest_tower_built) {
          modes[diff].highest_tower_built = lvl;
        }
        if (b.status === 1) modes[diff].win_count += 1;
        if (b.status === 2) modes[diff].loss_count += 1;

        const uStat = userAggregate.get(uId) || {
          user_id: uId,
          total_bets: 0,
          total_wagered: 0,
          total_payout: 0,
          highest_tower_built: 0,
          modes: {},
        };
        uStat.total_bets += 1;
        uStat.total_wagered += amt;
        uStat.total_payout += win;
        if (lvl > uStat.highest_tower_built) uStat.highest_tower_built = lvl;
        uStat.modes[diff] = (uStat.modes[diff] || 0) + 1;
        userAggregate.set(uId, uStat);
      }

      const modesBreakdown = Object.values(modes).map((m) => {
        const wagered = Number(m.total_wagered.toFixed(2));
        const payout = Number(m.total_payout.toFixed(2));
        return {
          ...m,
          total_wagered: wagered,
          total_payout: payout,
          house_profit: Number((wagered - payout).toFixed(2)),
          avg_tower_height: m.total_bets > 0 ? Number((m.highest_tower_built / m.total_bets).toFixed(2)) : 0,
        };
      });

      const topTowerBuilders = Array.from(userAggregate.values())
        .map((u) => {
          let favoriteMode = "MEDIUM";
          let maxCount = -1;
          for (const [mName, cnt] of Object.entries(u.modes)) {
            if (cnt > maxCount) {
              maxCount = cnt;
              favoriteMode = mName;
            }
          }
          return {
            user_id: u.user_id,
            total_bets: u.total_bets,
            total_wagered: Number(u.total_wagered.toFixed(2)),
            total_payout: Number(u.total_payout.toFixed(2)),
            highest_tower_built: u.highest_tower_built,
            favorite_mode: favoriteMode,
          };
        })
        .sort((a, b) => b.highest_tower_built - a.highest_tower_built || b.total_bets - a.total_bets)
        .slice(off, off + lim);

      return {
        status: 200,
        success: true,
        message: "Admin Stack Tower statistics fetched successfully",
        data: {
          overall: {
            total_players: distinctUsers.size,
            total_bets: totalBets,
            total_wagered: Number(totalWagered.toFixed(2)),
            total_payout: Number(totalPayout.toFixed(2)),
            house_profit: Number((totalWagered - totalPayout).toFixed(2)),
            highest_tower_built_global: globalMaxLevel,
            average_tower_height_global: totalBets > 0 ? Number((sumLevels / totalBets).toFixed(2)) : 0,
            total_obstacle_drops: obstacleDrops,
          },
          modes_breakdown: modesBreakdown,
          top_tower_builders: topTowerBuilders,
        },
      };
    }

    try {
      let whereClauses = [];
      let whereParams = [];

      if (filterUserId) {
        whereClauses.push("user_id = ?");
        whereParams.push(filterUserId);
      }
      if (filterDiff) {
        whereClauses.push("difficulty = ?");
        whereParams.push(filterDiff);
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

      const [overallRows] = await conn.execute(
        `SELECT 
          COUNT(DISTINCT user_id) AS total_players,
          COUNT(*) AS total_bets,
          COALESCE(SUM(amount), 0) AS total_wagered,
          COALESCE(SUM(win_amount), 0) AS total_payout,
          COALESCE(MAX(current_level), 0) AS highest_tower_built_global,
          COALESCE(AVG(current_level), 0) AS average_tower_height_global,
          COALESCE(SUM(CASE WHEN obstacle_dropped = 1 THEN 1 ELSE 0 END), 0) AS total_obstacle_drops
         FROM stack_tower_bets ${whereSql}`,
        whereParams
      );

      const o = overallRows[0] || {};
      const totWagered = Number(o.total_wagered || 0);
      const totPayout = Number(o.total_payout || 0);

      const [modeRows] = await conn.execute(
        `SELECT 
          difficulty AS mode,
          COUNT(*) AS total_bets,
          COALESCE(SUM(amount), 0) AS total_wagered,
          COALESCE(SUM(win_amount), 0) AS total_payout,
          COALESCE(MAX(current_level), 0) AS highest_tower_built,
          COALESCE(AVG(current_level), 0) AS avg_tower_height,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS win_count,
          SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS loss_count
         FROM stack_tower_bets ${whereSql}
         GROUP BY difficulty`,
        whereParams
      );

      const modesMap = initModes();
      for (const m of modeRows || []) {
        const diff = String(m.mode || "MEDIUM").toUpperCase();
        const wagered = Number(m.total_wagered || 0);
        const payout = Number(m.total_payout || 0);
        modesMap[diff] = {
          mode: diff,
          total_bets: Number(m.total_bets || 0),
          total_wagered: Number(wagered.toFixed(2)),
          total_payout: Number(payout.toFixed(2)),
          house_profit: Number((wagered - payout).toFixed(2)),
          highest_tower_built: Number(m.highest_tower_built || 0),
          avg_tower_height: Number(Number(m.avg_tower_height || 0).toFixed(2)),
          win_count: Number(m.win_count || 0),
          loss_count: Number(m.loss_count || 0),
        };
      }

      const [topRows] = await conn.execute(
        `SELECT 
          user_id,
          COUNT(*) AS total_bets,
          COALESCE(SUM(amount), 0) AS total_wagered,
          COALESCE(SUM(win_amount), 0) AS total_payout,
          COALESCE(MAX(current_level), 0) AS highest_tower_built
         FROM stack_tower_bets ${whereSql}
         GROUP BY user_id
         ORDER BY highest_tower_built DESC, total_bets DESC
         LIMIT ? OFFSET ?`,
        [...whereParams, lim, off]
      );

      const topTowerBuilders = (topRows || []).map((t) => ({
        user_id: t.user_id,
        total_bets: Number(t.total_bets || 0),
        total_wagered: Number(Number(t.total_wagered || 0).toFixed(2)),
        total_payout: Number(Number(t.total_payout || 0).toFixed(2)),
        highest_tower_built: Number(t.highest_tower_built || 0),
      }));

      return {
        status: 200,
        success: true,
        message: "Admin Stack Tower statistics fetched successfully",
        data: {
          overall: {
            total_players: Number(o.total_players || 0),
            total_bets: Number(o.total_bets || 0),
            total_wagered: Number(totWagered.toFixed(2)),
            total_payout: Number(totPayout.toFixed(2)),
            house_profit: Number((totWagered - totPayout).toFixed(2)),
            highest_tower_built_global: Number(o.highest_tower_built_global || 0),
            average_tower_height_global: Number(Number(o.average_tower_height_global || 0).toFixed(2)),
            total_obstacle_drops: Number(o.total_obstacle_drops || 0),
          },
          modes_breakdown: Object.values(modesMap),
          top_tower_builders: topTowerBuilders,
        },
      };
    } finally {
      conn.release();
    }
  }
}

module.exports = { StackTowerService };

