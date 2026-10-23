"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

const DRAGON_TIGER_GAME_ID = 10;
const BATCH_GAME_IDS = Object.freeze([DRAGON_TIGER_GAME_ID, 13, 15]);
const RESULT_GAME_IDS = Object.freeze([DRAGON_TIGER_GAME_ID, 13]);

function chooseOutcome(logNumbers, amountRows, lastOutcome, random = Math.random) {
  const amounts = new Map(
    amountRows.map(({ number, total_amt }) => [
      Number(number),
      Number(total_amt),
    ]),
  );
  const noBetNumbers = logNumbers
    .map(Number)
    .filter((number) => !amounts.has(number) || amounts.get(number) === 0);
  let candidates = noBetNumbers;
  if (candidates.length === 0) {
    const minAmount = Math.min(...logNumbers.map((number) => amounts.get(Number(number)) ?? 0));
    candidates = logNumbers
      .map(Number)
      .filter((number) => (amounts.get(number) ?? 0) === minAmount);
  }
  if (lastOutcome !== null && candidates.length > 1) {
    const withoutRepeat = candidates.filter((number) => number !== lastOutcome);
    if (withoutRepeat.length > 0) candidates = withoutRepeat;
  }
  return candidates[Math.floor(random() * candidates.length)];
}

function assertDragonTigerGameId(gameId) {
  if (Number(gameId) !== DRAGON_TIGER_GAME_ID) {
    throw new AppError(400, "INVALID_GAME_ID", "Invalid Dragon Tiger game_id");
  }
}

function assertResultGameId(gameId) {
  if (!RESULT_GAME_IDS.includes(Number(gameId))) {
    throw new AppError(400, "INVALID_GAME_ID", "Invalid game_id");
  }
}

function assertBatchGameId(gameId) {
  if (!BATCH_GAME_IDS.includes(Number(gameId))) {
    throw new AppError(400, "INVALID_GAME_ID", "Invalid batch betting game_id");
  }
}

class DragonTigerService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async getGameSerialNo(date = new Date()) {
    const period = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
      String(DRAGON_TIGER_GAME_ID).padStart(2, "0"),
      "0001",
    ].join("");
    await this.poolProvider().execute(
      "UPDATE betlogs SET games_no = ? WHERE game_id = ?",
      [period, DRAGON_TIGER_GAME_ID],
    );
  }

  async placeBets({ userid, game_id, bets, chargeCommission = false }) {
    assertBatchGameId(game_id);
    const gameId = Number(game_id);
    if (!Number.isInteger(Number(userid)) || Number(userid) < 1 || !Array.isArray(bets) || bets.length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid and a non-empty json bet array are required.");
    }

    const preparedBets = bets.map((bet) => {
      const number = Number(bet?.number);
      const amount = Number(bet?.amount);
      if (!Number.isInteger(number) || !Number.isFinite(amount) || amount < 1) {
        throw new AppError(400, "VALIDATION_ERROR", "Each bet must have a valid number and amount of at least 1.");
      }
      return { number, amount };
    });

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [users] = await connection.execute(
        "SELECT id, wallet, recharge, status FROM users WHERE id = ? FOR UPDATE",
        [Number(userid)],
      );
      const user = users[0];
      if (!user) throw new AppError(400, "USER_NOT_FOUND", "The selected userid is invalid.");
      if (Number(user.status) !== 1) throw new AppError(400, "USER_BLOCKED", "User blocked by admin..!");

      const [periodRows] = await connection.execute(
        "SELECT games_no FROM betlogs WHERE game_id = ? ORDER BY id ASC LIMIT 1 FOR UPDATE",
        [gameId],
      );
      const period = periodRows[0]?.games_no;
      if (period === undefined || period === null) {
        throw new AppError(409, "GAME_NUMBER_NOT_FOUND", "games_no not found for this game_id");
      }

      const [options] = await connection.execute(
        "SELECT number, actual_number, multiplier FROM virtual_games WHERE game_id = ?",
        [gameId],
      );
      const optionByNumber = new Map(options.map((option) => [Number(option.number), option]));
      let total = 0;
      for (const bet of preparedBets) {
        if (!optionByNumber.has(bet.number)) {
          throw new AppError(400, "INVALID_BET_NUMBER", "No valid game bet option was found.");
        }
        total = Number((total + bet.amount).toFixed(2));
      }
      if (Number(user.wallet) < total) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      }

      const orderId = `${Date.now()}${String(randomInt(11111, 100000))}`;
      for (const bet of preparedBets) {
        const option = optionByNumber.get(bet.number);
        const commission = chargeCommission ? Number((bet.amount * 0.02).toFixed(2)) : 0;
        const tradeAmount = Number((bet.amount - commission).toFixed(2));
        await connection.execute(
          `INSERT INTO bets
            (amount, trade_amount, commission, number, games_no, game_id, userid, status, order_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [bet.amount, tradeAmount, commission, bet.number, period, gameId, Number(userid), orderId],
        );
        const loggedAmount = chargeCommission
          ? tradeAmount
          : Number((Number(option.multiplier) * bet.amount).toFixed(2));
        await connection.execute(
          "UPDATE betlogs SET amount = amount + ? WHERE game_id = ? AND number = ? AND games_no = ?",
          [loggedAmount, gameId, option.actual_number, period],
        );
      }

      await connection.execute(
        `UPDATE users
         SET recharge = CASE WHEN recharge >= ? THEN recharge - ? ELSE 0 END,
             wallet = wallet - ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [total, total, total, Number(userid)],
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

  async getBetHistory({ userid, game_id, limit, offset, from_date, to_date }) {
    assertResultGameId(game_id);
    const gameId = Number(game_id);
    const conditions = ["bets.userid = ?", "bets.game_id = ?"];
    const parameters = [userid, gameId];
    if (from_date) {
      conditions.push("bets.created_at >= ?");
      parameters.push(from_date);
    }
    if (to_date) {
      conditions.push("bets.created_at <= ?");
      parameters.push(to_date);
    }
    const [rows] = await this.poolProvider().execute(
      `SELECT DISTINCT bets.*, game_settings.name AS game_name,
              COALESCE(virtual_games.number, 'N/A') AS win_number
       FROM bets
       LEFT JOIN game_settings ON game_settings.id = bets.game_id
       LEFT JOIN virtual_games
         ON virtual_games.game_id = bets.game_id AND virtual_games.number = bets.number
       WHERE ${conditions.join(" AND ")}
       ORDER BY bets.id DESC LIMIT ?, ?`,
      [...parameters, offset, limit],
    );
    const [countRows] = await this.poolProvider().execute(
      "SELECT COUNT(*) AS total_bets FROM bets WHERE userid = ? AND game_id = ?",
      [userid, gameId],
    );
    return { rows, totalBets: Number(countRows[0]?.total_bets ?? 0) };
  }

  async getWinAmount({ userid, game_id, games_no }) {
    assertResultGameId(game_id);
    const gameId = Number(game_id);
    const [rows] = await this.poolProvider().execute(
      `SELECT SUM(win_amount) AS total_amount, games_no, game_id AS gameid, win_number AS number,
              CASE WHEN SUM(win_amount) = 0 THEN 'lose' ELSE 'win' END AS result
       FROM bets
       WHERE games_no = ? AND game_id = ? AND userid = ?
       GROUP BY games_no, game_id, win_number
       LIMIT 1`,
      [games_no, gameId, userid],
    );
    return rows[0] ?? null;
  }

  async addAdminResult({ period_num, card_number, gameid }) {
    assertResultGameId(gameid);
    const gameId = Number(gameid);
    if (
      !Number.isInteger(Number(card_number)) ||
      Number(card_number) < (gameId === DRAGON_TIGER_GAME_ID ? 1 : 0) ||
      (gameId === DRAGON_TIGER_GAME_ID && Number(card_number) > 3)
    ) {
      throw new AppError(400, "INVALID_RESULT_NUMBER", "The result number is invalid.");
    }
    const pool = this.poolProvider();
    const [existing] = await pool.execute(
      "SELECT id FROM admin_winner_results WHERE gamesno = ? AND gameId = ? LIMIT 1",
      [period_num, gameId],
    );
    if (existing.length > 0) return false;
    await pool.execute(
      "INSERT INTO admin_winner_results (gamesno, number, gameId) VALUES (?, ?, ?)",
      [period_num, Number(card_number), gameId],
    );
    return true;
  }

  async getAdminHistory(gameId) {
    assertResultGameId(gameId);
    const id = Number(gameId);
    const [bets] = await this.poolProvider().execute(
      "SELECT * FROM admin_winner_results WHERE gameId = ?",
      [id],
    );
    const [results] = await this.poolProvider().execute(
      "SELECT * FROM admin_winner_results WHERE gameId = ? ORDER BY id DESC LIMIT 1",
      [id],
    );
    return {
      bets,
      result_number: results.length > 0 ? Number(results[0].number) : null,
    };
  }

  async getAdminSetResults(gameId) {
    assertResultGameId(gameId);
    const [rows] = await this.poolProvider().execute(
      `SELECT id, gamesno, gameId, number, status, created_at, updated_at
       FROM admin_winner_results WHERE gameId = ? ORDER BY id DESC`,
      [Number(gameId)],
    );
    return rows;
  }

  async getResults({ game_id, limit, offset, from_date, to_date, status, includeAll = false }) {
    assertResultGameId(game_id);
    const gameId = Number(game_id);
    const conditions = ["game_id = ?"];
    const parameters = [gameId];
    if (from_date && to_date) {
      conditions.push("DATE(created_at) BETWEEN DATE(?) AND DATE(?)");
      parameters.push(from_date, to_date);
    }
    if (status !== undefined) {
      conditions.push("status = ?");
      parameters.push(Number(status));
    }
    const where = conditions.join(" AND ");
    if (includeAll) {
      const [rows] = await this.poolProvider().execute(
        `SELECT * FROM bet_results WHERE ${where} ORDER BY id DESC LIMIT ?, ?`,
        [...parameters, offset, limit],
      );
      return rows;
    }
    const [countRows] = await this.poolProvider().execute(
      `SELECT COUNT(*) AS total_result FROM bet_results WHERE ${where}`,
      parameters,
    );
    const [rows] = await this.poolProvider().execute(
      `SELECT id, game_id, games_no, number, json, status, created_at
       FROM bet_results WHERE ${where} ORDER BY id DESC LIMIT ?, ?`,
      [...parameters, offset, limit],
    );
    return { data: rows, total_result: Number(countRows[0]?.total_result ?? 0) };
  }

  async getLastResult(game_id) {
    assertResultGameId(game_id);
    const [rows] = await this.poolProvider().execute(
      "SELECT * FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1",
      [Number(game_id)],
    );
    return rows[0] ?? null;
  }

  async settleRound(gameId) {
    assertDragonTigerGameId(gameId);
    gameId = Number(gameId);
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [logRows] = await connection.execute(
        "SELECT games_no, number, amount FROM betlogs WHERE game_id = ? ORDER BY id ASC FOR UPDATE",
        [gameId],
      );
      if (logRows.length === 0) {
        throw new AppError(409, "ROUND_NOT_FOUND", "No current game number found");
      }
      const gameNo = logRows[0].games_no;
      const [existing] = await connection.execute(
        "SELECT id FROM bet_results WHERE game_id = ? AND games_no = ? LIMIT 1",
        [gameId, gameNo],
      );
      if (existing.length > 0) {
        await connection.commit();
        transactionStarted = false;
        return { message: "Dragon Tiger round already settled", games_no: gameNo };
      }

      const [adminResults] = await connection.execute(
        "SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1",
        [gameNo, gameId],
      );
      let result = Number(adminResults[0]?.number);
      if (adminResults.length > 0 && (!Number.isInteger(result) || result < 1 || result > 3)) {
        throw new AppError(409, "INVALID_ADMIN_RESULT", "The configured Dragon Tiger result must be 1, 2, or 3.");
      }
      if (!Number.isInteger(result) || result < 1 || result > 3) {
        const amountRows = logRows.map((row) => ({ number: row.number, total_amt: row.amount }));
        const [previousResults] = await connection.execute(
          "SELECT number FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1",
          [gameId],
        );
        result = chooseOutcome(
          logRows.map((row) => row.number),
          amountRows,
          previousResults.length ? Number(previousResults[0].number) : null,
        );
      }

      let cardIds;
      let cardImages;
      const [cards] = await connection.execute(
        "SELECT card, image FROM cards ORDER BY id ASC",
      );
      const cardByRank = new Map();
      for (const card of cards) {
        const rank = Number(card.card);
        if (!cardByRank.has(rank)) cardByRank.set(rank, []);
        cardByRank.get(rank).push(card);
      }
      const ranks = [...cardByRank.keys()].sort((a, b) => a - b);
      if (ranks.length < 2) throw new AppError(500, "CARDS_NOT_CONFIGURED", "Dragon Tiger cards are not configured.");

      let dragonRank;
      let tigerRank;
      if (result === 3) {
        const tieRank = ranks[randomInt(ranks.length)];
        dragonRank = tieRank;
        tigerRank = tieRank;
      } else {
        const pairs = [];
        for (const dragon of ranks) {
          for (const tiger of ranks) {
            if ((result === 1 && dragon > tiger) || (result === 2 && tiger > dragon)) {
              pairs.push([dragon, tiger]);
            }
          }
        }
        [dragonRank, tigerRank] = pairs[randomInt(pairs.length)];
      }
      const dragonCard = cardByRank.get(dragonRank)[randomInt(cardByRank.get(dragonRank).length)];
      const tigerCard = cardByRank.get(tigerRank)[randomInt(cardByRank.get(tigerRank).length)];
      cardIds = JSON.stringify([dragonRank, tigerRank]);
      cardImages = JSON.stringify([dragonCard.image, tigerCard.image]);

      await connection.execute(
        `INSERT INTO bet_results (number, games_no, game_id, card_id, status, json, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [result, gameNo, gameId, cardIds, cardImages],
      );

      const [winningOptions] = await connection.execute(
        "SELECT number, multiplier FROM virtual_games WHERE game_id = ? AND actual_number = ?",
        [gameId, result],
      );
      for (const option of winningOptions) {
        await connection.execute(
          `UPDATE bets SET win_amount = trade_amount * ?, win_number = ?, status = 1,
                           updated_at = CURRENT_TIMESTAMP
           WHERE games_no = ? AND game_id = ? AND number = ? AND status = 0`,
          [Number(option.multiplier), result, gameNo, gameId, option.number],
        );
      }
      const [winningBets] = await connection.execute(
        "SELECT userid, win_amount FROM bets WHERE game_id = ? AND games_no = ? AND status = 1",
        [gameId, gameNo],
      );
      for (const bet of winningBets) {
        await connection.execute(
          `UPDATE users SET wallet = wallet + ?, winning_wallet = winning_wallet + ?,
                            updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [bet.win_amount, bet.win_amount, bet.userid],
        );
      }
      await connection.execute(
        `UPDATE bets SET status = 2, win_number = ?, updated_at = CURRENT_TIMESTAMP
         WHERE games_no = ? AND game_id = ? AND status = 0`,
        [result, gameNo, gameId],
      );
      await connection.execute(
        "UPDATE betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?",
        [gameId],
      );

      await connection.commit();
      transactionStarted = false;
      return { message: "Dragon Tiger result generated successfully", games_no: gameNo, result };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = {
  DRAGON_TIGER_GAME_ID,
  DragonTigerService,
  chooseOutcome,
};
