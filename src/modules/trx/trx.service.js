"use strict";

const config = require("../../config");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

const TRX_GAME_IDS = Object.freeze([6, 7, 8, 9]);
const RESULT_TABLES = Object.freeze({
  6: "trx_one_min_result",
  7: "trx_three_min_result",
  8: "trx_five_min_result",
  9: "trx_ten_min_result",
});
const TRX_RESULT_FEED_GAME_ID = 1;

function assertTrxGameId(value) {
  const gameId = Number(value);
  if (!TRX_GAME_IDS.includes(gameId)) {
    throw new AppError(400, "INVALID_GAME_ID", "The selected TRX game_id is invalid.");
  }
  return gameId;
}

function formatDatabaseDate(date) {
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
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}:${value.second}`;
}

function buildTrxResult({ gameId, number, datetime, digit, lastFour, fullHash }) {
  if (!/^\d+$/.test(String(number)) || !Number.isInteger(Number(digit)) ||
      Number(digit) < 0 || Number(digit) > 9 || !datetime ||
      typeof fullHash !== "string" || fullHash.length === 0) {
    throw new AppError(502, "INVALID_TRX_RESULT", "TRX result provider returned incomplete block data.");
  }
  return {
    table: RESULT_TABLES[assertTrxGameId(gameId)],
    gameid: Number(gameId),
    blocknumber: String(number),
    blocktime: datetime,
    result: Number(digit),
    hash_value: `**${lastFour}`,
    five_digit_value: fullHash,
  };
}

function parseTrxBlock(record, gameId) {
  const fullHash = record?.tr_digits;
  const blockNumber = record?.tr_number;
  let hashTimestamp;
  try {
    hashTimestamp = JSON.parse(record?.tr_overall_hash ?? "{}")?.updatedTimestamp;
  } catch {
    throw new AppError(502, "INVALID_TRX_RESULT", "TRX result provider returned an invalid block timestamp.");
  }
  if (typeof fullHash !== "string" || !/^\d+$/.test(String(blockNumber)) ||
      !Number.isFinite(Number(hashTimestamp)) || Number(hashTimestamp) <= 0) {
    throw new AppError(502, "INVALID_TRX_RESULT", "TRX result provider returned incomplete block data.");
  }
  const digitMatch = fullHash.match(/\d(?=\D*$)/);
  if (!digitMatch) {
    throw new AppError(502, "INVALID_TRX_RESULT", "TRX block hash did not contain a result digit.");
  }
  return buildTrxResult({
    gameId,
    number: blockNumber,
    datetime: formatDatabaseDate(new Date(Number(hashTimestamp))),
    digit: Number(digitMatch[0]),
    lastFour: fullHash.slice(-4),
    fullHash,
  });
}

function initialTrxPeriod(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}103010409`;
}

function nextTrxPeriod(previous, previousBlocktime, date) {
  const today = formatDatabaseDate(date).slice(2, 10);
  const previousDate = String(previousBlocktime ?? "").slice(2, 10);
  if (previous && previousDate === today && /^\d+$/.test(String(previous))) {
    return (BigInt(previous) + 1n).toString();
  }
  return initialTrxPeriod(date);
}

function resultPatternForBet(betNumber, winningNumber, winningVirtualGames) {
  const isWinningDigit = winningVirtualGames.some((game) => Number(game.actual_number) === winningNumber);
  const name = (expected) => winningVirtualGames.some(
    (game) => Number(game.actual_number) === winningNumber &&
      String(game.name).toLowerCase() === expected.toLowerCase(),
  );
  if (betNumber === 40) return name("Big");
  if (betNumber === 50) return name("Small");
  if (betNumber === 30) return name("Red");
  if (betNumber === 10) return name("Green");
  if (betNumber === 20) return winningNumber === 0 || winningNumber === 5;
  return isWinningDigit && betNumber === winningNumber;
}

class TrxService {
  constructor(poolProvider = getPool, fetchImpl = globalThis.fetch) {
    this.poolProvider = poolProvider;
    this.fetchImpl = fetchImpl;
  }

  async getGameSerialNo(date = new Date()) {
    const periodDate = formatDatabaseDate(date).slice(0, 10).replaceAll("-", "");
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      for (const gameId of TRX_GAME_IDS) {
        const gamesNo = `${periodDate}${String(gameId).padStart(2, "0")}0001`;
        await connection.execute(
          "UPDATE betlogs SET games_no = ? WHERE game_id = ?",
          [gamesNo, gameId],
        );
      }
      await connection.commit();
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async placeBet({ userid, game_id, number, amount }) {
    const gameId = assertTrxGameId(game_id);
    if (!Number.isInteger(Number(userid)) || Number(userid) < 1 ||
        !Number.isFinite(Number(amount)) || Number(amount) < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid userid or amount.");
    }
    const betNumber = Number(number);
    if (!Number.isInteger(betNumber)) {
      throw new AppError(400, "VALIDATION_ERROR", "The number field must be an integer.");
    }
    const stake = Number(amount);
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [users] = await connection.execute(
        "SELECT id, wallet, recharge, status FROM users WHERE id = ? FOR UPDATE",
        [userid],
      );
      const user = users[0];
      if (!user) throw new AppError(400, "USER_NOT_FOUND", "The selected userid is invalid.");
      if (Number(user.status) !== 1) throw new AppError(400, "USER_BLOCKED", "User blocked by admin..!");
      if (Number(user.wallet) < stake) throw new AppError(400, "INSUFFICIENT_FUNDS", "insufficient funds");

      const [periodRows] = await connection.execute(
        "SELECT games_no FROM betlogs WHERE game_id = ? ORDER BY id ASC LIMIT 1 FOR UPDATE",
        [gameId],
      );
      const period = periodRows[0]?.games_no;
      if (!period) throw new AppError(400, "GAME_NUMBER_NOT_FOUND", "games_no not found for this game_id");

      const [virtualGames] = await connection.execute(
        "SELECT name, multiplier, actual_number FROM virtual_games WHERE number = ? AND game_id = ?",
        [betNumber, gameId],
      );
      if (virtualGames.length === 0) {
        throw new AppError(400, "INVALID_BET_NUMBER", "No valid virtual game found for the provided number and game ID.");
      }

      const commission = Number((stake * 0.02).toFixed(2));
      const tradeAmount = Number((stake - commission).toFixed(2));
      const orderId = `${Date.now()}${String(Math.floor(Math.random() * 88889) + 11111)}`;
      await connection.execute(
        `INSERT INTO bets
          (amount, commission, trade_amount, number, games_no, game_id, userid, order_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [stake, commission, tradeAmount, betNumber, period, gameId, userid, orderId],
      );
      for (const game of virtualGames) {
        await connection.execute(
          "UPDATE betlogs SET amount = amount + ? WHERE game_id = ? AND number = ?",
          [tradeAmount, game.actual_number, gameId],
        );
      }
      await connection.execute(
        `UPDATE users
         SET recharge = CASE WHEN recharge >= ? THEN recharge - ? ELSE 0 END,
             wallet = wallet - ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [stake, stake, stake, userid],
      );
      await connection.commit();
      transactionStarted = false;
      return { status: 200, message: "Bet Successfully Placed" };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getBetHistory({ userid, game_id, limit, offset, from_date, to_date }) {
    const gameId = assertTrxGameId(game_id);
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

  async getResultList({ game_id, limit = 25, offset = 0 }) {
    const gameId = assertTrxGameId(game_id);
    const table = RESULT_TABLES[gameId];
    const filter = gameId === 6 ? "" : " AND period <> ''";
    const [allRows] = await this.poolProvider().execute(
      `SELECT period FROM \`${table}\`
       WHERE SECOND(blocktime) = 54 AND gameid = ?${filter}
       ORDER BY id DESC`,
      [gameId],
    );
    const [rows] = await this.poolProvider().execute(
      `SELECT *, CAST(period AS UNSIGNED) AS period_int FROM \`${table}\`
       WHERE SECOND(blocktime) = 54 AND gameid = ?${filter}
       ORDER BY id DESC LIMIT ?, ?`,
      [gameId, offset, limit],
    );
    const lastPeriod = allRows[0]?.period;
    return {
      nextPeriod: lastPeriod === undefined ? null : (BigInt(lastPeriod) + 1n).toString(),
      totalCount: allRows.length,
      status: rows.length ? "200" : "400",
      data: rows,
    };
  }

  async getResultByPeriod({ game_id, period_no }) {
    const gameId = assertTrxGameId(game_id);
    const table = RESULT_TABLES[gameId];
    const [rows] = await this.poolProvider().execute(
      `SELECT result FROM \`${table}\`
       WHERE SECOND(blocktime) = 54 AND gameid = ? AND period = ?
       ORDER BY id DESC LIMIT 1`,
      [gameId, String(period_no)],
    );
    return {
      win_number: rows[0] ? String(rows[0].result) : "",
      status: rows.length ? "200" : "400",
    };
  }

  async processBlockResults(gameId, records) {
    const validGameId = assertTrxGameId(gameId);
    if (!Array.isArray(records) || records.length === 0) {
      return { status: "No data found for game ID 1" };
    }
    const row = parseTrxBlock(records[0], validGameId);
    if (row.blocktime.slice(-2) !== "54") {
      return { status: `Processed first record for game_id ${validGameId}` };
    }

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [existing] = await connection.execute(
        `SELECT id FROM \`${row.table}\` WHERE blocknumber = ? LIMIT 1 FOR UPDATE`,
        [row.blocknumber],
      );
      if (existing.length > 0) {
        await connection.rollback();
        transactionStarted = false;
        return { status: `Processed first record for game_id ${validGameId}` };
      }
      const [previousRows] = await connection.execute(
        `SELECT period, blocktime FROM \`${row.table}\`
         WHERE SECOND(blocktime) = 54 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      );
      const period = nextTrxPeriod(
        previousRows[0]?.period,
        previousRows[0]?.blocktime,
        new Date(`${row.blocktime.replace(" ", "T")}+05:30`),
      );
      await connection.execute(
        `INSERT INTO \`${row.table}\`
          (period, blocktime, result, hash_value, blocknumber, five_digit_value, gameid)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [period, row.blocktime, row.result, row.hash_value, row.blocknumber, row.five_digit_value, row.gameid],
      );
      await connection.commit();
      transactionStarted = false;
      return { status: `Processed first record for game_id ${validGameId}` };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async fetchBlockRecords(gameId) {
    const url = new URL(config.trx.resultFeedUrl);
    url.searchParams.set("gameid", String(TRX_RESULT_FEED_GAME_ID));
    url.searchParams.set("limit", "10");
    let response;
    try {
      response = await this.fetchImpl(url, { signal: AbortSignal.timeout(15_000) });
    } catch {
      throw new AppError(502, "TRX_PROVIDER_UNAVAILABLE", "Unable to reach the configured TRX result provider.");
    }
    if (!response.ok) {
      throw new AppError(502, "TRX_PROVIDER_ERROR", `TRX result provider returned HTTP ${response.status}.`);
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new AppError(502, "INVALID_TRX_PROVIDER_RESPONSE", "TRX result provider returned invalid JSON.");
    }
    return this.processBlockResults(gameId, payload?.result);
  }

  async fetchBlockHash(utcTimeMilliseconds) {
    if (!config.trx.managerKey) {
      throw new AppError(503, "TRX_PROVIDER_NOT_CONFIGURED", "Set TRX_MANAGER_KEY in .env to enable TRX block-hash requests.");
    }
    const timestamp = String(utcTimeMilliseconds);
    const url = new URL(config.trx.blockHashUrl);
    let response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.trx.managerKey}`,
          ValidateUser: `Bearer ${timestamp}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ utc_time_mili_sec: Number(timestamp) }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new AppError(502, "TRX_PROVIDER_UNAVAILABLE", "Unable to reach the TRX block-hash provider.");
    }
    const body = await response.text();
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      payload = body;
    }
    if (!response.ok) {
      throw new AppError(502, "TRX_PROVIDER_ERROR", `TRX block-hash provider returned HTTP ${response.status}.`);
    }
    return payload && typeof payload === "object" && Object.hasOwn(payload, "data")
      ? { status: 200, message: "Jilli bet history retrieved successfully.", data: payload.data }
      : { status: 200, message: "API response does not contain expected data.", api_response: payload };
  }

  async settlePeriod({ game_id, games_no, result }) {
    const gameId = assertTrxGameId(game_id);
    if (!Number.isInteger(Number(result)) || Number(result) < 0 || Number(result) > 9) {
      throw new AppError(400, "INVALID_RESULT", "The winning result must be a digit from 0 to 9.");
    }
    const winningNumber = Number(result);
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [bets] = await connection.execute(
        `SELECT id, userid, number, trade_amount FROM bets
         WHERE game_id = ? AND games_no = ? AND status = 0
         ORDER BY id FOR UPDATE`,
        [gameId, String(games_no)],
      );
      const [winningGames] = await connection.execute(
        "SELECT name, multiplier, actual_number, type FROM virtual_games WHERE game_id = ?",
        [gameId],
      );
      const resultRows = winningGames.filter((game) => Number(game.actual_number) === winningNumber);
      const payouts = new Map();
      for (const bet of bets) {
        const winning = resultPatternForBet(Number(bet.number), winningNumber, winningGames);
        const matchingVirtual = resultRows.find((game) => Number(game.number) === Number(bet.number)) ??
          resultRows.find((game) => {
            const number = Number(bet.number);
            const name = String(game.name).toLowerCase();
            return (number === 40 && name === "big") ||
              (number === 50 && name === "small") ||
              (number === 30 && name === "red") ||
              (number === 10 && name === "green") ||
              (number === 20 && (winningNumber === 0 || winningNumber === 5));
          });
        const multiplier = Number(matchingVirtual?.multiplier ?? 0);
        const winAmount = winning && Number.isFinite(multiplier)
          ? Number((Number(bet.trade_amount) * multiplier).toFixed(2))
          : 0;
        await connection.execute(
          "UPDATE bets SET status = ?, win_number = ?, win_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 0",
          [winning ? 1 : 2, winningNumber, winAmount, bet.id],
        );
        if (winAmount > 0) {
          payouts.set(Number(bet.userid), (payouts.get(Number(bet.userid)) ?? 0) + winAmount);
        }
      }
      for (const [userid, amount] of payouts) {
        await connection.execute(
          `UPDATE users SET wallet = wallet + ?, winning_wallet = winning_wallet + ?,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [amount, amount, userid],
        );
      }
      await connection.commit();
      transactionStarted = false;
      return { settled: bets.length, winners: payouts.size };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async settlePendingForGame(gameId) {
    const validGameId = assertTrxGameId(gameId);
    const table = RESULT_TABLES[validGameId];
    const [periodRows] = await this.poolProvider().execute(
      `SELECT DISTINCT games_no FROM bets
       WHERE game_id = ? AND status = 0 AND DATE(created_at) = CURRENT_DATE
       ORDER BY games_no`,
      [validGameId],
    );
    let settled = 0;
    for (const { games_no } of periodRows) {
      const result = await this.getResultByPeriod({ game_id: validGameId, period_no: games_no });
      if (result.win_number !== "") {
        const outcome = await this.settlePeriod({
          game_id: validGameId,
          games_no,
          result: result.win_number,
        });
        settled += outcome.settled;
      }
    }
    return { game_id: validGameId, settled, result_table: table };
  }
}

module.exports = {
  RESULT_TABLES,
  TRX_GAME_IDS,
  TrxService,
  assertTrxGameId,
  buildTrxResult,
  nextTrxPeriod,
  parseTrxBlock,
  resultPatternForBet,
};
