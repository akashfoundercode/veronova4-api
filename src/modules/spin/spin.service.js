"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

function requiredInteger(value, name, min = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) throw new AppError(400, "VALIDATION_ERROR", `The ${name} field is invalid.`);
  return parsed;
}

function requiredAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0.1) throw new AppError(400, "INVALID_AMOUNT", "Bet amount must be at least 0.1.");
  return Number(amount.toFixed(2));
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

class SpinService {
  constructor(poolProvider = getPool) { this.poolProvider = poolProvider; }

  async placeBets({ user_id, bets }) {
    const userId = requiredInteger(user_id, "user_id");
    if (!Array.isArray(bets) || bets.length === 0) throw new AppError(400, "VALIDATION_ERROR", "A non-empty bets array is required.");
    const prepared = bets.map((bet) => ({
      gameId: requiredInteger(bet?.game_id, "game_id"),
      amount: requiredAmount(bet?.amount),
    }));
    const total = Number(prepared.reduce((sum, bet) => sum + bet.amount, 0).toFixed(2));
    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction(); started = true;
      const [users] = await connection.execute("SELECT id, wallet FROM users WHERE id = ? FOR UPDATE", [userId]);
      if (!users[0]) throw new AppError(400, "USER_NOT_FOUND", "User not found.");
      if (Number(users[0].wallet) < total) throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      const [periodRows] = await connection.execute("SELECT period_no FROM spin_betlogs ORDER BY id LIMIT 1 FOR UPDATE");
      const period = periodRows[0]?.period_no;
      if (period === undefined || period === null) throw new AppError(409, "ROUND_NOT_FOUND", "No active Spin period found.");

      for (const bet of prepared) {
        const [settings] = await connection.execute("SELECT multiplier FROM spin_game_settings WHERE game_id = ? LIMIT 1", [bet.gameId]);
        if (!settings[0] || !Number.isFinite(Number(settings[0].multiplier))) {
          throw new AppError(400, "INVALID_GAME_ID", "Spin game configuration was not found.");
        }
        await connection.execute(
          `INSERT INTO spin_bets (user_id, game_id, amount, period_no, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, bet.gameId, bet.amount, period],
        );
        const exposure = Number((bet.amount * Number(settings[0].multiplier)).toFixed(2));
        const [logs] = await connection.execute("SELECT id, game_id FROM spin_betlogs FOR UPDATE");
        for (const log of logs) {
          if (parseArray(log.game_id).map(Number).includes(bet.gameId)) {
            await connection.execute("UPDATE spin_betlogs SET amount = amount + ? WHERE id = ?", [exposure, log.id]);
          }
        }
      }
      await connection.execute("UPDATE users SET wallet = wallet - ? WHERE id = ?", [total, userId]);
      await connection.commit(); started = false;
      return { success: true, message: "Bet Accepted Successfully!" };
    } catch (error) {
      if (started) await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  async getHistory({ user_id, limit, offset = 0 }) {
    const userId = requiredInteger(user_id, "user_id");
    const rowLimit = requiredInteger(limit, "limit", 0);
    const rowOffset = requiredInteger(offset, "offset", 0);
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      `SELECT period_no, SUM(amount) AS amount, SUM(win_amount) AS win_amount
       FROM spin_bets WHERE user_id = ? GROUP BY period_no ORDER BY period_no DESC LIMIT ? OFFSET ?`,
      [userId, rowLimit, rowOffset],
    );
    const [[count]] = await pool.execute("SELECT COUNT(*) AS total FROM spin_bets WHERE user_id = ?", [userId]);
    return rows.length
      ? { message: "Data found", success: true, result_count: Number(count.total), data: rows }
      : { message: "No record found", success: false, data: [] };
  }

  async getResults(userId) {
    const id = requiredInteger(userId, "user_id");
    const pool = this.poolProvider();
    const [periods] = await pool.execute("SELECT period_no FROM spin_betlogs LIMIT 1");
    if (!periods[0]) throw new AppError(409, "ROUND_NOT_FOUND", "No active Spin period found.");
    const previousPeriod = Number(periods[0].period_no) - 1;
    const [[win]] = await pool.execute(
      "SELECT COALESCE(SUM(win_amount), 0) AS win_amount FROM spin_bets WHERE user_id = ? AND period_no = ?",
      [id, previousPeriod],
    );
    const [rows] = await pool.execute("SELECT * FROM spin_results ORDER BY id DESC LIMIT 10");
    rows.reverse();
    return rows.length
      ? { success: true, message: "Spin result latest data fetched successfully", win_amount: Number(win.win_amount), data: rows }
      : { success: false, message: "Spin result latest data not found" };
  }

  async settleRound() {
    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction(); started = true;
      const [logs] = await connection.execute("SELECT id, number, game_id, amount, period_no FROM spin_betlogs ORDER BY id FOR UPDATE");
      if (!logs.length) throw new AppError(409, "ROUND_NOT_FOUND", "No Spin bet logs found.");
      const period = logs[0].period_no;
      const [existing] = await connection.execute("SELECT id FROM spin_results WHERE period_no = ? LIMIT 1", [period]);
      if (existing.length) {
        await connection.commit(); started = false;
        return { status: 200, message: "Spin period already settled", period_no: period };
      }
      const [adminRows] = await connection.execute("SELECT number, jackpot FROM spin_admin_results WHERE period_no = ? ORDER BY id DESC LIMIT 1", [period]);
      let selectedLog;
      if (adminRows[0]) {
        selectedLog = logs.find((row) => Number(row.number) === Number(adminRows[0].number));
        if (!selectedLog) throw new AppError(422, "INVALID_RESULT", "Admin Spin result does not map to an outcome.");
      }
      if (!selectedLog) {
        const total = logs.reduce((sum, row) => sum + Number(row.amount), 0);
        const minAmount = Math.min(...logs.map((row) => Number(row.amount)));
        const candidates = total === 0
          ? logs.filter((row) => Number(row.amount) === minAmount)
          : total <= 1_000_000
            ? logs.filter((row) => Number(row.amount) <= 1_000_000)
            : logs.filter((row) => Number(row.amount) === minAmount);
        selectedLog = candidates[randomInt(candidates.length)];
      }
      if (!selectedLog) throw new AppError(422, "INVALID_RESULT", "Spin result does not map to a configured outcome.");
      const number = Number(selectedLog.number);
      const gameIds = parseArray(selectedLog.game_id).map(Number);
      const jackpot = Number(adminRows[0]?.jackpot ?? 1);
      if (!Number.isFinite(jackpot) || jackpot < 0) throw new AppError(422, "INVALID_JACKPOT", "Invalid jackpot multiplier.");

      const [bets] = await connection.execute("SELECT id, user_id, game_id, amount FROM spin_bets WHERE period_no = ? AND status = 0 FOR UPDATE", [period]);
      for (const bet of bets) {
        const won = gameIds.includes(Number(bet.game_id));
        const [settings] = await connection.execute("SELECT multiplier FROM spin_game_settings WHERE game_id = ? LIMIT 1", [bet.game_id]);
        if (!settings[0]) throw new AppError(409, "GAME_CONFIG_NOT_FOUND", "Spin payout configuration is missing.");
        const payout = won ? Number((Number(bet.amount) * Number(settings[0].multiplier) * jackpot).toFixed(2)) : 0;
        await connection.execute(
          "UPDATE spin_bets SET win_amount = ?, status = ?, win_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [payout, won ? 1 : 2, number, bet.id],
        );
        if (payout > 0) await connection.execute("UPDATE users SET wallet = wallet + ? WHERE id = ?", [payout, bet.user_id]);
      }
      const [indexRows] = await connection.execute("SELECT `index` FROM spin_index WHERE game_no = ? LIMIT 1", [number]);
      if (!indexRows[0]) throw new AppError(409, "SPIN_INDEX_NOT_FOUND", "Spin result index is missing.");
      const [colorRows] = await connection.execute(
        "SELECT game_id FROM spin_game_settings WHERE number = ? AND game_id IN (45, 46) LIMIT 1",
        [number],
      );
      const status = Number(colorRows[0]?.game_id) === 45 ? 0 : Number(colorRows[0]?.game_id) === 46 ? 1 : 2;
      await connection.execute(
        `INSERT INTO spin_results (period_no, win_number, win_index, jackpot, status, time)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [period, number, indexRows[0].index, jackpot, status],
      );
      await connection.execute("UPDATE spin_betlogs SET amount = 0, period_no = period_no + 1");
      await connection.commit(); started = false;
      return { status: 200, period_no: period, win_number: number, win_index: indexRows[0].index, jackpot, message: "Spin result generated successfully" };
    } catch (error) {
      if (started) await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  async getLatestBetLogs() {
    const [rows] = await this.poolProvider().execute("SELECT period_no FROM spin_betlogs ORDER BY updated_at DESC LIMIT 1");
    return rows[0] ?? null;
  }

  async getLatestBetLogsAmount() {
    const [rows] = await this.poolProvider().execute("SELECT number, amount FROM spin_betlogs WHERE number BETWEEN 1 AND 12");
    return rows;
  }

  async addAdminResult({ period_num, card_number, jackpot }) {
    const period = requiredInteger(period_num, "period_num");
    const number = requiredInteger(card_number, "card_number");
    const multiplier = jackpot === undefined || jackpot === "" ? null : Number(jackpot);
    if (multiplier !== null && (!Number.isFinite(multiplier) || multiplier < 0)) throw new AppError(400, "VALIDATION_ERROR", "jackpot must be non-negative.");
    await this.poolProvider().execute("INSERT INTO spin_admin_results (period_no, number, jackpot) VALUES (?, ?, ?)", [period, number, multiplier]);
    return { status: 200, message: "prediction stored successfully." };
  }
}

module.exports = { SpinService };
