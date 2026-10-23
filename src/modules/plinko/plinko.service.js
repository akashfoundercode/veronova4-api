"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

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
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}${randomInt(11111, 100000)}`;
}

class PlinkoService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

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
}

module.exports = { PlinkoService, makeOrderId };
