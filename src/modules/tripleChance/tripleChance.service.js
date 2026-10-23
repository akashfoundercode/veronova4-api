"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

function int(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is invalid.`);
  return parsed;
}

class TripleChanceService {
  constructor(poolProvider = getPool) { this.poolProvider = poolProvider; }

  async placeBets({ user_id, bets }) {
    const userId = int(user_id, "user_id");
    if (!Array.isArray(bets) || !bets.length) throw new AppError(400, "VALIDATION_ERROR", "A non-empty bets array is required.");
    const parsed = bets.map((bet) => {
      const gameId = Number(bet?.game_id);
      if (!Number.isInteger(gameId) || gameId < 0 || gameId > 9) throw new AppError(400, "VALIDATION_ERROR", "game_id must be a digit from 0 to 9.");
      const wheel = int(bet?.wheel_no, "wheel_no");
      const amount = Number(bet?.amount);
      if (wheel > 3 || !Number.isFinite(amount) || amount < 1) throw new AppError(400, "VALIDATION_ERROR", "Each bet needs wheel_no 1-3 and amount at least 1.");
      return { gameId, wheel, amount: Number(amount.toFixed(2)) };
    });
    const total = Number(parsed.reduce((sum, bet) => sum + bet.amount, 0).toFixed(2));
    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction(); started = true;
      const [users] = await connection.execute("SELECT id, wallet FROM users WHERE id = ? FOR UPDATE", [userId]);
      if (!users[0]) throw new AppError(400, "USER_NOT_FOUND", "User not found.");
      if (Number(users[0].wallet) < total) throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      const [periodRows] = await connection.execute("SELECT games_no FROM triplechance_bet_logs ORDER BY id LIMIT 1 FOR UPDATE");
      const period = periodRows[0]?.games_no;
      if (period === undefined || period === null) throw new AppError(409, "ROUND_NOT_FOUND", "No Triple Chance period found.");
      const [logs] = await connection.execute("SELECT id, game_id FROM triplechance_bet_logs FOR UPDATE");
      for (const bet of parsed) {
        const [settings] = await connection.execute("SELECT multiplier FROM triplechance_game_settings WHERE game_id = ? LIMIT 1", [bet.gameId]);
        if (!settings[0]) throw new AppError(400, "INVALID_BET", "Triple Chance game option was not found.");
        await connection.execute(
          `INSERT INTO triplechance_bets (user_id, game_id, amount, wheel_no, games_no, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, bet.gameId, bet.amount, bet.wheel, period],
        );
        const exposure = Number((bet.amount * Number(settings[0].multiplier)).toFixed(2));
        for (const log of logs) {
          let ids = [];
          try { ids = JSON.parse(log.game_id); } catch { ids = []; }
          if ((Array.isArray(ids) ? ids : [ids]).map(Number).includes(bet.gameId)) {
            await connection.execute("UPDATE triplechance_bet_logs SET amount = amount + ? WHERE id = ?", [exposure, log.id]);
          }
        }
      }
      await connection.execute("UPDATE users SET wallet = wallet - ? WHERE id = ?", [total, userId]);
      await connection.commit(); started = false;
      return { status: 200, message: "Bet Accepted Successfully!" };
    } catch (error) {
      if (started) await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  async getHistory({ user_id, limit, offset = 0 }) {
    const userId = int(user_id, "user_id");
    const pageSize = Number(limit), pageOffset = Number(offset);
    if (!Number.isInteger(pageSize) || pageSize < 0 || !Number.isInteger(pageOffset) || pageOffset < 0) throw new AppError(400, "VALIDATION_ERROR", "limit and offset must be non-negative integers.");
    const pool = this.poolProvider();
    const [rows] = await pool.execute("SELECT * FROM triplechance_bets WHERE user_id = ? ORDER BY games_no DESC LIMIT ? OFFSET ?", [userId, pageSize, pageOffset]);
    const [[count]] = await pool.execute("SELECT COUNT(*) AS total FROM triplechance_bets");
    return rows.length
      ? { message: "data found", success: true, result_count: Number(count.total), history_triplechance: rows }
      : { message: "No record found", success: false, data: [] };
  }

  async getResults(userId) {
    const id = int(userId, "user_id");
    const [periods] = await this.poolProvider().execute("SELECT games_no FROM triplechance_bet_logs LIMIT 1");
    if (!periods[0]) throw new AppError(409, "ROUND_NOT_FOUND", "No Triple Chance period found.");
    const previous = Number(periods[0].games_no) - 1;
    const [[win]] = await this.poolProvider().execute("SELECT COALESCE(SUM(win_amount),0) AS win_amount FROM triplechance_bets WHERE user_id = ? AND games_no = ?", [id, previous]);
    const [wheelWins] = await this.poolProvider().execute(
      `SELECT SUM(CASE WHEN LENGTH(CAST(win_number AS CHAR)) = 1 THEN win_amount ELSE 0 END) AS first_wheel_amount,
              SUM(CASE WHEN LENGTH(CAST(win_number AS CHAR)) = 2 THEN win_amount ELSE 0 END) AS second_wheel_amount,
              SUM(CASE WHEN LENGTH(CAST(win_number AS CHAR)) = 3 THEN win_amount ELSE 0 END) AS third_wheel_amount
       FROM triplechance_bets WHERE games_no = ? AND user_id = ?`, [previous, id],
    );
    const [results] = await this.poolProvider().execute("SELECT * FROM triplechance_results ORDER BY id DESC LIMIT 10");
    return results.length
      ? { success: true, message: "TripleChance result latest data fetched successfully", win_amount: Number(win.win_amount), ...wheelWins[0], result_triple_chance: results }
      : { success: false, message: "TripleChance result latest data not found..!" };
  }

  async getWinAmount(userId) {
    const id = int(userId, "user_id");
    const [periods] = await this.poolProvider().execute("SELECT games_no FROM triplechance_bet_logs ORDER BY games_no LIMIT 1");
    if (!periods[0]) return { success: false, message: "No games found" };
    const period = periods[0].games_no;
    const [[total]] = await this.poolProvider().execute("SELECT COALESCE(SUM(win_amount),0) AS total_win_amount FROM triplechance_bets WHERE games_no = ? AND user_id = ?", [period, id]);
    const [[wheel]] = await this.poolProvider().execute(
      `SELECT SUM(CASE WHEN LENGTH(CAST(win_number AS CHAR)) = 1 THEN win_amount ELSE 0 END) AS first_wheel_amount,
              SUM(CASE WHEN LENGTH(CAST(win_number AS CHAR)) = 2 THEN win_amount ELSE 0 END) AS second_wheel_amount,
              SUM(CASE WHEN LENGTH(CAST(win_number AS CHAR)) = 3 THEN win_amount ELSE 0 END) AS third_wheel_amount
       FROM triplechance_bets WHERE games_no = ? AND user_id = ?`, [period, id],
    );
    return { message: "Successfully retrieved win data", success: true, total_win_amount: Number(total.total_win_amount), ...wheel };
  }

  async settleRound() {
    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction(); started = true;
      const [logs] = await connection.execute("SELECT id, number, game_id, amount, games_no FROM triplechance_bet_logs ORDER BY id FOR UPDATE");
      if (!logs.length) throw new AppError(409, "ROUND_NOT_FOUND", "No Triple Chance bet logs found.");
      const period = logs[0].games_no;
      const [existing] = await connection.execute("SELECT id FROM triplechance_results WHERE games_no = ? LIMIT 1", [period]);
      if (existing.length) { await connection.commit(); started = false; return { status: 200, message: "Period already settled", games_no: period }; }
      const [admin] = await connection.execute("SELECT number FROM triplechance_admin_winner_result WHERE game_no = ? ORDER BY id DESC LIMIT 1", [period]);
      const [[totals]] = await connection.execute("SELECT COALESCE(SUM(amount),0) AS total FROM triplechance_bets WHERE games_no = ?", [period]);
      const threshold = Number(totals.total) * 0.7;
      let candidates = admin[0] ? logs.filter((row) => Number(row.number) === Number(admin[0].number)) : logs.filter((row) => Number(row.amount) <= threshold);
      if (!candidates.length) candidates = logs;
      const selected = candidates[randomInt(candidates.length)];
      const digits = String(Math.abs(Number(selected.number))).padStart(3, "0").slice(-3).split("").map(Number);
      const [indexRows] = await connection.execute("SELECT `value`, `index` FROM triplechance_wheel_index WHERE `value` IN (?, ?, ?)", digits);
      const indexByValue = new Map(indexRows.map((row) => [Number(row.value), row.index]));
      if (digits.some((digit) => !indexByValue.has(digit))) throw new AppError(409, "WHEEL_INDEX_NOT_FOUND", "Triple Chance wheel index configuration is incomplete.");
      const [bets] = await connection.execute("SELECT id, user_id, game_id, amount, wheel_no FROM triplechance_bets WHERE games_no = ? AND status = 0 FOR UPDATE", [period]);
      const multipliers = { 1: 9, 2: 90, 3: 900 };
      for (const bet of bets) {
        const wheel = Number(bet.wheel_no);
        const won = digits.slice(0, wheel).includes(Number(bet.game_id));
        const winNumber = digits.slice(0, wheel).join("");
        const payout = won ? Number((Number(bet.amount) * multipliers[wheel]).toFixed(2)) : 0;
        await connection.execute("UPDATE triplechance_bets SET win_amount = ?, win_number = ?, status = ? WHERE id = ?", [payout, winNumber, won ? 1 : 2, bet.id]);
        if (payout > 0) await connection.execute("UPDATE users SET wallet = wallet + ? WHERE id = ?", [payout, bet.user_id]);
      }
      await connection.execute(
        `INSERT INTO triplechance_results (games_no, wheel1_index, wheel1_result, wheel2_index, wheel2_result, wheel3_index, wheel3_result, jackpot, status, time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)`,
        [period, indexByValue.get(digits[0]), digits[0], indexByValue.get(digits[1]), digits[1], indexByValue.get(digits[2]), digits[2]],
      );
      await connection.execute("UPDATE triplechance_bet_logs SET amount = 0, games_no = games_no + 1");
      await connection.commit(); started = false;
      return { status: 200, games_no: period, result: digits.join(""), message: "Triple Chance result generated successfully" };
    } catch (error) { if (started) await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
}

module.exports = { TripleChanceService };
