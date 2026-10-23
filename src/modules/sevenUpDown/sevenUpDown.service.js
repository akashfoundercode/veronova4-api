"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const { WingoService, chooseWinningNumber } = require("../wingo/wingo.service");
const { DragonTigerService } = require("../dragonTiger/dragonTiger.service");
const AppError = require("../../shared/errors/AppError");

const SEVEN_UP_DOWN_GAME_ID = 15;
const DICE_IMAGE_BASE = "https://magicwinner.motug.com/public/uploads/7up";

function makeDiceResult(result) {
  let firstDie;
  let secondDie;
  if (result === 1) {
    firstDie = randomInt(1, 6);
    const secondSum = randomInt(firstDie, 7);
    secondDie = secondSum - firstDie;
  } else if (result === 2) {
    firstDie = randomInt(1, 6);
    secondDie = 7 - firstDie;
  } else {
    firstDie = 6;
    const diceSum = randomInt(firstDie, 13);
    secondDie = diceSum - firstDie;
  }
  return {
    dice: [firstDie, secondDie],
    total: firstDie + secondDie,
    images: [
      `${DICE_IMAGE_BASE}/${firstDie}.png`,
      `${DICE_IMAGE_BASE}/${secondDie}.png`,
    ],
  };
}

function assertSevenUpDownGameId(gameId) {
  if (Number(gameId) !== SEVEN_UP_DOWN_GAME_ID) {
    throw new AppError(400, "INVALID_GAME_ID", "Invalid 7 Up Down game_id");
  }
}

class SevenUpDownService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
    this.betService = new DragonTigerService(poolProvider);
    this.resultService = new WingoService(poolProvider);
  }

  async placeBets(options) {
    assertSevenUpDownGameId(options.game_id);
    return this.betService.placeBets({
      ...options,
      game_id: SEVEN_UP_DOWN_GAME_ID,
    });
  }

  async getBetHistory(options) {
    assertSevenUpDownGameId(options.game_id);
    return this.betService.getBetHistory(options);
  }

  async getWinAmount(options) {
    assertSevenUpDownGameId(options.game_id);
    return this.resultService.getWinAmount(options);
  }

  async addAdminResult(options) {
    assertSevenUpDownGameId(options.gameid);
    if (![1, 2, 3].includes(Number(options.card_number))) {
      throw new AppError(400, "INVALID_RESULT_NUMBER", "7 Up Down result must be 1, 2, or 3.");
    }
    const pool = this.poolProvider();
    const [existing] = await pool.execute(
      "SELECT id FROM admin_winner_results WHERE gamesno = ? AND gameId = ? LIMIT 1",
      [options.period_num, SEVEN_UP_DOWN_GAME_ID],
    );
    if (existing.length > 0) return false;
    await pool.execute(
      "INSERT INTO admin_winner_results (gamesno, number, gameId) VALUES (?, ?, ?)",
      [options.period_num, Number(options.card_number), SEVEN_UP_DOWN_GAME_ID],
    );
    return true;
  }

  async getAdminHistory(gameId) {
    assertSevenUpDownGameId(gameId);
    return this.resultService.getAdminHistory(gameId);
  }

  async getAdminSetResults(gameId) {
    assertSevenUpDownGameId(gameId);
    return this.resultService.getAdminSetResults(gameId);
  }

  async getResults(options) {
    assertSevenUpDownGameId(options.game_id);
    return this.resultService.getResults(options);
  }

  async getLastResult(gameId) {
    assertSevenUpDownGameId(gameId);
    return this.resultService.getLastResult(gameId);
  }

  async settleRound(gameId, { forcedResult, periodOverride } = {}) {
    assertSevenUpDownGameId(gameId);
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [settings] = await connection.execute(
        "SELECT winning_percentage FROM game_settings WHERE id = ?",
        [SEVEN_UP_DOWN_GAME_ID],
      );
      if (settings.length === 0) {
        throw new AppError(404, "GAME_NOT_FOUND", "No winning percentage found for game_id: 15");
      }
      const [logs] = await connection.execute(
        "SELECT id, games_no, number, amount FROM betlogs WHERE game_id = ? ORDER BY id FOR UPDATE",
        [SEVEN_UP_DOWN_GAME_ID],
      );
      if (logs.length === 0) {
        throw new AppError(409, "ROUND_NOT_FOUND", "No current game number found");
      }
      const gameNo = String(periodOverride ?? logs[0].games_no);
      const [existing] = await connection.execute(
        "SELECT id FROM bet_results WHERE game_id = ? AND games_no = ? LIMIT 1",
        [SEVEN_UP_DOWN_GAME_ID, gameNo],
      );
      if (existing.length > 0) {
        await connection.commit();
        transactionStarted = false;
        return { message: "7 Up Down round already settled", games_no: gameNo };
      }

      const [adminResults] = forcedResult === undefined
        ? await connection.execute(
            "SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1",
            [gameNo, SEVEN_UP_DOWN_GAME_ID],
          )
        : [[]];
      let resultNumber;
      if (forcedResult !== undefined) {
        resultNumber = Number(forcedResult);
      } else if (adminResults.length > 0) {
        resultNumber = Number(adminResults[0].number);
      } else {
        const [amountRows] = await connection.execute(
          `SELECT number, SUM(amount) AS total_amt
           FROM betlogs WHERE game_id = ? AND games_no = ? GROUP BY number`,
          [SEVEN_UP_DOWN_GAME_ID, gameNo],
        );
        const categoryRows = amountRows.filter(({ number }) =>
          [1, 2, 3].includes(Number(number)),
        );
        resultNumber = chooseWinningNumber({
          logNumbers: [1, 2, 3],
          totalBet: categoryRows.reduce((total, row) => total + Number(row.total_amt), 0),
          amountRows: categoryRows,
        });
      }
      if (![1, 2, 3].includes(resultNumber)) {
        throw new AppError(422, "INVALID_RESULT_NUMBER", "7 Up Down result must be 1, 2, or 3.");
      }

      const { total, images } = makeDiceResult(resultNumber);
      await connection.execute(
        `INSERT INTO bet_results
          (number, games_no, game_id, status, json, random_card, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [resultNumber, gameNo, SEVEN_UP_DOWN_GAME_ID, JSON.stringify(images), total],
      );
      const [bets] = await connection.execute(
        "SELECT id, userid, amount, number FROM bets WHERE games_no = ? AND game_id = ?",
        [gameNo, SEVEN_UP_DOWN_GAME_ID],
      );
      const winningAmounts = new Map();
      for (const bet of bets) {
        const won = Number(bet.number) === resultNumber;
        const winAmount = won ? Number((Number(bet.amount) * 2).toFixed(2)) : 0;
        await connection.execute(
          `UPDATE bets
           SET status = ?, win_amount = ?, win_number = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [won ? 1 : 2, winAmount, total, bet.id],
        );
        if (won && winAmount > 0) {
          winningAmounts.set(
            Number(bet.userid),
            Number(((winningAmounts.get(Number(bet.userid)) ?? 0) + winAmount).toFixed(2)),
          );
        }
      }
      for (const [userId, amount] of winningAmounts) {
        await connection.execute(
          "UPDATE users SET wallet = wallet + ? WHERE id = ?",
          [amount, userId],
        );
      }
      await connection.execute(
        "UPDATE betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?",
        [SEVEN_UP_DOWN_GAME_ID],
      );
      await connection.commit();
      transactionStarted = false;
      return {
        gameId: SEVEN_UP_DOWN_GAME_ID,
        gameNo,
        resultNumber,
        diceTotal: total,
        message: `✅ Result generated for Game ID: 15 | Game No: ${gameNo} | Result: ${resultNumber}`,
      };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = {
  DICE_IMAGE_BASE,
  SEVEN_UP_DOWN_GAME_ID,
  SevenUpDownService,
  makeDiceResult,
};
