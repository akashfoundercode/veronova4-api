"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

function int(value, field, minimum = 1) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < minimum) throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is invalid.`);
  return n;
}

function amount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0.1) throw new AppError(400, "INVALID_AMOUNT", "Bet amount must be at least 0.1.");
  return Number(n.toFixed(2));
}

class HighLowService {
  constructor(poolProvider = getPool) { this.poolProvider = poolProvider; }

  async placeBet({ userid, game_id, number, card_number, amount: betAmount }) {
    const userId = int(userid, "userid"), gameId = int(game_id, "game_id");
    const selectedNumber = int(number, "number", 0), cardNumber = int(card_number, "card_number", 0);
    const wager = amount(betAmount);
    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction(); started = true;
      const [users] = await connection.execute("SELECT id, wallet FROM users WHERE id = ? FOR UPDATE", [userId]);
      if (!users[0]) throw new AppError(400, "USER_NOT_FOUND", "User not found.");
      if (Number(users[0].wallet) < wager) throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      const [periodRows] = await connection.execute("SELECT games_no FROM betlogs WHERE game_id = ? ORDER BY id LIMIT 1 FOR UPDATE", [gameId]);
      const period = periodRows[0]?.games_no;
      if (period === undefined || period === null) throw new AppError(409, "ROUND_NOT_FOUND", "No active High-Low period found.");
      const [options] = await connection.execute("SELECT multiplier, actual_number FROM virtual_games WHERE number = ? AND game_id = ?", [selectedNumber, gameId]);
      if (!options.length) throw new AppError(400, "INVALID_BET_NUMBER", "No matching game option found.");
      const orderId = `${Date.now()}${randomInt(11111, 100000)}`;
      await connection.execute(
        `INSERT INTO high_low_bets (amount, trade_amount, commission, number, card_number, games_no, game_id, userid, order_id, status, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [wager, wager, selectedNumber, cardNumber, period, gameId, userId, orderId],
      );
      for (const option of options) {
        const exposure = Number((wager * Number(option.multiplier)).toFixed(2));
        await connection.execute("UPDATE betlogs SET amount = amount + ? WHERE game_id = ? AND number = ? AND games_no = ?", [exposure, gameId, option.actual_number, period]);
      }
      await connection.execute(
        `UPDATE users SET wallet = wallet - ?,
         recharge = CASE WHEN recharge >= ? THEN recharge - ? ELSE 0 END,
         today_turnover = today_turnover + ? WHERE id = ?`,
        [wager, wager, wager, wager, userId],
      );
      await connection.commit(); started = false;
      return { status: 200, message: "Bet Successfully" };
    } catch (error) { if (started) await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async settleRound(gameIdValue) {
    const gameId = int(gameIdValue, "game_id");
    const connection = await this.poolProvider().getConnection();
    let started = false;
    try {
      await connection.beginTransaction(); started = true;
      const [settings] = await connection.execute("SELECT winning_percentage FROM game_settings WHERE id = ? FOR UPDATE", [gameId]);
      if (!settings[0]) throw new AppError(404, "GAME_NOT_FOUND", "Game settings not found.");
      const [logs] = await connection.execute("SELECT id, games_no, number, amount FROM betlogs WHERE game_id = ? ORDER BY id FOR UPDATE", [gameId]);
      if (!logs.length) throw new AppError(409, "ROUND_NOT_FOUND", "No current game number found.");
      const period = logs[0].games_no;
      const [existing] = await connection.execute("SELECT id FROM bet_results WHERE game_id = ? AND games_no = ? LIMIT 1", [gameId, period]);
      if (existing.length) { await connection.commit(); started = false; return { status: 200, message: "Round already settled", games_no: period }; }
      const [[totals]] = await connection.execute("SELECT COALESCE(SUM(amount),0) AS amount FROM high_low_bets WHERE game_id = ? AND games_no = ?", [gameId, period]);
      const [admin] = await connection.execute("SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1", [period, gameId]);
      const min = Math.min(...logs.map((row) => Number(row.number)));
      const max = Math.max(...logs.map((row) => Number(row.number)));
      let result;
      if (admin[0]) result = Number(admin[0].number);
      else if (Number(totals.amount) < 450) result = randomInt(min, max + 1);
      else {
        const threshold = Number(totals.amount) * (Number(settings[0].winning_percentage) / 100);
        const lowExposure = logs.filter((row) => Number(row.amount) <= threshold).sort((a, b) => Number(a.amount) - Number(b.amount));
        const choices = lowExposure.length ? lowExposure : logs.filter((row) => Number(row.amount) >= threshold).sort((a, b) => Number(a.amount) - Number(b.amount));
        result = Number(choices[0]?.number ?? randomInt(min, max + 1));
      }
      if (!Number.isInteger(result) || result < min || result > max) throw new AppError(422, "INVALID_RESULT", "High-Low result is outside the configured range.");
      const [cards] = await connection.execute("SELECT id FROM cards ORDER BY RAND() LIMIT 1");
      if (!cards[0]) throw new AppError(409, "CARD_NOT_FOUND", "No result card is configured.");
      await connection.execute("INSERT INTO bet_results (number, games_no, game_id, status, json, random_card) VALUES (?, ?, ?, 1, ?, ?)", [result, period, gameId, String(cards[0].id), cards[0].id]);
      const [bets] = await connection.execute("SELECT id, userid, number, trade_amount FROM high_low_bets WHERE games_no = ? AND game_id = ? AND status = 0 FOR UPDATE", [period, gameId]);
      for (const bet of bets) {
        const won = Number(bet.number) === result;
        let payout = 0;
        if (won) {
          const [virtual] = await connection.execute("SELECT multiplier FROM virtual_games WHERE game_id = ? AND actual_number = ? LIMIT 1", [gameId, result]);
          if (!virtual[0]) throw new AppError(409, "PAYOUT_CONFIG_NOT_FOUND", "High-Low payout option was not found.");
          payout = Number((Number(bet.trade_amount) * Number(virtual[0].multiplier)).toFixed(2));
        }
        await connection.execute("UPDATE high_low_bets SET win_amount = ?, win_number = ?, status = ?, result_card = ? WHERE id = ?", [payout, result, won ? 1 : 2, cards[0].id, bet.id]);
        if (payout > 0) await connection.execute("UPDATE users SET wallet = wallet + ?, winning_wallet = winning_wallet + ? WHERE id = ?", [payout, payout, bet.userid]);
      }
      await connection.execute("UPDATE betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?", [gameId]);
      await connection.commit(); started = false;
      return { status: 200, game_id: gameId, games_no: period, number: result, card: cards[0].id, message: "High-Low result generated successfully" };
    } catch (error) { if (started) await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async getBetHistory({ userid, game_id, limit = 10000, offset = 0, created_at }) {
    const userId = int(userid, "userid"), gameId = int(game_id, "game_id");
    const pageSize = Number(limit), pageOffset = Number(offset);
    if (!Number.isInteger(pageSize) || pageSize < 0 || !Number.isInteger(pageOffset) || pageOffset < 0) throw new AppError(400, "VALIDATION_ERROR", "limit and offset must be non-negative integers.");
    const conditions = ["b.userid = ?", "b.game_id = ?"], params = [userId, gameId];
    if (created_at) { conditions.push("DATE(b.created_at) = DATE(?)"); params.push(created_at); }
    const [rows] = await this.poolProvider().execute(
      `SELECT DISTINCT b.*, gs.name AS game_name, vg.name AS name FROM high_low_bets b
       LEFT JOIN game_settings gs ON gs.id = b.game_id
       LEFT JOIN virtual_games vg ON vg.game_id = b.game_id AND vg.number = b.number
       WHERE ${conditions.join(" AND ")} ORDER BY b.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, pageOffset],
    );
    const [[count]] = await this.poolProvider().execute("SELECT COUNT(*) AS total FROM high_low_bets WHERE userid = ?", [userId]);
    return rows.length ? { status: 200, message: "Data found", total_bets: Number(count.total), data: rows } : { status: 400, message: "No Data found", data: [] };
  }

  async getWinAmount({ userid, game_id, games_no }) {
    const userId = int(userid, "userid"), gameId = int(game_id, "game_id"), period = int(games_no, "games_no");
    const [rows] = await this.poolProvider().execute(
      `SELECT SUM(win_amount) AS win, games_no, game_id AS gameid, win_number AS number
       FROM high_low_bets WHERE games_no = ? AND game_id = ? AND userid = ? GROUP BY games_no, game_id, win_number`,
      [period, gameId, userId],
    );
    if (!rows.length) throw new AppError(400, "BET_NOT_FOUND", "No record found.");
    const total = Number(rows[0].win ?? 0);
    return { message: "Successfully", status: 200, win: total, games_no: rows[0].games_no, result: total === 0 ? "lose" : "win", gameid: rows[0].gameid, number: rows[0].number, win_loss_status: total === 0 ? 2 : 1 };
  }

  async getResults({ game_id, limit, offset = 0, created_at }) {
    const gameId = int(game_id, "game_id"), pageSize = int(limit, "limit", 0), pageOffset = int(offset, "offset", 0);
    const conditions = ["r.game_id = ?"], params = [gameId];
    if (created_at) { conditions.push("DATE(r.created_at) = DATE(?)"); params.push(created_at); }
    const [rows] = await this.poolProvider().execute(
      `SELECT r.*, vg.name AS game_name, vg.number AS game_number, vg.game_id AS game_gameid, gs.name AS game_setting_name
       FROM bet_results r LEFT JOIN virtual_games vg ON r.game_id = vg.game_id AND r.number = vg.number
       JOIN game_settings gs ON r.game_id = gs.id WHERE ${conditions.join(" AND ")} ORDER BY r.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, pageOffset],
    );
    return { status: 200, message: "Data found", data: rows };
  }
}

module.exports = { HighLowService };
