"use strict";

const { randomInt } = require("node:crypto");
const { getPool } = require("../../config/database");
const { DragonTigerService } = require("../dragonTiger/dragonTiger.service");
const AppError = require("../../shared/errors/AppError");

const ANDAR_BAHAR_GAME_ID = 13;

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function assertAndarBaharGameId(gameId) {
  if (Number(gameId) !== ANDAR_BAHAR_GAME_ID) {
    throw new AppError(400, "INVALID_GAME_ID", "Invalid Andar Bahar game_id");
  }
}

class AndarBaharService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
    this.commonBetService = new DragonTigerService(poolProvider);
  }

  async placeBets({ userid, game_id, bets, chargeCommission = false }) {
    assertAndarBaharGameId(game_id);
    return this.commonBetService.placeBets({
      userid,
      game_id: ANDAR_BAHAR_GAME_ID,
      bets,
      chargeCommission,
    });
  }

  async getBetHistory(options) {
    assertAndarBaharGameId(options.game_id);
    return this.commonBetService.getBetHistory(options);
  }

  async getWinAmount(options) {
    assertAndarBaharGameId(options.game_id);
    return this.commonBetService.getWinAmount(options);
  }

  async addAdminResult(options) {
    assertAndarBaharGameId(options.gameid);
    return this.commonBetService.addAdminResult(options);
  }

  async getAdminHistory(gameId) {
    assertAndarBaharGameId(gameId);
    return this.commonBetService.getAdminHistory(gameId);
  }

  async getAdminSetResults(gameId) {
    assertAndarBaharGameId(gameId);
    return this.commonBetService.getAdminSetResults(gameId);
  }

  async getResults(options) {
    assertAndarBaharGameId(options.game_id);
    return this.commonBetService.getResults(options);
  }

  async getLastResult(gameId) {
    assertAndarBaharGameId(gameId);
    return this.commonBetService.getLastResult(gameId);
  }

  async settleRound(gameId) {
    assertAndarBaharGameId(gameId);

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [logRows] = await connection.execute(
        "SELECT games_no, number, amount FROM betlogs WHERE game_id = ? ORDER BY id ASC FOR UPDATE",
        [ANDAR_BAHAR_GAME_ID],
      );
      if (logRows.length === 0) {
        throw new AppError(409, "ROUND_NOT_FOUND", "No current game number found");
      }
      const gameNo = logRows[0].games_no;
      const [existing] = await connection.execute(
        "SELECT id FROM bet_results WHERE game_id = ? AND games_no = ? LIMIT 1",
        [ANDAR_BAHAR_GAME_ID, gameNo],
      );
      if (existing.length > 0) {
        await connection.commit();
        transactionStarted = false;
        return { message: "Andar Bahar round already settled", games_no: gameNo };
      }

      const [adminResults] = await connection.execute(
        "SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1",
        [gameNo, ANDAR_BAHAR_GAME_ID],
      );
      let result = Number(adminResults[0]?.number);
      if (adminResults.length > 0 && !Number.isInteger(result)) {
        throw new AppError(409, "INVALID_ADMIN_RESULT", "The configured Andar Bahar result is invalid.");
      }
      if (!Number.isInteger(result)) {
        const [previousResults] = await connection.execute(
          "SELECT number FROM bet_results WHERE game_id = ? ORDER BY id DESC LIMIT 1",
          [ANDAR_BAHAR_GAME_ID],
        );
        result = chooseOutcome(
          logRows.map((row) => row.number),
          logRows.map((row) => ({ number: row.number, total_amt: row.amount })),
          previousResults.length ? Number(previousResults[0].number) : null,
        );
      }

      const [previousCards] = await connection.execute(
        `SELECT cards.id, cards.card
         FROM cards
         JOIN bet_results ON cards.card = bet_results.random_card
         WHERE bet_results.game_id = ?
         ORDER BY bet_results.id DESC LIMIT 1`,
        [ANDAR_BAHAR_GAME_ID],
      );
      const previousCardId = Number(previousCards[0]?.id ?? 1);
      const previousRank = Number(previousCards[0]?.card ?? 1);
      const spread = randomInt(1, 12);
      const dragonRank = spread % 2 === 1 ? spread : spread - 1;
      const [cardRows] = await connection.execute(
        "SELECT id, card FROM cards ORDER BY colour",
      );
      const otherRanks = shuffled(
        cardRows.filter((card) => Number(card.card) !== previousRank),
      );
      const andarCards = otherRanks
        .slice(0, dragonRank - 1)
        .map(({ card }) => Number(card));
      const matchingCards = shuffled(
        cardRows.filter(
          (card) =>
            Number(card.card) === previousRank &&
            Number(card.id) !== previousCardId,
        ),
      );
      andarCards.push(Number(matchingCards[0]?.card ?? 1));
      const nextCards = shuffled(
        cardRows.filter((card) => Number(card.id) !== previousCardId),
      );
      const randomCard = Number(nextCards[0]?.card ?? 1);

      await connection.execute(
        `INSERT INTO bet_results
          (number, games_no, game_id, status, json, random_card, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [result, gameNo, ANDAR_BAHAR_GAME_ID, JSON.stringify(andarCards), randomCard],
      );

      const [winningOptions] = await connection.execute(
        "SELECT number, multiplier FROM virtual_games WHERE game_id = ? AND actual_number = ?",
        [ANDAR_BAHAR_GAME_ID, result],
      );
      for (const option of winningOptions) {
        await connection.execute(
          `UPDATE bets SET win_amount = trade_amount * ?, win_number = ?, status = 1,
                           updated_at = CURRENT_TIMESTAMP
           WHERE games_no = ? AND game_id = ? AND number = ? AND status = 0`,
          [Number(option.multiplier), result, gameNo, ANDAR_BAHAR_GAME_ID, option.number],
        );
      }
      const [winningBets] = await connection.execute(
        "SELECT userid, win_amount FROM bets WHERE game_id = ? AND games_no = ? AND status = 1",
        [ANDAR_BAHAR_GAME_ID, gameNo],
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
        [result, gameNo, ANDAR_BAHAR_GAME_ID],
      );
      await connection.execute(
        "UPDATE betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?",
        [ANDAR_BAHAR_GAME_ID],
      );
      await connection.commit();
      transactionStarted = false;
      return {
        message: "Andar Bahar result generated successfully",
        games_no: gameNo,
        result,
        random_card: randomCard,
      };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

function chooseOutcome(numbers, totals, previousOutcome) {
  const amountByNumber = new Map(
    totals.map(({ number, total_amt }) => [Number(number), Number(total_amt)]),
  );
  const noBetNumbers = numbers
    .map(Number)
    .filter((number) => !amountByNumber.has(number) || amountByNumber.get(number) === 0);
  let candidates = noBetNumbers;
  if (candidates.length === 0) {
    const minAmount = Math.min(...amountByNumber.values());
    candidates = [...amountByNumber.entries()]
      .filter(([, amount]) => amount === minAmount)
      .map(([number]) => number);
  }
  if (previousOutcome !== null && candidates.length > 1) {
    const differentCandidates = candidates.filter((number) => number !== previousOutcome);
    if (differentCandidates.length > 0) candidates = differentCandidates;
  }
  return candidates[randomInt(candidates.length)];
}

module.exports = { ANDAR_BAHAR_GAME_ID, AndarBaharService };
