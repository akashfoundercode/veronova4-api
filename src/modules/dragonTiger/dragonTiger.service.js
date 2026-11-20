"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");
const {
  dealWinningCards,
  determineWinner,
  normalizeWinner,
  numberToWinner,
  winnerToNumber,
  getPayoutMultiplier,
} = require("./dragonTigerDeck");

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
    this.inMemoryForce = null; // cached admin force { winner, period }
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
    return period;
  }

  async ensureVirtualGamesSeeded(connectionOrPool, gameId = DRAGON_TIGER_GAME_ID) {
    if (Number(gameId) !== DRAGON_TIGER_GAME_ID) return;
    try {
      const [rows] = await connectionOrPool.execute(
        "SELECT id FROM virtual_games WHERE game_id = ? LIMIT 1",
        [Number(gameId)],
      );
      if (rows.length === 0) {
        await connectionOrPool.execute(
          "INSERT IGNORE INTO virtual_games (game_id, name, number, actual_number, multiplier) VALUES (10, 'Dragon', '1', '1', 2.00)"
        );
        await connectionOrPool.execute(
          "INSERT IGNORE INTO virtual_games (game_id, name, number, actual_number, multiplier) VALUES (10, 'Tiger', '2', '2', 2.00)"
        );
        await connectionOrPool.execute(
          "INSERT IGNORE INTO virtual_games (game_id, name, number, actual_number, multiplier) VALUES (10, 'Tie', '3', '3', 5.00)"
        );
      }
    } catch (_) {}
  }

  async ensureBetlogsSeeded(connectionOrPool, gameId = DRAGON_TIGER_GAME_ID, period = null) {
    if (Number(gameId) !== DRAGON_TIGER_GAME_ID) return;
    const p = period || (await this.getCurrentPeriod(gameId));
    try {
      const [rows] = await connectionOrPool.execute(
        "SELECT id, number FROM betlogs WHERE game_id = ? LIMIT 1",
        [Number(gameId)],
      );
      if (rows.length === 0) {
        // Auto-fix AUTO_INCREMENT if id 0 collision exists
        try {
          await connectionOrPool.execute(
            "UPDATE betlogs SET id = (SELECT next_id FROM (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM betlogs) t) WHERE id = 0",
          );
          await connectionOrPool.execute(
            "ALTER TABLE betlogs MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT",
          );
        } catch (_) {}

        for (const num of [1, 2, 3]) {
          try {
            await connectionOrPool.execute(
              "INSERT INTO betlogs (game_id, games_no, number, amount) VALUES (?, ?, ?, 0.00)",
              [Number(gameId), p, String(num)],
            );
          } catch (insErr) {
            if (insErr && String(insErr.message || "").includes("Duplicate entry")) {
              try {
                await connectionOrPool.execute(
                  "UPDATE betlogs SET id = (SELECT next_id FROM (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM betlogs) t) WHERE id = 0",
                );
                await connectionOrPool.execute(
                  "ALTER TABLE betlogs MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT",
                );
                await connectionOrPool.execute(
                  "INSERT INTO betlogs (game_id, games_no, number, amount) VALUES (?, ?, ?, 0.00)",
                  [Number(gameId), p, String(num)],
                );
              } catch (_) {}
            }
          }
        }
      }
    } catch (_) {}
  }

  async getCurrentPeriod(gameId = DRAGON_TIGER_GAME_ID) {
    const pool = this.poolProvider();
    let currentPeriod = null;

    try {
      // 1. Check last settled round in bet_results
      const [lastResultRows] = await pool.execute(
        "SELECT games_no FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1",
        [Number(gameId)],
      );
      let lastResultNo = null;
      if (lastResultRows.length > 0 && lastResultRows[0].games_no) {
        lastResultNo = String(lastResultRows[0].games_no);
      }

      // 2. Check betlogs
      const [rows] = await pool.execute(
        "SELECT games_no FROM betlogs WHERE game_id = ? ORDER BY id ASC LIMIT 1",
        [Number(gameId)],
      );
      let betlogNo = null;
      if (rows && rows.length > 0 && rows[0].games_no) {
        betlogNo = String(rows[0].games_no);
      }

      if (lastResultNo && /^\d+$/.test(lastResultNo)) {
        const nextFromRes = String(BigInt(lastResultNo) + 1n);
        if (!betlogNo || !/^\d+$/.test(betlogNo) || BigInt(betlogNo) <= BigInt(lastResultNo)) {
          currentPeriod = nextFromRes;
          try {
            await pool.execute(
              "UPDATE betlogs SET games_no = ? WHERE game_id = ?",
              [currentPeriod, Number(gameId)],
            );
          } catch (_) {}
        } else {
          currentPeriod = betlogNo;
        }
      } else if (betlogNo && /^\d+$/.test(betlogNo)) {
        currentPeriod = betlogNo;
      }
    } catch (_) {}

    if (!currentPeriod) {
      const date = new Date();
      currentPeriod = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
        String(DRAGON_TIGER_GAME_ID).padStart(2, "0"),
        "0001",
      ].join("");
    }

    // Auto-seed if tables were truncated
    await this.ensureBetlogsSeeded(pool, gameId, currentPeriod);
    await this.ensureVirtualGamesSeeded(pool, gameId);

    return currentPeriod;
  }

  /**
   * Explicitly advances period to next round in both database and memory
   */
  async advancePeriod(gameId = DRAGON_TIGER_GAME_ID, currentPeriod = null) {
    const pool = this.poolProvider();
    let base = currentPeriod;
    if (!base || !/^\d+$/.test(String(base))) {
      base = await this.getCurrentPeriod(gameId);
    }

    let nextPeriod;
    if (base && /^\d+$/.test(String(base))) {
      nextPeriod = String(BigInt(base) + 1n);
    } else {
      const d = new Date();
      nextPeriod = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
        String(DRAGON_TIGER_GAME_ID).padStart(2, "0"),
        "0001",
      ].join("");
    }

    try {
      const [upd] = await pool.execute(
        "UPDATE betlogs SET amount = 0, games_no = ? WHERE game_id = ?",
        [nextPeriod, Number(gameId)],
      );
      if (upd.affectedRows === 0) {
        for (const num of [1, 2, 3]) {
          await pool.execute(
            "INSERT INTO betlogs (game_id, games_no, number, amount) VALUES (?, ?, ?, 0.00)",
            [Number(gameId), nextPeriod, String(num)],
          );
        }
      }
    } catch (_) {}

    return nextPeriod;
  }

  /**
   * Sets admin forced winner for Dragon Tiger (e.g. "D", "T", "Tie", or "auto")
   */
  async setAdminForce({ winner, period, gameId = DRAGON_TIGER_GAME_ID }) {
    const norm = normalizeWinner(winner);
    if (!norm) {
      throw new AppError(400, "INVALID_WINNER", "Invalid winner selection. Must be D, T, Tie, or auto.");
    }
    const currentPeriod = period || (await this.getCurrentPeriod(gameId));

    if (norm === "auto") {
      this.inMemoryForce = null;
      try {
        await this.poolProvider().execute(
          "DELETE FROM admin_winner_results WHERE (gamesno = ? OR gamesno = ?) AND (gameId = ? OR gameId = 10)",
          [String(currentPeriod), currentPeriod, Number(gameId)],
        );
      } catch (_) {}
      return { success: true, winner: "auto", period: currentPeriod, cards: null, win_number: null };
    }

    // Pre-deal 52-cards immediately matching forced winner
    const dealt = dealWinningCards(norm);
    const cardNum = dealt.win_number;
    this.inMemoryForce = {
      winner: norm,
      win_number: cardNum,
      period: currentPeriod,
      multiplier: dealt.multiplier,
      cards: { dragon: dealt.dragon, tiger: dealt.tiger },
    };

    await this.addAdminResult({
      period_num: currentPeriod,
      card_number: cardNum,
      gameid: gameId,
    });

    return {
      success: true,
      winner: norm,
      win_number: cardNum,
      period: currentPeriod,
      multiplier: dealt.multiplier,
      cards: {
        dragon: dealt.dragon,
        tiger: dealt.tiger,
      },
    };
  }

  async getAdminForce(period = null, gameId = DRAGON_TIGER_GAME_ID) {
    const currentPeriod = period || (await this.getCurrentPeriod(gameId));
    if (this.inMemoryForce && (!this.inMemoryForce.period || String(this.inMemoryForce.period) === String(currentPeriod))) {
      return this.inMemoryForce.winner;
    }
    try {
      const [rows] = await this.poolProvider().execute(
        "SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? AND status = '1' ORDER BY id DESC LIMIT 1",
        [String(currentPeriod), Number(gameId)],
      );
      if (rows.length > 0) {
        const num = Number(rows[0].number);
        const norm = numberToWinner(num);
        if (norm && norm !== "auto") {
          const dealt = dealWinningCards(norm);
          this.inMemoryForce = {
            winner: norm,
            win_number: dealt.win_number,
            period: currentPeriod,
            multiplier: dealt.multiplier,
            cards: { dragon: dealt.dragon, tiger: dealt.tiger },
          };
          return norm;
        }
      }
    } catch (_) {}
    return "auto";
  }

  /**
   * Retrieves active round user bets & aggregated stats for Socket 2 (Admin Live Stream)
   */
  async getCurrentRoundBets(period = null, gameId = DRAGON_TIGER_GAME_ID) {
    const currentPeriod = period || (await this.getCurrentPeriod(gameId));
    const pool = this.poolProvider();

    const [rows] = await pool.execute(
      `SELECT b.id, b.userid, b.number, b.amount, b.created_at,
              COALESCE(u.username, u.mobile, CONCAT('User_', b.userid)) AS player_name
       FROM bets b
       LEFT JOIN users u ON u.id = b.userid
       WHERE b.game_id = ? AND b.games_no = ? AND b.status = 0
       ORDER BY b.id DESC`,
      [Number(gameId), String(currentPeriod)],
    );

    let dragonTotal = 0;
    let tigerTotal = 0;
    let tieTotal = 0;
    let dragonCount = 0;
    let tigerCount = 0;
    let tieCount = 0;

    const formattedBets = rows.map((r) => {
      const num = Number(r.number);
      const amt = Number(r.amount);
      let spot = "dragon";
      if (num === 2) {
        spot = "tiger";
        tigerTotal += amt;
        tigerCount++;
      } else if (num === 3) {
        spot = "tie";
        tieTotal += amt;
        tieCount++;
      } else {
        dragonTotal += amt;
        dragonCount++;
      }
      return {
        id: r.id,
        userid: r.userid,
        player_name: r.player_name,
        number: num,
        spot,
        amount: amt,
        created_at: r.created_at,
      };
    });

    const totalAmount = Number((dragonTotal + tigerTotal + tieTotal).toFixed(2));
    const totals = {
      dragon: Number(dragonTotal.toFixed(2)),
      tiger: Number(tigerTotal.toFixed(2)),
      tie: Number(tieTotal.toFixed(2)),
      total: totalAmount,
    };

    const counts = {
      dragon: dragonCount,
      tiger: tigerCount,
      tie: tieCount,
      total: formattedBets.length,
    };

    const lowestWinner = determineWinner({
      dragonTotal,
      tigerTotal,
      tieTotal,
      adminForced: null,
    });

    const activeForce = await this.getAdminForce(currentPeriod, gameId);

    return {
      period: currentPeriod,
      game_id: Number(gameId),
      totals,
      counts,
      lowest_spot: lowestWinner === "D" ? "dragon" : lowestWinner === "T" ? "tiger" : "tie",
      lowest_winner: lowestWinner,
      admin_force: activeForce,
      bets: formattedBets,
    };
  }

  /**
   * Retrieves last 120 rounds Dragon Tiger results formatted with 'D', 'T', 'Tie'
   */
  async getLast120Results(gameId = DRAGON_TIGER_GAME_ID) {
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      `SELECT id, games_no, number, card_id, json, created_at
       FROM bet_results
       WHERE game_id = ?
       ORDER BY id DESC
       LIMIT 120`,
      [Number(gameId)],
    );

    const formatted = rows.map((r) => {
      const num = Number(r.number);
      const winner = numberToWinner(num);
      let dragonCard = null;
      let tigerCard = null;

      try {
        if (r.card_id) {
          const parsed = typeof r.card_id === "string" ? JSON.parse(r.card_id) : r.card_id;
          if (parsed && typeof parsed === "object" && parsed.dragon && parsed.tiger) {
            dragonCard = parsed.dragon;
            tigerCard = parsed.tiger;
          } else if (Array.isArray(parsed) && parsed.length >= 2) {
            dragonCard = { rank: parsed[0] };
            tigerCard = { rank: parsed[1] };
          }
        }
      } catch (_) {}

      try {
        if ((!dragonCard || !tigerCard) && r.json) {
          const parsedJson = typeof r.json === "string" ? JSON.parse(r.json) : r.json;
          if (parsedJson && typeof parsedJson === "object" && parsedJson.dragon && parsedJson.tiger) {
            dragonCard = parsedJson.dragon;
            tigerCard = parsedJson.tiger;
          } else if (Array.isArray(parsedJson) && parsedJson.length >= 2) {
            if (typeof parsedJson[0] === "object") {
              dragonCard = parsedJson[0];
              tigerCard = parsedJson[1];
            } else if (typeof parsedJson[0] === "string" && parsedJson[0].includes("/")) {
              dragonCard = { image: parsedJson[0] };
              tigerCard = { image: parsedJson[1] };
            }
          }
        }
      } catch (_) {}

      // Fallback cards if not present
      if (!dragonCard || !tigerCard) {
        const dummy = dealWinningCards(winner);
        dragonCard = dummy.dragon;
        tigerCard = dummy.tiger;
      }

      return {
        id: r.id,
        period: String(r.games_no),
        winner,
        win_number: num,
        dragon_card: dragonCard,
        tiger_card: tigerCard,
        created_at: r.created_at,
      };
    });

    return formatted;
  }

  /**
   * Unified place bet method supporting:
   * 1. spot: "dragon" | "tiger" | "tie"
   * 2. dragon: amt, tiger: amt, tie: amt
   * 3. bets: [{ number: 1|2|3, amount }]
   */
  async placeSingleOrMultiBet({ userid, bets, game_id = DRAGON_TIGER_GAME_ID, chargeCommission = false }) {
    const gameId = Number(game_id);
    let preparedBets = [];

    if (Array.isArray(bets)) {
      preparedBets = bets;
    } else if (bets && typeof bets === "object") {
      if (bets.spot && bets.amount) {
        const spot = String(bets.spot).toLowerCase();
        let number = 1;
        if (spot === "tiger" || spot === "t" || spot === "2") number = 2;
        else if (spot === "tie" || spot === "3") number = 3;
        preparedBets.push({ number, amount: Number(bets.amount) });
      } else {
        if (Number(bets.dragon) > 0) preparedBets.push({ number: 1, amount: Number(bets.dragon) });
        if (Number(bets.tiger) > 0) preparedBets.push({ number: 2, amount: Number(bets.tiger) });
        if (Number(bets.tie) > 0) preparedBets.push({ number: 3, amount: Number(bets.tie) });
      }
    }

    if (preparedBets.length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "At least one valid bet on Dragon, Tiger, or Tie is required.");
    }

    return this.placeBets({
      userid,
      game_id: gameId,
      bets: preparedBets,
      chargeCommission,
    });
  }

  async placeBets({ userid, game_id, bets, chargeCommission = false }) {
    assertBatchGameId(game_id);
    const gameId = Number(game_id);
    if (!Number.isInteger(Number(userid)) || Number(userid) < 1 || !Array.isArray(bets) || bets.length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid and a non-empty json bet array are required.");
    }

    const preparedBets = bets.map((bet) => {
      let number = bet?.number;
      if (number === undefined && bet?.spot) {
        const s = String(bet.spot).toLowerCase();
        number = s === "tiger" || s === "t" || s === "2" ? 2 : s === "tie" || s === "3" ? 3 : 1;
      }
      number = Number(number);
      const amount = Number(bet?.amount);
      if (!Number.isInteger(number) || !Number.isFinite(amount) || amount < 1) {
        throw new AppError(400, "VALIDATION_ERROR", "Each bet must have a valid number (1, 2, or 3) and amount of at least 1.");
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
      let period = periodRows[0]?.games_no;
      if (period === undefined || period === null) {
        period = await this.getCurrentPeriod(gameId);
        await this.ensureBetlogsSeeded(connection, gameId, period);
      }

      const [options] = await connection.execute(
        "SELECT number, actual_number, multiplier FROM virtual_games WHERE game_id = ?",
        [gameId],
      );
      const optionByNumber = new Map(options.map((option) => [Number(option.number), option]));

      // Fallback for Dragon Tiger default options if table not seeded
      if (optionByNumber.size === 0 && gameId === DRAGON_TIGER_GAME_ID) {
        await this.ensureVirtualGamesSeeded(connection, gameId);
        optionByNumber.set(1, { number: 1, actual_number: 1, multiplier: 2.0 });
        optionByNumber.set(2, { number: 2, actual_number: 2, multiplier: 2.0 });
        optionByNumber.set(3, { number: 3, actual_number: 3, multiplier: 5.0 });
      }

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
      const insertedBets = [];
      for (const bet of preparedBets) {
        const option = optionByNumber.get(bet.number);
        const commission = chargeCommission ? Number((bet.amount * 0.02).toFixed(2)) : 0;
        const tradeAmount = Number((bet.amount - commission).toFixed(2));
        const [insertRes] = await connection.execute(
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

        insertedBets.push({
          id: insertRes.insertId,
          userid: Number(userid),
          number: bet.number,
          spot: bet.number === 1 ? "dragon" : bet.number === 2 ? "tiger" : "tie",
          amount: bet.amount,
          period,
          order_id: orderId,
        });
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

      const newBalance = Number((Number(user.wallet) - total).toFixed(2));
      return {
        status: 200,
        message: "Bet Successfully",
        period,
        total_amount: total,
        balance: newBalance,
        bets: insertedBets,
      };
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
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS admin_winner_results (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          gamesno VARCHAR(100) NOT NULL,
          gameId INT NOT NULL,
          number VARCHAR(100) NULL,
          status VARCHAR(100) NOT NULL DEFAULT '1',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (_) {}
    const [existing] = await pool.execute(
      "SELECT id FROM admin_winner_results WHERE gamesno = ? AND gameId = ? LIMIT 1",
      [period_num, gameId],
    );
    if (existing.length > 0) {
      await pool.execute(
        "UPDATE admin_winner_results SET number = ?, status = '1', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [String(card_number), existing[0].id],
      );
      return true;
    }

    const executeInsert = async (explicitId = null) => {
      if (explicitId !== null) {
        return pool.execute(
          "INSERT INTO admin_winner_results (id, gamesno, number, gameId, status) VALUES (?, ?, ?, ?, '1')",
          [explicitId, period_num, String(card_number), gameId],
        );
      }
      return pool.execute(
        "INSERT INTO admin_winner_results (gamesno, number, gameId, status) VALUES (?, ?, ?, '1')",
        [period_num, String(card_number), gameId],
      );
    };

    try {
      await executeInsert();
    } catch (insertErr) {
      const isDuplicateKey =
        insertErr &&
        (insertErr.code === "ER_DUP_ENTRY" ||
          String(insertErr.message || "").includes("Duplicate entry"));
      const errMsg = String(insertErr?.message || insertErr?.sqlMessage || "").toLowerCase();

      if (isDuplicateKey && (errMsg.includes("primary") || errMsg.includes("'0' for key"))) {
        try {
          await pool.execute(
            "UPDATE admin_winner_results SET id = (SELECT next_id FROM (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM admin_winner_results) t) WHERE id = 0",
          );
        } catch (_) {}

        const [maxRows] = await pool.execute(
          "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM admin_winner_results",
        );
        const nextId = Number(maxRows[0]?.next_id || 1);
        await executeInsert(nextId);

        try {
          await pool.execute(
            "ALTER TABLE admin_winner_results MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT",
          );
        } catch (_) {}
      } else if (isDuplicateKey) {
        await pool.execute(
          "UPDATE admin_winner_results SET number = ?, status = '1', updated_at = CURRENT_TIMESTAMP WHERE gamesno = ? AND gameId = ?",
          [String(card_number), period_num, gameId],
        );
      } else {
        throw insertErr;
      }
    }
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

  /**
   * Settles active Dragon Tiger round:
   * 1. Check admin force
   * 2. If not forced -> Lowest total bet amount wins
   * 3. Deal 52-card cards strictly matching winner
   * 4. Multipliers: Dragon 2x, Tiger 2x, Tie 5x
   * 5. Credit user wallets
   * 6. Insert bet_results with winner (1=D, 2=T, 3=Tie) and cards
   * 7. Advance betlogs.games_no
   */
  async settleRound(gameId = DRAGON_TIGER_GAME_ID, explicitWinner = null, periodOverride = null) {
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
      let gameNo = periodOverride ? String(periodOverride) : null;
      if (!gameNo) {
        if (logRows.length === 0) {
          gameNo = await this.getCurrentPeriod(gameId);
          await this.ensureBetlogsSeeded(connection, gameId, gameNo);
        } else {
          gameNo = String(logRows[0].games_no);
        }
      }
      const [existing] = await connection.execute(
        "SELECT id, number, card_id, json, win_number FROM bet_results WHERE game_id = ? AND games_no = ? LIMIT 1",
        [gameId, gameNo],
      );
      if (existing.length > 0) {
        let nextNo = gameNo;
        if (/^\d+$/.test(gameNo)) {
          nextNo = String(BigInt(gameNo) + 1n);
          try {
            await connection.execute(
              "UPDATE betlogs SET amount = 0, games_no = ? WHERE game_id = ?",
              [nextNo, gameId],
            );
          } catch (_) {}
        }
        await connection.commit();
        transactionStarted = false;
        const existingNum = Number(existing[0].number || existing[0].win_number || 1);
        const winner = numberToWinner(existingNum);
        let cards = null;
        try {
          if (existing[0].card_id) cards = JSON.parse(existing[0].card_id);
        } catch (_) {}
        if (!cards) {
          const dealt = dealWinningCards(winner);
          cards = { dragon: dealt.dragon, tiger: dealt.tiger };
        }
        return {
          message: "Dragon Tiger round already settled",
          games_no: gameNo,
          winner,
          win_number: existingNum,
          cards,
          multiplier: getPayoutMultiplier(winner),
          already_settled: true,
        };
      }

      // Check for explicit or admin forced winner
      const explicitInput = typeof explicitWinner === "object" && explicitWinner !== null
        ? (explicitWinner.forcedResult ?? explicitWinner.winner ?? explicitWinner.number)
        : explicitWinner;
      let forced = explicitInput ? (normalizeWinner(explicitInput) || numberToWinner(explicitInput)) : null;

      // 1. In-memory forced winner check (direct)
      if (!forced && this.inMemoryForce?.winner && String(this.inMemoryForce.period) === String(gameNo)) {
        forced = this.inMemoryForce.winner;
      }

      // 2. Query admin_winner_results by exact gamesno
      if (!forced) {
        try {
          const [adminResults] = await connection.execute(
            "SELECT number FROM admin_winner_results WHERE (gamesno = ? OR gamesno = ?) AND (gameId = ? OR gameId = 10) AND (status = '1' OR status = 1) ORDER BY id DESC LIMIT 1",
            [gameNo, String(gameNo), gameId],
          );
          if (adminResults.length > 0) {
            const adminNum = Number(adminResults[0].number);
            if (adminNum >= 1 && adminNum <= 3) {
              forced = numberToWinner(adminNum);
            }
          }
        } catch (_) {}
      }

      // 3. Legacy admin table is also scoped to this exact period.
      if (!forced) {
        try {
          const [dragonAdminRows] = await connection.execute(
            "SELECT number FROM dragon_admin_result WHERE gamesno = ? AND (status = '1' OR status = 1) ORDER BY id DESC LIMIT 1",
            [String(gameNo)],
          );
          if (dragonAdminRows.length > 0) {
            const dNum = Number(dragonAdminRows[0].number);
            if (dNum >= 1 && dNum <= 3) {
              forced = numberToWinner(dNum);
            }
          }
        } catch (_) {}
      }

      // Determine winner
      let winnerCode;
      if (forced && forced !== "auto") {
        winnerCode = forced;
      } else {
        // Auto mode: Lowest bet amount wins!
        // Calculate bets in active round
        const [activeBets] = await connection.execute(
          "SELECT number, amount FROM bets WHERE game_id = ? AND games_no = ? AND status = 0",
          [gameId, gameNo],
        );
        let dragonTotal = 0;
        let tigerTotal = 0;
        let tieTotal = 0;
        for (const b of activeBets) {
          const num = Number(b.number);
          const amt = Number(b.amount);
          if (num === 1) dragonTotal += amt;
          else if (num === 2) tigerTotal += amt;
          else if (num === 3) tieTotal += amt;
        }

        winnerCode = determineWinner({
          dragonTotal,
          tigerTotal,
          tieTotal,
          adminForced: null,
        });
      }

      // Capture pre-dealt cards if this inMemoryForce had cards pre-dealt for this winner
      const preDealtCards = (this.inMemoryForce?.cards && String(this.inMemoryForce.period) === String(gameNo) && this.inMemoryForce.winner === winnerCode)
        ? this.inMemoryForce.cards
        : null;

      // Consume used admin force so it doesn't affect subsequent rounds
      if (this.inMemoryForce && String(this.inMemoryForce.period) === String(gameNo)) {
        this.inMemoryForce = null;
      }
      try {
        await connection.execute(
          "UPDATE admin_winner_results SET status = '0' WHERE (gamesno = ? OR gamesno = ?) AND (gameId = ? OR gameId = 10) AND (status = '1' OR status = 1)",
          [gameNo, String(gameNo), gameId],
        );
      } catch (_) {}
      try {
        await connection.execute(
          "UPDATE dragon_admin_result SET status = '0' WHERE gamesno = ? AND (status = '1' OR status = 1)",
          [gameNo],
        );
      } catch (_) {}

      const resultNumber = winnerToNumber(winnerCode);
      const payoutMultiplier = getPayoutMultiplier(winnerCode);

      // Deal 52-card cards strictly matching winner (reusing pre-dealt cards if available)
      const dealt = preDealtCards
        ? {
            dragon: preDealtCards.dragon,
            tiger: preDealtCards.tiger,
            winner: winnerCode,
            win_number: resultNumber,
            multiplier: payoutMultiplier,
          }
        : dealWinningCards(winnerCode);
      const cardIds = JSON.stringify({
        dragon: dealt.dragon,
        tiger: dealt.tiger,
      });
      const cardImages = JSON.stringify([dealt.dragon.image, dealt.tiger.image]);
      const cardName = `${dealt.dragon.symbol} vs ${dealt.tiger.symbol}`;

      // Insert into bet_results with full card details
      try {
        await connection.execute(
          `INSERT INTO bet_results (number, win_number, games_no, game_id, card_id, card_name, image, multiplier, random_card, status, json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            resultNumber,
            resultNumber,
            gameNo,
            gameId,
            cardIds,
            cardName,
            dealt.dragon.image,
            payoutMultiplier,
            resultNumber,
            cardImages,
          ],
        );
      } catch (insertErr) {
        // Fallback for minimal schema
        await connection.execute(
          `INSERT INTO bet_results (number, games_no, game_id, card_id, status, json, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [resultNumber, gameNo, gameId, cardIds, cardImages],
        );
      }

      // Settle bets for this round
      // Winners: status = 1, win_amount = trade_amount * payoutMultiplier
      await connection.execute(
        `UPDATE bets
         SET win_amount = trade_amount * ?,
             win_number = ?,
             status = 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE games_no = ? AND game_id = ? AND number = ? AND status = 0`,
        [payoutMultiplier, resultNumber, gameNo, gameId, resultNumber],
      );

      // Credit winnings to user wallets
      const [winningBets] = await connection.execute(
        "SELECT userid, win_amount FROM bets WHERE game_id = ? AND games_no = ? AND status = 1",
        [gameId, gameNo],
      );
      for (const bet of winningBets) {
        await connection.execute(
          `UPDATE users
           SET wallet = wallet + ?,
               winning_wallet = winning_wallet + ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [bet.win_amount, bet.win_amount, bet.userid],
        );
      }

      // Mark losers: status = 2, win_amount = 0
      await connection.execute(
        `UPDATE bets
         SET status = 2,
             win_number = ?,
             win_amount = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE games_no = ? AND game_id = ? AND status = 0`,
        [resultNumber, gameNo, gameId],
      );

      // Calculate next game number accurately using BigInt
      let nextGameNo = gameNo;
      if (/^\d+$/.test(gameNo)) {
        nextGameNo = String(BigInt(gameNo) + 1n);
      } else {
        const d = new Date();
        nextGameNo = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, "0"),
          String(d.getDate()).padStart(2, "0"),
          String(gameId).padStart(2, "0"),
          "0001",
        ].join("");
      }

      await connection.execute(
        "UPDATE betlogs SET amount = 0, games_no = ? WHERE game_id = ?",
        [nextGameNo, gameId],
      );

      await connection.commit();
      transactionStarted = false;

      // Clear memory force cache for settled round
      this.inMemoryForce = null;

      return {
        message: "Dragon Tiger result generated successfully",
        games_no: gameNo,
        winner: winnerCode,
        win_number: resultNumber,
        multiplier: payoutMultiplier,
        cards: {
          dragon: dealt.dragon,
          tiger: dealt.tiger,
        },
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
  DRAGON_TIGER_GAME_ID,
  DragonTigerService,
  chooseOutcome,
};
