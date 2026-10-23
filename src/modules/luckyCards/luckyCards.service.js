"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

const VARIANTS = Object.freeze({
  12: Object.freeze({
    prefix: "lucky12", resultKey: "result_12", indexColumns: ["card_index", "color_index"],
  }),
  16: Object.freeze({
    prefix: "lucky16", resultKey: "result_16", indexColumns: ["card_index", "color_index"],
  }),
});

function variantFor(size) {
  const variant = VARIANTS[Number(size)];
  if (!variant) throw new AppError(400, "INVALID_GAME", "Lucky game must be 12 or 16.");
  return variant;
}

function integer(value, field, min = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is invalid.`);
  return parsed;
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

class LuckyCardsService {
  constructor(size, poolProvider = getPool) {
    this.size = Number(size);
    this.variant = variantFor(this.size);
    this.poolProvider = poolProvider;
  }

  table(name) {
    const tableName = name === "admin_winner_result"
      ? `${this.variant.prefix}admin_winner_result`
      : `${this.variant.prefix}_${name}`;
    return `\`${tableName}\``;
  }

  async placeBets({ user_id, bets }) {
    const userId = integer(user_id, "user_id");
    if (!Array.isArray(bets) || bets.length === 0) throw new AppError(400, "VALIDATION_ERROR", "A non-empty bets array is required.");
    const prepared = bets.map((bet) => {
      const gameId = integer(bet?.game_id, "game_id");
      const amount = Number(bet?.amount);
      if (!Number.isFinite(amount) || amount < 0.1) throw new AppError(400, "INVALID_AMOUNT", "Bet amount must be at least 0.1.");
      return { gameId, amount: Number(amount.toFixed(2)) };
    });
    const total = Number(prepared.reduce((sum, bet) => sum + bet.amount, 0).toFixed(2));
    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction(); started = true;
      const [users] = await connection.execute("SELECT id, wallet FROM users WHERE id = ? FOR UPDATE", [userId]);
      if (!users[0]) throw new AppError(400, "USER_NOT_FOUND", "User not found.");
      if (Number(users[0].wallet) < total) throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      const [periodRows] = await connection.execute(`SELECT period_no FROM ${this.table("betlogs")} ORDER BY id LIMIT 1 FOR UPDATE`);
      const period = periodRows[0]?.period_no;
      if (period === undefined || period === null) throw new AppError(409, "ROUND_NOT_FOUND", "No active Lucky period found.");
      const [logs] = await connection.execute(`SELECT id, game_id FROM ${this.table("betlogs")} FOR UPDATE`);

      for (const bet of prepared) {
        const [settings] = await connection.execute(`SELECT multiplier FROM ${this.table("game_settings")} WHERE game_id = ? LIMIT 1`, [bet.gameId]);
        if (!settings[0] || !Number.isFinite(Number(settings[0].multiplier))) throw new AppError(400, "INVALID_GAME_ID", "Lucky game option was not found.");
        await connection.execute(
          `INSERT INTO ${this.table("bets")} (user_id, game_id, amount, period_no, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, bet.gameId, bet.amount, period],
        );
        const exposure = Number((bet.amount * Number(settings[0].multiplier)).toFixed(2));
        for (const log of logs) {
          if (parseArray(log.game_id).map(Number).includes(bet.gameId)) {
            await connection.execute(`UPDATE ${this.table("betlogs")} SET amount = amount + ? WHERE id = ?`, [exposure, log.id]);
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
    const userId = integer(user_id, "user_id");
    const rowLimit = integer(limit, "limit", 0);
    const rowOffset = integer(offset, "offset", 0);
    const [rows] = await this.poolProvider().execute(
      `SELECT period_no, SUM(amount) AS amount, SUM(win_amount) AS win_amount
       FROM ${this.table("bets")} WHERE user_id = ? GROUP BY period_no ORDER BY period_no DESC LIMIT ? OFFSET ?`,
      [userId, rowLimit, rowOffset],
    );
    const [[count]] = await this.poolProvider().execute(`SELECT COUNT(*) AS total FROM ${this.table("bets")} WHERE user_id = ?`, [userId]);
    return rows.length
      ? { message: "Data found", success: true, result_count: Number(count.total), data: rows }
      : { message: "No record found", success: false, data: [] };
  }

  async getResults(userId) {
    const id = integer(userId, "user_id");
    const [periods] = await this.poolProvider().execute(`SELECT period_no FROM ${this.table("betlogs")} LIMIT 1`);
    if (!periods[0]) throw new AppError(409, "ROUND_NOT_FOUND", "No active Lucky period found.");
    const previousPeriod = Number(periods[0].period_no) - 1;
    const [[win]] = await this.poolProvider().execute(
      `SELECT COALESCE(SUM(win_amount), 0) AS win_amount FROM ${this.table("bets")} WHERE user_id = ? AND period_no = ?`,
      [id, previousPeriod],
    );
    const [results] = await this.poolProvider().execute(`SELECT * FROM ${this.table("results")} ORDER BY id DESC LIMIT 10`);
    return results.length
      ? { success: true, message: `Lucky${this.size} result latest data fetched successfully`, win_amount: Number(win.win_amount), [this.variant.resultKey]: results }
      : { success: false, message: `Lucky${this.size} result latest data not found` };
  }

  async settleRound() {
    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction(); started = true;
      const [logs] = await connection.execute(`SELECT id, number, game_id, amount, period_no FROM ${this.table("betlogs")} ORDER BY id FOR UPDATE`);
      if (!logs.length) throw new AppError(409, "ROUND_NOT_FOUND", "No Lucky bet logs found.");
      const period = logs[0].period_no;
      const [existing] = await connection.execute(`SELECT id FROM ${this.table("results")} WHERE period_no = ? LIMIT 1`, [period]);
      if (existing.length) {
        await connection.commit(); started = false;
        return { status: 200, message: `Lucky${this.size} period already settled`, period_no: period };
      }
      const [adminRows] = await connection.execute(`SELECT number, jackpot FROM ${this.table("admin_winner_result")} WHERE period_no = ? ORDER BY id DESC LIMIT 1`, [period]);
      let selectedLog;
      if (adminRows[0]) {
        selectedLog = logs.find((row) => Number(row.number) === Number(adminRows[0].number));
        if (!selectedLog) throw new AppError(422, "INVALID_RESULT", "Admin result does not map to a Lucky outcome.");
      } else {
        const total = logs.reduce((sum, row) => sum + Number(row.amount), 0);
        const min = Math.min(...logs.map((row) => Number(row.amount)));
        const options = total === 0 ? logs.filter((row) => Number(row.amount) === min)
          : total <= 1_000_000 ? logs.filter((row) => Number(row.amount) <= 1_000_000)
            : logs.filter((row) => Number(row.amount) === min);
        selectedLog = options[randomInt(options.length)];
      }
      const number = Number(selectedLog.number);
      const winningGameIds = parseArray(selectedLog.game_id).map(Number);
      const jackpot = Number(adminRows[0]?.jackpot ?? 1);
      if (!Number.isFinite(jackpot) || jackpot < 0) throw new AppError(422, "INVALID_JACKPOT", "Invalid jackpot multiplier.");

      const [bets] = await connection.execute(`SELECT id, user_id, game_id, amount FROM ${this.table("bets")} WHERE period_no = ? AND status = 0 FOR UPDATE`, [period]);
      for (const bet of bets) {
        const [settings] = await connection.execute(`SELECT multiplier FROM ${this.table("game_settings")} WHERE game_id = ? LIMIT 1`, [bet.game_id]);
        if (!settings[0]) throw new AppError(409, "GAME_CONFIG_NOT_FOUND", "Lucky payout configuration is missing.");
        const won = winningGameIds.includes(Number(bet.game_id));
        const payout = won ? Number((Number(bet.amount) * Number(settings[0].multiplier) * jackpot).toFixed(2)) : 0;
        await connection.execute(`UPDATE ${this.table("bets")} SET win_amount = ?, win_number = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [payout, number, won ? 1 : 2, bet.id]);
        if (payout > 0) await connection.execute("UPDATE users SET wallet = wallet + ? WHERE id = ?", [payout, bet.user_id]);
      }
      const [indices] = await connection.execute(`SELECT card_index, color_index FROM ${this.table("index")} WHERE game_no = ? LIMIT 1`, [number]);
      if (!indices[0]) throw new AppError(409, "RESULT_INDEX_NOT_FOUND", "Lucky result index is missing.");
      const [colors] = await connection.execute(`SELECT game_id FROM ${this.table("game_settings")} WHERE number = ? AND game_id IN (45, 46) LIMIT 1`, [number]);
      const status = Number(colors[0]?.game_id) === 45 ? 0 : Number(colors[0]?.game_id) === 46 ? 1 : 2;
      await connection.execute(`INSERT INTO ${this.table("results")} (period_no, win_number, card_index, color_index, jackpot, status, time) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [period, number, indices[0].card_index, indices[0].color_index, jackpot, status]);
      await connection.execute(`UPDATE ${this.table("betlogs")} SET amount = 0, period_no = period_no + 1`);
      await connection.commit(); started = false;
      return { status: 200, period_no: period, win_number: number, jackpot, message: `Lucky${this.size} result generated successfully` };
    } catch (error) {
      if (started) await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  async getLatestBetLogs() {
    const [rows] = await this.poolProvider().execute(`SELECT period_no FROM ${this.table("betlogs")} ORDER BY updated_at DESC LIMIT 1`);
    return rows[0] ?? null;
  }

  async getLatestBetLogsAmount() {
    const [rows] = await this.poolProvider().execute(`SELECT number, amount FROM ${this.table("betlogs")} WHERE number BETWEEN 1 AND ?`, [this.size]);
    return rows;
  }

  async getAdminPanel() {
    const [logs] = await this.poolProvider().execute(`SELECT * FROM ${this.table("betlogs")}`);
    if (!logs.length) return { status: 200, amount: 0, bet_log: [] };
    const [[sum]] = await this.poolProvider().execute(`SELECT COALESCE(SUM(amount), 0) AS amount FROM ${this.table("bets")} WHERE period_no = ?`, [logs[0].period_no]);
    return { status: 200, amount: Number(sum.amount), bet_log: logs };
  }

  async addAdminResult({ period_no, card_number, jackpot }) {
    const period = integer(period_no, "period_no");
    const number = integer(card_number, "card_number");
    if (number > this.size) throw new AppError(400, "INVALID_RESULT", `Result must be between 1 and ${this.size}.`);
    const payoutMultiplier = jackpot === undefined || jackpot === "" ? null : Number(jackpot);
    if (payoutMultiplier !== null && (!Number.isFinite(payoutMultiplier) || payoutMultiplier < 0)) throw new AppError(400, "VALIDATION_ERROR", "jackpot must be non-negative.");
    await this.poolProvider().execute(`INSERT INTO ${this.table("admin_winner_result")} (number, period_no, jackpot) VALUES (?, ?, ?)`, [number, period, payoutMultiplier]);
    return { status: 200, message: `card_number ${number} inserted successfully.` };
  }
}

module.exports = { LuckyCardsService, VARIANTS };
