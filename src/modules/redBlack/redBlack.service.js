"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const { WingoService } = require("../wingo/wingo.service");
const AppError = require("../../shared/errors/AppError");

const RED_BLACK_GAME_ID = 16;

function assertRedBlackGameId(gameId) {
  if (Number(gameId) !== RED_BLACK_GAME_ID) {
    throw new AppError(400, "INVALID_GAME_ID", "Invalid Red & Black game_id");
  }
}

function coloursForResult(result) {
  switch (Number(result)) {
    case 1:
      return ["d"];
    case 2:
      return ["c"];
    case 3:
      return ["k"];
    case 4:
      return ["e"];
    case 5:
    case 6:
      return ["e", "d"];
    case 7:
      return ["c", "k"];
    default:
      throw new AppError(422, "INVALID_RESULT_NUMBER", "Red & Black result must be from 1 to 7.");
  }
}

function randomResult(logs) {
  const numbers = logs.map(({ number }) => Number(number));
  const minimum = Math.min(...numbers);
  const maximum = Math.max(...numbers);
  return randomInt(minimum, maximum + 1);
}

function amountBasedResult(logs, totalAmount, winningPercentage) {
  if (totalAmount < 450) return randomResult(logs);

  const threshold = totalAmount * winningPercentage / 100;
  const sorted = [...logs].sort((left, right) => Number(left.amount) - Number(right.amount));
  const atOrBelow = sorted.find(({ amount }) => Number(amount) <= threshold);
  if (atOrBelow) return Number(atOrBelow.number);
  const atOrAbove = sorted.find(({ amount }) => Number(amount) >= threshold);
  return atOrAbove ? Number(atOrAbove.number) : randomResult(logs);
}

function localOrderId() {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  return `${timestamp}${randomInt(11111, 100000)}`;
}

class RedBlackService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
    this.readService = new WingoService(poolProvider);
  }

  async placeBets({ userid, game_id, bets, chargeCommission = false }) {
    assertRedBlackGameId(game_id);
    const userId = Number(userid);
    if (!Number.isInteger(userId) || userId < 1 || !Array.isArray(bets) || bets.length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid and a non-empty json bet array are required.");
    }
    const preparedBets = bets.map((bet) => {
      const number = Number(bet?.number);
      const amount = Number(bet?.amount);
      if (!Number.isInteger(number) || !Number.isFinite(amount) || amount < 0.1) {
        throw new AppError(400, "VALIDATION_ERROR", "Each bet must have a valid number and amount of at least 0.1.");
      }
      return { number, amount };
    });

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [users] = await connection.execute(
        "SELECT id, wallet, recharge FROM users WHERE id = ? FOR UPDATE",
        [userId],
      );
      const user = users[0];
      if (!user) throw new AppError(400, "USER_NOT_FOUND", "User not found.");

      const [periodRows] = await connection.execute(
        "SELECT games_no FROM betlogs WHERE game_id = ? LIMIT 1 FOR UPDATE",
        [RED_BLACK_GAME_ID],
      );
      const gamesNo = periodRows[0]?.games_no;
      if (gamesNo === undefined || gamesNo === null) {
        throw new AppError(409, "GAME_NUMBER_NOT_FOUND", "games_no not found for this game_id");
      }
      const [options] = await connection.execute(
        "SELECT number, actual_number, multiplier FROM virtual_games WHERE game_id = ?",
        [RED_BLACK_GAME_ID],
      );
      const optionByNumber = new Map(options.map((option) => [Number(option.number), option]));
      let total = 0;
      for (const bet of preparedBets) {
        if (!optionByNumber.has(bet.number)) {
          throw new AppError(400, "INVALID_BET_NUMBER", "No valid virtual game found for this number and game ID.");
        }
        total = Number((total + bet.amount).toFixed(2));
      }
      if (Number(user.wallet) < total) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Your balance is too low to place this bet.");
      }

      const orderId = localOrderId();
      for (const bet of preparedBets) {
        const option = optionByNumber.get(bet.number);
        const commission = chargeCommission ? Number((bet.amount * 0.02).toFixed(2)) : 0;
        const tradeAmount = Number((bet.amount - commission).toFixed(2));
        await connection.execute(
          `INSERT INTO bets
            (amount, trade_amount, commission, number, games_no, game_id, userid, status, order_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            bet.amount,
            tradeAmount,
            commission,
            bet.number,
            gamesNo,
            RED_BLACK_GAME_ID,
            userId,
            orderId,
          ],
        );
        const loggedAmount = Number((Number(option.multiplier) * bet.amount).toFixed(2));
        await connection.execute(
          `UPDATE betlogs SET amount = amount + ?
           WHERE game_id = ? AND number = ? AND games_no = ?`,
          [loggedAmount, RED_BLACK_GAME_ID, option.actual_number, gamesNo],
        );
      }

      await connection.execute(
        `UPDATE users
         SET recharge = CASE WHEN recharge >= ? THEN recharge - ? ELSE 0 END,
             wallet = wallet - ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [total, total, total, userId],
      );
      await connection.commit();
      transactionStarted = false;
      return { status: 200, message: "Bet Successfully" };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getBetHistory(options) {
    assertRedBlackGameId(options.game_id);
    return this.readService.getBetHistory(options);
  }

  async getWinAmount(options) {
    assertRedBlackGameId(options.game_id);
    return this.readService.getWinAmount(options);
  }

  async addAdminResult(options) {
    assertRedBlackGameId(options.gameid);
    const result = Number(options.card_number);
    coloursForResult(result);
    const pool = this.poolProvider();
    const [existing] = await pool.execute(
      "SELECT id FROM admin_winner_results WHERE gamesno = ? AND gameId = ? LIMIT 1",
      [options.period_num, RED_BLACK_GAME_ID],
    );
    if (existing.length > 0) return false;
    await pool.execute(
      "INSERT INTO admin_winner_results (gamesno, number, gameId) VALUES (?, ?, ?)",
      [options.period_num, result, RED_BLACK_GAME_ID],
    );
    return true;
  }

  async getAdminHistory(gameId) {
    assertRedBlackGameId(gameId);
    return this.readService.getAdminHistory(gameId);
  }

  async getAdminSetResults(gameId) {
    assertRedBlackGameId(gameId);
    return this.readService.getAdminSetResults(gameId);
  }

  async getResults(options) {
    assertRedBlackGameId(options.game_id);
    const conditions = ["game_id = ?"];
    const values = [RED_BLACK_GAME_ID];
    if (options.from_date && options.to_date) {
      conditions.push("created_at BETWEEN ? AND ?");
      values.push(options.from_date, options.to_date);
    }
    if (options.status && Number(options.status) !== 0) {
      conditions.push("status = ?");
      values.push(options.status);
    }
    const where = conditions.join(" AND ");
    if (options.includeAll) {
      const [rows] = await this.poolProvider().execute(
        `SELECT * FROM bet_results WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...values, options.limit, options.offset ?? 0],
      );
      return rows;
    }
    const [counts] = await this.poolProvider().execute(
      "SELECT COUNT(*) AS total_result FROM bet_results WHERE game_id = ?",
      [RED_BLACK_GAME_ID],
    );
    const [rows] = await this.poolProvider().execute(
      `SELECT * FROM bet_results WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, options.limit, options.offset ?? 0],
    );
    return { total_result: Number(counts[0]?.total_result ?? 0), data: rows };
  }

  async getLastResult(gameId) {
    assertRedBlackGameId(gameId);
    return this.readService.getLastResult(gameId);
  }

  async settleRound(gameId, { forcedResult, periodOverride } = {}) {
    assertRedBlackGameId(gameId);
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [logs] = await connection.execute(
        "SELECT id, games_no, number, amount FROM betlogs WHERE game_id = ? ORDER BY id DESC FOR UPDATE",
        [RED_BLACK_GAME_ID],
      );
      if (logs.length === 0) {
        throw new AppError(409, "ROUND_NOT_FOUND", "No game round found.");
      }
      const gameNo = String(periodOverride ?? logs[0].games_no);
      const [existing] = await connection.execute(
        "SELECT id FROM bet_results WHERE game_id = ? AND games_no = ? LIMIT 1",
        [RED_BLACK_GAME_ID, gameNo],
      );
      if (existing.length > 0) {
        await connection.commit();
        transactionStarted = false;
        return { message: "Red & Black round already settled", games_no: gameNo };
      }

      let resultNumber;
      if (forcedResult !== undefined) {
        resultNumber = Number(forcedResult);
      } else {
        const [patterns] = await connection.execute(
          `SELECT id, number, number_count FROM result_pattern_set
           WHERE game_id = ? AND status = 1 ORDER BY id ASC FOR UPDATE`,
          [RED_BLACK_GAME_ID],
        );
        if (patterns.length > 0) {
          resultNumber = await this.nextPatternResult(connection, patterns);
        } else {
          resultNumber = await this.selectCronResult(connection, logs, gameNo);
        }
      }
      const colours = coloursForResult(resultNumber);

      if (resultNumber === 5) {
        const [jack] = await connection.execute(
          "SELECT id FROM cards WHERE card = 11 LIMIT 1",
        );
        if (jack.length === 0) {
          throw new AppError(500, "CARD_NOT_FOUND", "Card with card = 11 not found");
        }
      }
      const colour = colours[randomInt(colours.length)];
      const [cards] = await connection.execute(
        "SELECT image FROM cards WHERE colour = ? ORDER BY RAND() LIMIT 1",
        [colour],
      );
      if (cards.length === 0) {
        throw new AppError(500, "CARD_NOT_FOUND", `No card found for colour: ${colour}`);
      }
      const image = cards[0].image;
      const [virtualGames] = await connection.execute(
        "SELECT multiplier FROM virtual_games WHERE game_id = ? AND actual_number = ? LIMIT 1",
        [RED_BLACK_GAME_ID, resultNumber],
      );
      if (virtualGames.length === 0) {
        throw new AppError(422, "INVALID_RESULT_NUMBER", "No virtual game matches the Red & Black result.");
      }
      const multiplier = Number(virtualGames[0].multiplier);

      await connection.execute(
        `INSERT INTO bet_results
          (number, games_no, game_id, status, json, win_number, random_card)
         VALUES (?, ?, ?, 1, ?, ?, ?)`,
        [resultNumber, gameNo, RED_BLACK_GAME_ID, image, image, resultNumber],
      );
      await connection.execute(
        "UPDATE bets SET trade_amount = ? WHERE game_id = ? AND games_no = ?",
        [multiplier, RED_BLACK_GAME_ID, gameNo],
      );
      const [bets] = await connection.execute(
        "SELECT id, userid, amount, number FROM bets WHERE game_id = ? AND games_no = ?",
        [RED_BLACK_GAME_ID, gameNo],
      );
      const winningAmounts = new Map();
      for (const bet of bets) {
        const won = Number(bet.number) === resultNumber;
        const winAmount = won ? Number((Number(bet.amount) * multiplier).toFixed(2)) : 0;
        await connection.execute(
          `UPDATE bets
           SET status = ?, win_amount = ?, trade_amount = ?, win_number = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [won ? 1 : 2, winAmount, multiplier, resultNumber, bet.id],
        );
        if (won && winAmount > 0) {
          const userId = Number(bet.userid);
          winningAmounts.set(userId, Number(((winningAmounts.get(userId) ?? 0) + winAmount).toFixed(2)));
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
        [RED_BLACK_GAME_ID],
      );
      await connection.commit();
      transactionStarted = false;
      return {
        gameId: RED_BLACK_GAME_ID,
        gameNo,
        resultNumber,
        image,
        message: `Red/Black winnings distributed for Game ID: 16, Period: ${gameNo}`,
      };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async nextPatternResult(connection, patterns) {
    const [trackingRows] = await connection.execute(
      "SELECT id, current_index, remaining_count FROM pattern_tracking WHERE game_id = ? LIMIT 1 FOR UPDATE",
      [RED_BLACK_GAME_ID],
    );
    let tracking = trackingRows[0];
    let currentIndex = Number(tracking?.current_index ?? 0);
    let remainingCount = Number(tracking?.remaining_count ?? patterns[0].number_count);
    if (!tracking) {
      const [insert] = await connection.execute(
        `INSERT INTO pattern_tracking (game_id, current_index, remaining_count, updated_at)
         VALUES (?, 0, ?, CURRENT_TIMESTAMP)`,
        [RED_BLACK_GAME_ID, Number(patterns[0].number_count)],
      );
      tracking = { id: insert.insertId };
    }
    if (!patterns[currentIndex]) {
      currentIndex = 0;
      remainingCount = Number(patterns[0].number_count);
    }
    const result = Number(patterns[currentIndex].number);
    remainingCount -= 1;
    if (remainingCount <= 0) {
      currentIndex = (currentIndex + 1) % patterns.length;
      remainingCount = Number(patterns[currentIndex].number_count);
    }
    if (!Number.isInteger(result) || !Number.isInteger(remainingCount) || remainingCount < 1) {
      throw new AppError(409, "INVALID_RESULT_PATTERN", "The active Red & Black result pattern is invalid.");
    }
    await connection.execute(
      `UPDATE pattern_tracking
       SET current_index = ?, remaining_count = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [currentIndex, remainingCount, tracking.id],
    );
    return result;
  }

  async selectCronResult(connection, logs, gameNo) {
    const [types] = await connection.execute(
      "SELECT type FROM wingo_result_type WHERE status = 1 LIMIT 1",
    );
    if (types.length === 0) {
      throw new AppError(409, "RESULT_TYPE_NOT_CONFIGURED", "Global result type is not configured.");
    }
    if (Number(types[0].type) !== 1) {
      throw new AppError(409, "RESULT_TYPE_NOT_SUPPORTED", "Red & Black requires an active game-specific pattern or global result type 1.");
    }
    const [settings] = await connection.execute(
      "SELECT winning_percentage FROM game_settings WHERE id = ?",
      [RED_BLACK_GAME_ID],
    );
    if (settings.length === 0) {
      throw new AppError(404, "GAME_NOT_FOUND", "No winning percentage found for game_id: 16");
    }
    const [totalRows] = await connection.execute(
      "SELECT COALESCE(SUM(amount), 0) AS amount FROM bets WHERE game_id = ? AND games_no = ?",
      [RED_BLACK_GAME_ID, gameNo],
    );
    const totalAmount = Number(totalRows[0]?.amount ?? 0);
    const [adminResults] = await connection.execute(
      `SELECT number FROM admin_winner_results
       WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1`,
      [gameNo, RED_BLACK_GAME_ID],
    );
    if (adminResults.length > 0) return Number(adminResults[0].number);
    return amountBasedResult(
      logs,
      totalAmount,
      Number(settings[0].winning_percentage),
    );
  }
}

module.exports = {
  RED_BLACK_GAME_ID,
  RedBlackService,
  amountBasedResult,
  coloursForResult,
};
