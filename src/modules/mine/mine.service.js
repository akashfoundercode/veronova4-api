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
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}${randomInt(11111, 100000)}`;
}

class MineService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async placeBet({ userid, game_id, amount }, { legacyWalletMode = false } = {}) {
    const userId = requiredInteger(userid, "userid");
    const gameId = requiredInteger(game_id, "game_id");
    const betAmount = requiredNumber(amount, "amount");
    const minimumAmount = legacyWalletMode ? 10 : 0.1;
    if (userId < 1 || gameId < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid and game_id must be positive integers.");
    }
    if (betAmount < minimumAmount) {
      throw new AppError(400, "INVALID_AMOUNT", `Bet placed minimum ${minimumAmount} rupees`);
    }

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [users] = await connection.execute(
        "SELECT id, wallet FROM users WHERE id = ? FOR UPDATE",
        [userId],
      );
      const user = users[0];
      if (!user) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      }
      if (Number(user.wallet) < betAmount) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      }

      const orderId = makeOrderId();
      const orderColumn = legacyWalletMode ? "order_id" : "orderid";
      await connection.execute(
        `INSERT INTO minegame_bet
          (amount, game_id, userid, status, created_at, updated_at, tax, after_tax, ${orderColumn})
         VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, ?, ?)`,
        [betAmount, gameId, userId, betAmount, orderId],
      );
      await connection.execute(
        "UPDATE users SET wallet = wallet - ? WHERE id = ?",
        [betAmount, userId],
      );
      await connection.commit();
      transactionStarted = false;
      return { status: 200, message: "Bet placed successfully" };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async cashout({ userid, win_amount, multipler, status }) {
    const userId = requiredInteger(userid, "userid");
    const winAmount = requiredNumber(win_amount, "win_amount");
    const multiplier = requiredNumber(multipler, "multipler");
    const betStatus = requiredInteger(status, "status");
    if (userId < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid must be a positive integer.");
    }

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [users] = await connection.execute(
        "SELECT id FROM users WHERE id = ? FOR UPDATE",
        [userId],
      );
      if (!users[0]) {
        throw new AppError(400, "USER_NOT_FOUND", "User does not exist");
      }

      const [bets] = await connection.execute(
        `SELECT id FROM minegame_bet
         WHERE userid = ? AND status = 0
         ORDER BY id ASC LIMIT 1 FOR UPDATE`,
        [userId],
      );
      if (!bets[0]) {
        throw new AppError(
          400,
          "ACTIVE_BET_NOT_FOUND",
          "No active minegame bet found for the user",
        );
      }

      await connection.execute(
        `UPDATE minegame_bet
         SET status = ?, multipler = ?, win_amount = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [betStatus, multiplier, winAmount, bets[0].id],
      );
      await connection.execute(
        "UPDATE users SET wallet = wallet + ? WHERE id = ?",
        [winAmount, userId],
      );
      await connection.commit();
      transactionStarted = false;
      return {
        status: 200,
        message: "CashOut successfully",
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
    const userId = requiredInteger(userid, "userid");
    const resultLimit = Number(limit);
    const resultOffset = Number(offset);
    if (
      userId < 1 ||
      !Number.isInteger(resultLimit) ||
      resultLimit < 0 ||
      !Number.isInteger(resultOffset) ||
      resultOffset < 0
    ) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid, limit, or offset is invalid.");
    }

    const pool = this.poolProvider();
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) AS count FROM minegame_bet WHERE userid = ? AND status IN (1, 2)",
      [userId],
    );
    const count = Number(countRows[0]?.count ?? 0);
    const [rows] = resultLimit > 0
      ? await pool.execute(
          `SELECT * FROM minegame_bet
           WHERE userid = ? AND status IN (1, 2)
           ORDER BY id DESC LIMIT ? OFFSET ?`,
          [userId, resultLimit, resultOffset],
        )
      : await pool.execute(
          `SELECT * FROM minegame_bet
           WHERE userid = ? AND status IN (1, 2)
           ORDER BY id DESC`,
          [userId],
        );
    if (rows.length === 0) {
      return { status: 200, message: "No data found" };
    }
    return { status: 200, message: "Success", count, data: rows };
  }

  async getMultipliers() {
    const [rows] = await this.poolProvider().execute(
      "SELECT id, name, multiplier FROM mine_multipliers",
    );
    return rows.length > 0
      ? { status: 200, data: rows }
      : { status: "400", data: [] };
  }
}

module.exports = { MineService, makeOrderId };
