"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

function integer(value, field, min = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is invalid.`);
  }
  return parsed;
}

function riskName(value) {
  const names = { 1: "low", 2: "medium", 3: "high" };
  return names[Number(value)] ?? null;
}

function parseJson(value, fallback) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function randomDraw(random = randomInt) {
  const numbers = Array.from({ length: 40 }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i -= 1) {
    const j = random(0, i + 1);
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers.slice(0, 10).sort((a, b) => a - b);
}

class KenoService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async placeBet({ userid, game_id, risk_level, selected_numbers, bet_amount }) {
    const userId = integer(userid, "userid");
    const gameId = integer(game_id, "game_id");
    const riskLevel = integer(risk_level, "risk_level");
    if (!riskName(riskLevel)) {
      throw new AppError(400, "VALIDATION_ERROR", "risk_level must be 1, 2, or 3.");
    }
    const amount = Number(bet_amount);
    if (!Number.isFinite(amount) || amount < 0.1) {
      throw new AppError(400, "INVALID_AMOUNT", "Bet amount must be at least 0.1.");
    }
    if (!Array.isArray(selected_numbers) || selected_numbers.length < 1 || selected_numbers.length > 10) {
      throw new AppError(400, "VALIDATION_ERROR", "Select between 1 and 10 numbers.");
    }
    const selected = selected_numbers.map((value) => integer(value, "selected_numbers"));
    if (selected.some((value) => value > 40) || new Set(selected).size !== selected.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Numbers must be unique integers from 1 to 40.");
    }

    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction();
      started = true;
      const [userRows] = await connection.execute(
        "SELECT id, wallet FROM users WHERE id = ? FOR UPDATE",
        [userId],
      );
      if (!userRows[0]) throw new AppError(400, "USER_NOT_FOUND", "The selected userid is invalid.");
      if (Number(userRows[0].wallet) < amount) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      }
      const [periodRows] = await connection.execute(
        "SELECT games_no FROM betlogs WHERE game_id = ? ORDER BY id LIMIT 1 FOR UPDATE",
        [gameId],
      );
      const period = periodRows[0]?.games_no;
      if (period === undefined || period === null) {
        throw new AppError(409, "GAME_NUMBER_NOT_FOUND", "No active Keno period found.");
      }
      const [multiplierRows] = await connection.execute(
        "SELECT multipliers FROM keno_multipliers WHERE risk_level = ? AND selections = ? LIMIT 1",
        [riskName(riskLevel), selected.length],
      );
      if (!multiplierRows[0]) {
        throw new AppError(409, "MULTIPLIER_NOT_FOUND", "Keno multiplier configuration is missing.");
      }
      await connection.execute(
        `INSERT INTO keno_bet
          (userid, game_id, games_no, amount, selected_numbers, risk_level, win_amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, gameId, period, amount, JSON.stringify(selected), riskLevel],
      );
      await connection.execute("UPDATE users SET wallet = wallet - ? WHERE id = ?", [amount, userId]);
      await connection.commit();
      started = false;
      return { status: 200, message: "Bet successfully placed" };
    } catch (error) {
      if (started) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getMultipliers({ risk_level, selections }) {
    const riskLevel = riskName(risk_level);
    const count = integer(selections, "selections");
    if (!riskLevel || count > 10) throw new AppError(400, "VALIDATION_ERROR", "Invalid risk level or selection count.");
    const [rows] = await this.poolProvider().execute(
      "SELECT multipliers FROM keno_multipliers WHERE risk_level = ? AND selections = ? LIMIT 1",
      [riskLevel, count],
    );
    if (!rows[0]) return { status: false, message: "Multiplier configuration not found." };
    const multipliers = parseJson(rows[0].multipliers, null);
    if (!multipliers) throw new AppError(500, "INVALID_MULTIPLIER_DATA", "Keno multiplier data is invalid.");
    return { status: true, message: `Multiplier fetched successfully for ${riskLevel} risk level.`, multipliers };
  }

  async settleRound(gameId) {
    const id = integer(gameId, "game_id");
    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction();
      started = true;
      const [settings] = await connection.execute(
        "SELECT id FROM game_settings WHERE id = ? FOR UPDATE",
        [id],
      );
      if (!settings[0]) throw new AppError(400, "GAME_NOT_FOUND", "Invalid game ID.");
      const [periodRows] = await connection.execute(
        "SELECT games_no FROM betlogs WHERE game_id = ? ORDER BY id LIMIT 1 FOR UPDATE",
        [id],
      );
      const period = periodRows[0]?.games_no;
      if (period === undefined || period === null) throw new AppError(409, "ROUND_NOT_FOUND", "No game found in betlogs.");
      const [existing] = await connection.execute(
        "SELECT id, number FROM keno_bet_result WHERE game_id = ? AND games_no = ? LIMIT 1 FOR UPDATE",
        [id, period],
      );
      if (existing[0]) {
        await connection.commit();
        started = false;
        return { status: 200, message: "Keno round already settled", games_no: period, result: parseJson(existing[0].number, []) };
      }
      const [adminResults] = await connection.execute(
        "SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1",
        [String(period), id],
      );
      let result = adminResults[0] ? parseJson(adminResults[0].number, null) : null;
      if (result && (result.length !== 10 || result.some((number) => !Number.isInteger(Number(number)) || Number(number) < 1 || Number(number) > 40))) {
        throw new AppError(422, "INVALID_RESULT", "Admin Keno result must contain 10 numbers from 1 to 40.");
      }
      if (!result) result = randomDraw();
      result = [...new Set(result.map(Number))].sort((a, b) => a - b);
      if (result.length !== 10) throw new AppError(422, "INVALID_RESULT", "Keno result must contain 10 unique numbers.");

      await connection.execute(
        `INSERT INTO keno_bet_result (number, games_no, game_id, status, created_at, updated_at)
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [JSON.stringify(result), period, id],
      );
      const [bets] = await connection.execute(
        `SELECT id, userid, amount, selected_numbers, risk_level FROM keno_bet
         WHERE game_id = ? AND games_no = ? AND status = 0 FOR UPDATE`,
        [id, period],
      );
      for (const bet of bets) {
        const chosen = parseJson(bet.selected_numbers, []);
        const matched = chosen.filter((number) => result.includes(Number(number))).length;
        const [multiplierRows] = await connection.execute(
          "SELECT multipliers FROM keno_multipliers WHERE risk_level = ? AND selections = ? LIMIT 1",
          [riskName(bet.risk_level), chosen.length],
        );
        if (!multiplierRows[0]) throw new AppError(409, "MULTIPLIER_NOT_FOUND", "Keno multiplier configuration is missing.");
        const multiplierList = parseJson(multiplierRows[0].multipliers, []);
        const multiplier = Number(String(multiplierList[Math.max(0, matched - 1)] ?? "0").replace(/x$/i, ""));
        const winAmount = matched > 0 && Number.isFinite(multiplier)
          ? Number((Number(bet.amount) * multiplier).toFixed(2))
          : 0;
        await connection.execute(
          `UPDATE keno_bet SET number = ?, win_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [JSON.stringify(result), winAmount, winAmount > 0 ? 1 : 2, bet.id],
        );
        if (winAmount > 0) {
          await connection.execute(
            "UPDATE users SET wallet = wallet + ?, winning_wallet = winning_wallet + ? WHERE id = ?",
            [winAmount, winAmount, bet.userid],
          );
        }
      }
      await connection.execute(
        "UPDATE betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?",
        [id],
      );
      await connection.commit();
      started = false;
      return { status: 200, game_id: id, games_no: period, number: result, message: "Keno result generated successfully" };
    } catch (error) {
      if (started) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getResults({ game_id, limit, offset = 0, created_at }) {
    const gameId = integer(game_id, "game_id");
    const rowLimit = integer(limit, "limit");
    const rowOffset = integer(offset, "offset", 0);
    const conditions = ["r.game_id = ?"];
    const params = [gameId];
    if (created_at) { conditions.push("r.created_at >= ? AND r.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(created_at, created_at); }
    const [rows] = await this.poolProvider().execute(
      `SELECT r.*, vg.name AS game_name, vg.number AS game_number, vg.game_id AS game_gameid,
              gs.name AS game_setting_name
       FROM keno_bet_result r
       LEFT JOIN virtual_games vg ON r.game_id = vg.game_id AND r.number = vg.number
       JOIN game_settings gs ON r.game_id = gs.id
       WHERE ${conditions.join(" AND ")} ORDER BY r.id DESC LIMIT ? OFFSET ?`,
      [...params, rowLimit, rowOffset],
    );
    return { status: 200, message: "Data found", data: rows };
  }

  async getBetHistory({ userid, game_id, limit, offset = 0, created_at }) {
    const userId = integer(userid, "userid");
    const gameId = integer(game_id, "game_id");
    const rowLimit = integer(limit, "limit");
    const rowOffset = integer(offset, "offset", 0);
    const conditions = ["b.userid = ?", "b.game_id = ?"];
    const params = [userId, gameId];
    if (created_at) { conditions.push("DATE(b.created_at) = DATE(?)"); params.push(created_at); }
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      `SELECT DISTINCT b.*, gs.name AS game_name, vg.name AS name
       FROM keno_bet b LEFT JOIN game_settings gs ON gs.id = b.game_id
       LEFT JOIN virtual_games vg ON vg.game_id = b.game_id AND vg.number = b.number
       WHERE ${conditions.join(" AND ")} ORDER BY b.id DESC LIMIT ? OFFSET ?`,
      [...params, rowLimit, rowOffset],
    );
    const [[countRow]] = await pool.execute(
      "SELECT COUNT(*) AS total_bets FROM keno_bet WHERE userid = ? AND game_id = ?",
      [userId, gameId],
    );
    if (rows.length === 0) return { status: 400, message: "No Data found", data: [], total_bets: Number(countRow.total_bets) };
    return { status: 200, message: "Data found", total_bets: Number(countRow.total_bets), data: rows };
  }

  async getWinAmount({ userid, game_id, games_no }) {
    const userId = integer(userid, "userid");
    const gameId = integer(game_id, "game_id");
    const gameNo = integer(games_no, "games_no");
    const pool = this.poolProvider();
    const [results] = await pool.execute(
      "SELECT number FROM keno_bet_result WHERE game_id = ? AND games_no = ? LIMIT 1",
      [gameId, gameNo],
    );
    if (!results[0]) throw new AppError(400, "RESULT_NOT_FOUND", "Winning numbers not found.");
    const winning = parseJson(results[0].number, []);
    const [rows] = await pool.execute(
      `SELECT SUM(win_amount) AS total_amount, amount, games_no, game_id AS gameid, selected_numbers
       FROM keno_bet WHERE games_no = ? AND game_id = ? AND userid = ?
       GROUP BY games_no, game_id, selected_numbers, amount`,
      [gameNo, gameId, userId],
    );
    if (!rows[0]) throw new AppError(400, "BET_NOT_FOUND", "No record found.");
    const win = Number(rows[0].total_amount ?? 0);
    const selected = parseJson(rows[0].selected_numbers, []);
    return {
      message: "Successfully fetched win details", status: 200, win,
      amount: Number(rows[0].amount), games_no: rows[0].games_no,
      result: win > 0 ? "win" : "lose", gameid: rows[0].gameid,
      number: selected.filter((number) => winning.includes(Number(number))),
    };
  }
}

module.exports = { KenoService, randomDraw, riskName };
