"use strict";

const crypto = require("node:crypto");
const { getPool } = require("../../config/database");
const config = require("../../config");
const AppError = require("../../shared/errors/AppError");

const WINGO_GAME_IDS = Object.freeze([1, 2, 3, 4]);
const STANDARD_GAME_IDS = Object.freeze([
  ...WINGO_GAME_IDS,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
]);
const GROSS_PAYOUT_GAME_IDS = new Set([14, 20]);

function randomInteger(min, max, random = Math.random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function chooseWinningNumber(
  { logNumbers, totalBet, amountRows },
  random = Math.random,
) {
  if (logNumbers.length === 0) {
    throw new AppError(409, "ROUND_NOT_FOUND", "No current game number found");
  }

  if (Number(totalBet) === 0) {
    const numbers = logNumbers.map(Number);
    return randomInteger(Math.min(...numbers), Math.max(...numbers), random);
  }

  const amounts = new Map(
    amountRows.map(({ number, total_amt }) => [
      Number(number),
      Number(total_amt),
    ]),
  );
  const min = Math.min(...logNumbers.map(Number));
  const max = Math.max(...logNumbers.map(Number));
  const noBetNumbers = [];

  for (let number = min; number <= max; number += 1) {
    if (!amounts.has(number) || amounts.get(number) === 0) {
      noBetNumbers.push(number);
    }
  }

  if (noBetNumbers.length > 0) {
    return noBetNumbers[randomInteger(0, noBetNumbers.length - 1, random)];
  }

  if (amounts.size === 0) {
    throw new AppError(
      409,
      "ROUND_BETS_NOT_FOUND",
      "Bet totals were not found for the current round",
    );
  }

  const minAmount = Math.min(...amounts.values());
  const lowestNumbers = [...amounts.entries()]
    .filter(([, amount]) => amount === minAmount)
    .map(([number]) => number);

  return lowestNumbers[randomInteger(0, lowestNumbers.length - 1, random)];
}

function calculateBetAmounts(amount) {
  const commission = Number((amount * 0.02).toFixed(2));
  return {
    commission,
    tradeAmount: Number((amount - commission).toFixed(2)),
  };
}

function assertWingoGameId(gameId) {
  if (!WINGO_GAME_IDS.includes(Number(gameId))) {
    throw new AppError(400, "INVALID_GAME_ID", "Invalid Wingo game_id");
  }
}

function assertStandardGameId(gameId) {
  if (!STANDARD_GAME_IDS.includes(Number(gameId))) {
    throw new AppError(400, "INVALID_GAME_ID", "Invalid game_id");
  }
}

function formatPeriod(date, gameId) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}${String(gameId).padStart(2, "0")}0001`;
}

function makeOrderId(date = new Date()) {
  const timestamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");

  return `${timestamp}${randomInteger(11111, 99999)}`;
}

class WingoService {
  constructor(poolProvider = getPool, fetchImpl = globalThis.fetch) {
    this.poolProvider = poolProvider;
    this.fetchImpl = fetchImpl;
  }

  async getGameSerialNo(date = new Date()) {
    const pool = this.poolProvider();
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;
      for (const gameId of STANDARD_GAME_IDS) {
        let nextGameNo = formatPeriod(date, gameId);
        try {
          const [lastResultRows] = await connection.execute(
            "SELECT games_no FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1",
            [gameId],
          );
          if (lastResultRows[0]?.games_no && /^\d+$/.test(String(lastResultRows[0].games_no))) {
            const lastNum = BigInt(lastResultRows[0].games_no);
            nextGameNo = String(lastNum + 1n);
          }
        } catch (_) {}
        await connection.execute(
          "UPDATE betlogs SET games_no = ? WHERE game_id = ?",
          [nextGameNo, gameId],
        );
      }
      await connection.commit();
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async placeBet({ userid, game_id, number, amount, games_no }) {
    assertStandardGameId(game_id);
    const pool = this.poolProvider();
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      let [logRows] = await connection.execute(
        "SELECT id, games_no, number FROM betlogs WHERE game_id = ? ORDER BY id FOR UPDATE",
        [game_id],
      );
      if (logRows.length === 0) {
        const initialGameNo = formatPeriod(new Date(), game_id);
        const numbers = WINGO_GAME_IDS.includes(Number(game_id))
          ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
          : [0];
        for (const num of numbers) {
          await connection.execute(
            "INSERT INTO betlogs (game_id, games_no, number, amount) VALUES (?, ?, ?, 0.00)",
            [game_id, initialGameNo, String(num)],
          );
        }
        const [seeded] = await connection.execute(
          "SELECT id, games_no, number FROM betlogs WHERE game_id = ? ORDER BY id FOR UPDATE",
          [game_id],
        );
        logRows = seeded;
      }
      let period = logRows[0]?.games_no ? String(logRows[0].games_no) : null;
      try {
        const [lastResultRows] = await connection.execute(
          "SELECT games_no FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1",
          [game_id],
        );
        if (lastResultRows[0]?.games_no && /^\d+$/.test(String(lastResultRows[0].games_no))) {
          const lastNum = BigInt(lastResultRows[0].games_no);
          const nextExpected = String(lastNum + 1n);
          if (period !== nextExpected) {
            period = nextExpected;
            await connection.execute(
              "UPDATE betlogs SET games_no = ? WHERE game_id = ?",
              [period, game_id],
            );
          }
        }
      } catch (_) {}
      if (!period && games_no !== undefined && games_no !== null && String(games_no).trim() !== "") {
        period = String(games_no).trim();
      }
      if (!period) {
        throw new AppError(
          400,
          "GAME_NUMBER_NOT_FOUND",
          "games_no not found for this game_id",
        );
      }

      const [users] = await connection.execute(
        "SELECT id, wallet, recharge FROM users WHERE id = ? FOR UPDATE",
        [userid],
      );
      const user = users[0];
      if (!user) {
        throw new AppError(400, "USER_NOT_FOUND", "The selected userid is invalid.");
      }

      if (Number(user.wallet) < amount) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "insufficient funds");
      }

      const [virtualGames] = await connection.execute(
        "SELECT multiplier, actual_number FROM virtual_games WHERE number = ? AND game_id = ?",
        [number, game_id],
      );
      if (virtualGames.length === 0) {
        throw new AppError(
          400,
          "INVALID_BET_NUMBER",
          "No valid virtual game found for the provided number and game ID.",
        );
      }

      const { commission, tradeAmount } = calculateBetAmounts(amount);
      await connection.execute(
        `INSERT INTO bets
          (amount, commission, trade_amount, number, games_no, game_id, userid, order_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          amount,
          commission,
          tradeAmount,
          number,
          period,
          game_id,
          userid,
          makeOrderId(),
        ],
      );

      for (const game of virtualGames) {
        await connection.execute(
          "UPDATE betlogs SET amount = amount + ? WHERE game_id = ? AND number = ?",
          [tradeAmount, game_id, game.actual_number],
        );
      }

      await connection.execute(
        `UPDATE users
         SET recharge = CASE WHEN recharge >= ? THEN recharge - ? ELSE 0 END,
             wallet = wallet - ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [amount, amount, amount, userid],
      );

      await connection.commit();
      transactionStarted = false;
      return { status: 200, message: "Bet Successfully Placed" };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async getPendingBetPeriod(gameId) {
    assertStandardGameId(gameId);
    const [rows] = await this.poolProvider().execute(
      "SELECT games_no FROM bets WHERE game_id = ? AND status = 0 ORDER BY created_at DESC LIMIT 1",
      [gameId],
    );
    return rows[0]?.games_no ?? null;
  }

  async fetchProviderResult(gameId, period) {
    assertWingoGameId(gameId);
    const url = new URL(config.wingoResultApiUrl);
    url.searchParams.set("gameid", String(gameId));
    url.searchParams.set("period_no", String(period));

    let response;
    try {
      response = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new AppError(
        502,
        "RESULT_PROVIDER_UNAVAILABLE",
        "Unable to reach the configured Wingo result provider",
      );
    }

    if (!response.ok) {
      throw new AppError(
        502,
        "RESULT_PROVIDER_ERROR",
        `Wingo result provider returned HTTP ${response.status}`,
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new AppError(
        502,
        "INVALID_RESULT_PROVIDER_RESPONSE",
        "Wingo result provider returned invalid JSON",
      );
    }

    const result = Number(payload?.win_number);
    if (!Number.isInteger(result) || result < 0 || result > 9) {
      throw new AppError(
        502,
        "INVALID_RESULT_PROVIDER_RESPONSE",
        "Wingo result provider response must include win_number from 0 to 9",
      );
    }
    return result;
  }

  async settleRound(
    gameId,
    { forcedResult, periodOverride, providerResult = false } = {},
  ) {
    assertStandardGameId(gameId);
    const pool = this.poolProvider();
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;
      let winPercentage = 90;
      try {
        const [settings] = await connection.execute(
          "SELECT winning_percentage FROM game_settings WHERE id = ?",
          [gameId],
        );
        if (settings.length > 0 && settings[0].winning_percentage != null) {
          winPercentage = Number(settings[0].winning_percentage);
        } else {
          try {
            await connection.execute(
              "INSERT IGNORE INTO game_settings (id, name, winning_percentage, status) VALUES (?, ?, 90, 1)",
              [gameId, `Wingo Game ${gameId}`],
            );
          } catch (_) {}
        }
      } catch (_) {}

      let [logs] = await connection.execute(
        "SELECT id, games_no, number, amount FROM betlogs WHERE game_id = ? ORDER BY id FOR UPDATE",
        [gameId],
      );
      if (logs.length === 0) {
        const initialGameNo = formatPeriod(new Date(), gameId);
        const numbers = WINGO_GAME_IDS.includes(Number(gameId))
          ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
          : [0];
        for (const num of numbers) {
          try {
            await connection.execute(
              "INSERT INTO betlogs (game_id, games_no, number, amount) VALUES (?, ?, ?, 0.00)",
              [gameId, initialGameNo, String(num)],
            );
          } catch (_) {}
        }
        const [seeded] = await connection.execute(
          "SELECT id, games_no, number, amount FROM betlogs WHERE game_id = ? ORDER BY id FOR UPDATE",
          [gameId],
        );
        logs = seeded;
      }
      if (logs.length === 0) {
        throw new AppError(
          409,
          "ROUND_NOT_FOUND",
          "No current game number found",
        );
      }

      let gameNo = periodOverride ? String(periodOverride) : (logs[0]?.games_no ? String(logs[0].games_no) : null);
      if (!gameNo) {
        gameNo = formatPeriod(new Date(), gameId);
      }
      try {
        const [lastResultRows] = await connection.execute(
          "SELECT games_no FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1",
          [gameId],
        );
        if (lastResultRows[0]?.games_no && /^\d+$/.test(String(lastResultRows[0].games_no))) {
          const lastNum = BigInt(lastResultRows[0].games_no);
          const nextExpected = String(lastNum + 1n);
          if (!periodOverride || (/^\d+$/.test(gameNo) && BigInt(gameNo) <= lastNum)) {
            gameNo = nextExpected;
          }
        }
      } catch (_) {}
      const [totalRows] = await connection.execute(
        "SELECT COALESCE(SUM(amount), 0) AS amount FROM bets WHERE game_id = ? AND games_no = ?",
        [gameId, gameNo],
      );
      const totalAmount = Number(totalRows[0].amount ?? 0);
      const winLimit = totalAmount * (winPercentage / 100);

      const [adminResults] =
        forcedResult === undefined
          ? await connection.execute(
              "SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1",
              [gameNo, gameId],
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
           FROM betlogs
           WHERE game_id = ? AND games_no = ?
           GROUP BY number`,
          [gameId, gameNo],
        );
        resultNumber = chooseWinningNumber(
          {
            logNumbers: logs.map(({ number }) => number),
            totalBet: totalAmount,
            amountRows,
          },
        );
      }

      if (
        !Number.isInteger(resultNumber) ||
        resultNumber < 0 ||
        (WINGO_GAME_IDS.includes(gameId) && resultNumber > 9)
      ) {
        throw new AppError(
          422,
          "INVALID_RESULT_NUMBER",
          WINGO_GAME_IDS.includes(gameId)
            ? "The selected Wingo result must be a number from 0 to 9"
            : "The selected result number is invalid",
        );
      }

      let resultNames = [];
      try {
        const [names] = await connection.execute(
          `SELECT name FROM virtual_games
           WHERE actual_number = ? AND game_id = ? AND multiplier != '1.5'`,
          [resultNumber, gameId],
        );
        resultNames = names;
      } catch (_) {}

      if (resultNames.length === 0 && WINGO_GAME_IDS.includes(gameId)) {
        const isBig = resultNumber >= 5;
        const color =
          resultNumber === 0 ? "Violet" :
          resultNumber === 5 ? "Violet" :
          [1, 3, 7, 9].includes(resultNumber) ? "Green" : "Red";
        resultNames = [
          { name: String(resultNumber) },
          { name: isBig ? "Big" : "Small" },
          { name: color },
        ];
      }

      if (WINGO_GAME_IDS.includes(gameId) && resultNumber === 0) {
        await connection.execute(
          `UPDATE bets
           SET win_amount = trade_amount * 9, win_number = 0, status = 1, updated_at = CURRENT_TIMESTAMP
           WHERE games_no = ? AND game_id = ? AND number = 0`,
          [gameNo, gameId],
        );
      }

      let winningOptions = [];
      try {
        const [options] = await connection.execute(
          "SELECT number, multiplier FROM virtual_games WHERE actual_number = ? AND game_id = ?",
          [resultNumber, gameId],
        );
        winningOptions = options;
      } catch (_) {}

      if (winningOptions.length === 0) {
        if (WINGO_GAME_IDS.includes(gameId)) {
          const isBig = resultNumber >= 5;
          winningOptions = [
            { number: String(resultNumber), multiplier: 9 },
            { number: isBig ? "40" : "50", multiplier: 2 },
            { number: isBig ? "Big" : "Small", multiplier: 2 },
          ];
          if (resultNumber === 0) {
            winningOptions.push(
              { number: "20", multiplier: 4.5 },
              { number: "Violet", multiplier: 4.5 },
              { number: "30", multiplier: 1.5 },
            );
          } else if (resultNumber === 5) {
            winningOptions.push(
              { number: "20", multiplier: 4.5 },
              { number: "Violet", multiplier: 4.5 },
              { number: "10", multiplier: 1.5 },
            );
          } else if ([1, 3, 7, 9].includes(resultNumber)) {
            winningOptions.push(
              { number: "10", multiplier: 2 },
              { number: "Green", multiplier: 2 },
            );
          } else {
            winningOptions.push(
              { number: "30", multiplier: 2 },
              { number: "Red", multiplier: 2 },
            );
          }
        } else {
          winningOptions = [{ number: String(resultNumber), multiplier: 9 }];
        }
      }
      for (const option of winningOptions) {
        const amountColumn = GROSS_PAYOUT_GAME_IDS.has(gameId)
          ? "amount"
          : "trade_amount";
        await connection.execute(
          `UPDATE bets
           SET win_amount = ${amountColumn} * ?, win_number = ?, status = 1, updated_at = CURRENT_TIMESTAMP
           WHERE games_no = ? AND game_id = ? AND number = ?`,
          [
            Number(option.multiplier),
            resultNumber,
            gameNo,
            gameId,
            option.number,
          ],
        );
      }

      const [winningBets] = await connection.execute(
        "SELECT userid, win_amount FROM bets WHERE game_id = ? AND games_no = ? AND status = 1",
        [gameId, gameNo],
      );
      for (const bet of winningBets) {
        try {
          await connection.execute(
            `UPDATE users
             SET wallet = COALESCE(wallet, 0) + ?, winning_wallet = COALESCE(winning_wallet, 0) + ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [bet.win_amount, bet.win_amount, bet.userid],
          );
        } catch (_) {
          await connection.execute(
            `UPDATE users
             SET wallet = COALESCE(wallet, 0) + ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [bet.win_amount, bet.userid],
          );
        }
        try {
          await connection.execute(
            "UPDATE wallets SET balance = COALESCE(balance, 0) + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
            [bet.win_amount, bet.userid],
          );
        } catch (_) {}
      }

      await connection.execute(
        `UPDATE bets
         SET status = 2, win_number = ?, updated_at = CURRENT_TIMESTAMP
         WHERE games_no = ? AND game_id = ? AND status = 0`,
        [resultNumber, gameNo, gameId],
      );

      const resultValues = [
        resultNumber,
        gameNo,
        gameId,
        JSON.stringify(resultNames.map(({ name }) => name)),
        resultNumber,
      ];
      let insertResultSql = `INSERT INTO bet_results
        (number, games_no, game_id, status, json, random_card`;
      let insertResultValuesSql =
        "VALUES (?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";

      if (providerResult) {
        const [blocks] = await connection.execute(
          `SELECT \`block\` + CASE
             WHEN ? = 6 THEN 20
             WHEN ? = 7 THEN 60
             WHEN ? = 8 THEN 100
             ELSE 200
           END AS adjusted_block
           FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1`,
          [gameId, gameId, gameId, gameId],
        );
        const block = Number(blocks[0]?.adjusted_block ?? 100);
        const token = `${randomToken()}${resultNumber}`;
        insertResultSql += ", token, block";
        insertResultValuesSql =
          "VALUES (?, ?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
        resultValues.push(token, block);
      }

      insertResultSql += ", created_at, updated_at) ";
      try {
        await connection.execute(
          insertResultSql + insertResultValuesSql,
          resultValues,
        );
      } catch (insertErr) {
        const isDuplicateKey =
          insertErr &&
          (insertErr.code === "ER_DUP_ENTRY" ||
            String(insertErr.message || "").includes("Duplicate entry"));
        if (isDuplicateKey) {
          const [maxRows] = await connection.execute(
            "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM bet_results",
          );
          const nextId = Number(maxRows[0]?.next_id || 1);
          const fallbackSql = insertResultSql
            .replace(/INSERT INTO bet_results\s*\(/i, "INSERT INTO bet_results (id, ");
          const fallbackValuesSql = insertResultValuesSql.replace(
            "VALUES (",
            "VALUES (?, ",
          );
          await connection.execute(fallbackSql + fallbackValuesSql, [
            nextId,
            ...resultValues,
          ]);
          try {
            await connection.execute(
              "ALTER TABLE bet_results MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT",
            );
          } catch (_) {}
        } else {
          throw insertErr;
        }
      }

      let nextGameNo;
      try {
        nextGameNo = String(BigInt(gameNo) + 1n);
      } catch (_) {
        nextGameNo = formatPeriod(new Date(), gameId);
      }
      await connection.execute(
        "UPDATE betlogs SET amount = 0, games_no = ? WHERE game_id = ?",
        [nextGameNo, gameId],
      );
      await connection.commit();
      transactionStarted = false;

      const source =
        forcedResult !== undefined
          ? "Provider result used"
          : adminResults.length > 0
            ? "Admin result used"
            : "Result generated for";
      return {
        gameId,
        gameNo,
        resultNumber,
        totalAmount,
        winLimit,
        message: `✅ ${source} Game ID: ${gameId} | Game No: ${gameNo} | Result: ${resultNumber} | Total Bet: ₹${totalAmount} | Win Limit: ₹${winLimit}`,
      };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async getWinAmount({ userid, game_id, games_no }) {
    const [rows] = await this.poolProvider().execute(
      `SELECT SUM(win_amount) AS total_amount, games_no, game_id AS gameid, win_number AS number,
              CASE WHEN SUM(win_amount) = 0 THEN 'lose' ELSE 'win' END AS result
       FROM bets
       WHERE games_no = ? AND game_id = ? AND userid = ?
       GROUP BY games_no, game_id, win_number
       LIMIT 1`,
      [games_no, game_id, userid],
    );

    return rows[0] ?? null;
  }

  async getResults({
    game_id,
    limit,
    offset = 0,
    from_date,
    to_date,
    status,
    includeAll = false,
  }) {
    const where = ["game_id = ?"];
    const values = [game_id];
    if (from_date && to_date) {
      where.push("created_at >= ?", "created_at <= ?");
      values.push(
        includeAll ? from_date : `${from_date} 00:00:00`,
        includeAll ? to_date : `${to_date} 23:59:59.999`,
      );
    }
    if (status !== undefined && status !== null && status !== "") {
      where.push("status = ?");
      values.push(status);
    }

    const whereSql = where.join(" AND ");
    if (includeAll) {
      const [rows] = await this.poolProvider().execute(
        `SELECT * FROM bet_results WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset],
      );
      return rows;
    }

    const [counts] = await this.poolProvider().execute(
      `SELECT COUNT(*) AS total_result FROM bet_results WHERE ${whereSql}`,
      values,
    );
    const [rows] = await this.poolProvider().execute(
      `SELECT id, game_id, games_no, number, json, status, created_at
       FROM bet_results WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
    return { total_result: Number(counts[0].total_result), data: rows };
  }

  async getLastResult(gameId) {
    const [rows] = await this.poolProvider().execute(
      "SELECT * FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1",
      [gameId],
    );
    return rows[0] ?? null;
  }

  async getBetHistory({ userid, game_id, limit, offset, from_date, to_date }) {
    const where = ["bets.userid = ?", "bets.game_id = ?"];
    const values = [userid, game_id];
    if (from_date) {
      where.push("bets.created_at >= ?");
      values.push(from_date);
    }
    if (to_date) {
      where.push("bets.created_at <= ?");
      values.push(to_date);
    }
    const [rows] = await this.poolProvider().execute(
      `SELECT DISTINCT bets.*, game_settings.name AS game_name,
              virtual_games.name AS virtual_game_name
       FROM bets
       LEFT JOIN game_settings ON game_settings.id = bets.game_id
       LEFT JOIN virtual_games
         ON virtual_games.game_id = bets.game_id AND virtual_games.number = bets.number
       WHERE ${where.join(" AND ")}
       ORDER BY bets.id DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
    const [counts] = await this.poolProvider().execute(
      "SELECT COUNT(*) AS total_bet FROM bets WHERE userid = ? AND game_id = ?",
      [userid, game_id],
    );

    return { rows, totalBets: Number(counts[0].total_bet) };
  }

  async addAdminResult({ period_num, card_number, gameid }) {
    assertStandardGameId(gameid);
    const pool = this.poolProvider();
    const [existing] = await pool.execute(
      "SELECT id FROM admin_winner_results WHERE gamesno = ? AND gameId = ? LIMIT 1",
      [period_num, gameid],
    );
    if (existing.length > 0) {
      return false;
    }

    await pool.execute(
      "INSERT INTO admin_winner_results (gamesno, number, gameId) VALUES (?, ?, ?)",
      [period_num, card_number, gameid],
    );
    return true;
  }

  async getAdminHistory(gameId) {
    assertStandardGameId(gameId);
    const [bets] = await this.poolProvider().execute(
      "SELECT * FROM admin_winner_results WHERE gameId = ?",
      [gameId],
    );
    const [results] = await this.poolProvider().execute(
      "SELECT * FROM admin_winner_results WHERE gameId = ? ORDER BY id DESC LIMIT 1",
      [gameId],
    );
    return {
      bets,
      result_number: results.length > 0 ? Number(results[0].number) : null,
    };
  }

  async getAdminSetResults(gameId) {
    assertStandardGameId(gameId);
    const [rows] = await this.poolProvider().execute(
      `SELECT id, gamesno, gameId, number, status, created_at, updated_at
       FROM admin_winner_results WHERE gameId = ? ORDER BY id DESC`,
      [gameId],
    );
    return rows;
  }

  async fetchData(gameId) {
    assertStandardGameId(gameId);
    const pool = this.poolProvider();
    try {
      const [bets] = await pool.execute(
        `SELECT betlogs.*, game_settings.winning_percentage AS parsantage, game_settings.id AS id 
         FROM betlogs 
         LEFT JOIN game_settings ON betlogs.game_id = game_settings.id 
         WHERE betlogs.game_id = ? 
         ORDER BY betlogs.id DESC 
         LIMIT 20`,
        [gameId],
      );
      return { bets, gameid: Number(gameId) };
    } catch {
      const [bets] = await pool.execute(
        `SELECT * FROM betlogs WHERE game_id = ? ORDER BY id DESC LIMIT 20`,
        [gameId],
      );
      return { bets, gameid: Number(gameId) };
    }
  }

  async getLiveRoundSnapshot(gameId) {
    assertWingoGameId(gameId);
    const pool = this.poolProvider();
    const [logs] = await pool.execute(
      `SELECT games_no, number, amount
       FROM betlogs WHERE game_id = ? ORDER BY id ASC`,
      [gameId],
    );
    let gamesNo = logs[0]?.games_no ? String(logs[0].games_no) : null;
    try {
      const [lastResultRows] = await pool.execute(
        "SELECT games_no FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1",
        [gameId],
      );
      if (lastResultRows[0]?.games_no && /^\d+$/.test(String(lastResultRows[0].games_no))) {
        const lastNum = BigInt(lastResultRows[0].games_no);
        gamesNo = String(lastNum + 1n);
      }
    } catch (_) {}
    const numberTotals = Array.from({ length: 10 }, (_, number) => ({
      number,
      amount: 0,
      size: number >= 5 ? "Big" : "Small",
    }));
    for (const row of logs) {
      const number = Number(row.number);
      if (Number.isInteger(number) && number >= 0 && number <= 9) {
        numberTotals[number].amount = Number(row.amount ?? 0);
      }
    }

    let activeBets = [];
    if (gamesNo !== null) {
      const [bets] = await pool.execute(
        `SELECT b.id, b.userid, u.username, b.number, b.amount, b.trade_amount,
                b.status, b.games_no, b.game_id, b.created_at
         FROM bets b
         LEFT JOIN users u ON u.id = b.userid
         WHERE b.game_id = ? AND b.games_no = ? AND b.status = 0
         ORDER BY b.id DESC`,
        [gameId, String(gamesNo)],
      );
      activeBets = bets.map((bet) => ({
        ...bet,
        id: Number(bet.id),
        userid: Number(bet.userid),
        amount: Number(bet.amount ?? 0),
        trade_amount: Number(bet.trade_amount ?? 0),
      }));
    }

    const total = (values) => values.reduce((sum, item) => sum + item.amount, 0);
    const color = {
      green: total(numberTotals.filter(({ number }) => [1, 3, 7, 9].includes(number))),
      violet: total(numberTotals.filter(({ number }) => [0, 5].includes(number))),
      red: total(numberTotals.filter(({ number }) => [2, 4, 6, 8].includes(number))),
    };
    const size = {
      small: total(numberTotals.filter(({ number }) => number <= 4)),
      big: total(numberTotals.filter(({ number }) => number >= 5)),
    };

    return {
      game_id: Number(gameId),
      gameid: Number(gameId),
      games_no: gamesNo,
      period: gamesNo,
      active_bets_count: activeBets.length,
      total_bets_count: activeBets.length,
      total_amount: Number(activeBets.reduce((sum, bet) => sum + bet.amount, 0).toFixed(2)),
      pools: { color, size, numbers: numberTotals },
      active_bets: activeBets,
    };
  }

  async getAdminBetHistory({ gameId, limit, offset, status }) {
    assertWingoGameId(gameId);
    const where = ["b.game_id = ?"];
    const values = [gameId];
    if (status !== undefined && status !== "") {
      where.push("b.status = ?");
      values.push(status);
    }
    const pool = this.poolProvider();
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM bets b WHERE ${where.join(" AND ")}`,
      values,
    );
    const [rows] = await pool.execute(
      `SELECT b.id, b.userid, u.username, u.mobile, b.game_id, b.games_no,
              b.number, b.amount, b.commission, b.trade_amount, b.win_amount,
              b.win_number, b.status, b.created_at, b.updated_at
       FROM bets b LEFT JOIN users u ON u.id = b.userid
       WHERE ${where.join(" AND ")}
       ORDER BY b.id DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
    return {
      total: Number(countRows[0]?.total ?? 0),
      data: rows.map((row) => ({
        ...row,
        id: Number(row.id),
        userid: Number(row.userid),
        amount: Number(row.amount ?? 0),
        commission: Number(row.commission ?? 0),
        trade_amount: Number(row.trade_amount ?? 0),
        win_amount: Number(row.win_amount ?? 0),
      })),
    };
  }
}

function randomToken(length = 4) {
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += characters[crypto.randomInt(characters.length)];
  }
  return value;
}

module.exports = {
  STANDARD_GAME_IDS,
  WINGO_GAME_IDS,
  WingoService,
  calculateBetAmounts,
  chooseWinningNumber,
  formatPeriod,
};
