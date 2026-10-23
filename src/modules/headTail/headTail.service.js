"use strict";

const { getPool } = require("../../config/database");
const { WingoService, chooseWinningNumber } = require("../wingo/wingo.service");
const AppError = require("../../shared/errors/AppError");

const HEAD_TAIL_GAME_ID = 14;
const HEADS_IMAGE = "https://root.gameon.deals/public/image/heads.png";
const TAILS_IMAGE = "https://root.gameon.deals/public/image/tails.png";

class HeadTailService extends WingoService {
  constructor(poolProvider = getPool, fetchImpl = globalThis.fetch) {
    super(poolProvider, fetchImpl);
  }

  async settleRound(gameId, { forcedResult, periodOverride } = {}) {
    if (Number(gameId) !== HEAD_TAIL_GAME_ID) {
      throw new AppError(400, "INVALID_GAME_ID", "Invalid Head Tail game_id");
    }

    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [settings] = await connection.execute(
        "SELECT winning_percentage FROM game_settings WHERE id = ?",
        [HEAD_TAIL_GAME_ID],
      );
      if (settings.length === 0) {
        throw new AppError(404, "GAME_NOT_FOUND", "No winning percentage found for game_id: 14");
      }
      const [logs] = await connection.execute(
        "SELECT id, games_no, number, amount FROM betlogs WHERE game_id = ? ORDER BY id FOR UPDATE",
        [HEAD_TAIL_GAME_ID],
      );
      if (logs.length === 0) {
        throw new AppError(409, "ROUND_NOT_FOUND", "No current game number found");
      }

      const gameNo = String(periodOverride ?? logs[0].games_no);
      const [adminResults] =
        forcedResult === undefined
          ? await connection.execute(
              "SELECT number FROM admin_winner_results WHERE gamesno = ? AND gameId = ? ORDER BY id DESC LIMIT 1",
              [gameNo, HEAD_TAIL_GAME_ID],
            )
          : [[]];
      let resultNumber;
      if (forcedResult !== undefined) {
        resultNumber = Number(forcedResult);
      } else if (adminResults.length > 0) {
        resultNumber = Number(adminResults[0].number);
      } else {
        const [totalRows] = await connection.execute(
          "SELECT COALESCE(SUM(amount), 0) AS amount FROM bets WHERE game_id = ? AND games_no = ?",
          [HEAD_TAIL_GAME_ID, gameNo],
        );
        const [amountRows] = await connection.execute(
          `SELECT number, SUM(amount) AS total_amt
           FROM betlogs WHERE game_id = ? AND games_no = ? GROUP BY number`,
          [HEAD_TAIL_GAME_ID, gameNo],
        );
        resultNumber = chooseWinningNumber({
          logNumbers: logs.map(({ number }) => number),
          totalBet: Number(totalRows[0]?.amount ?? 0),
          amountRows,
        });
      }
      if (![1, 2].includes(resultNumber)) {
        throw new AppError(
          422,
          "INVALID_RESULT_NUMBER",
          "The selected Head Tail result must be heads (1) or tails (2).",
        );
      }

      const [winningOptions] = await connection.execute(
        "SELECT name, number, multiplier FROM virtual_games WHERE actual_number = ? AND game_id = ?",
        [resultNumber, HEAD_TAIL_GAME_ID],
      );
      if (winningOptions.length === 0) {
        throw new AppError(422, "INVALID_RESULT_NUMBER", "No Head Tail option matches the selected result.");
      }
      const isHeads = winningOptions.some(({ name }) =>
        String(name).toLowerCase().includes("head"),
      );
      const card = isHeads ? HEADS_IMAGE : TAILS_IMAGE;
      await connection.execute(
        `INSERT INTO bet_results
          (number, games_no, game_id, status, json, random_card, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [resultNumber, gameNo, HEAD_TAIL_GAME_ID, card, card],
      );

      await connection.execute(
        `UPDATE bets SET status = 2, win_number = ?, updated_at = CURRENT_TIMESTAMP
         WHERE games_no = ? AND game_id = ? AND status = 0`,
        [resultNumber, gameNo, HEAD_TAIL_GAME_ID],
      );
      for (const option of winningOptions) {
        await connection.execute(
          `UPDATE bets
           SET win_amount = amount * ?, win_number = ?, status = 1, updated_at = CURRENT_TIMESTAMP
           WHERE games_no = ? AND game_id = ? AND number = ?`,
          [
            Number(option.multiplier),
            resultNumber,
            gameNo,
            HEAD_TAIL_GAME_ID,
            option.number,
          ],
        );
      }
      const [winningBets] = await connection.execute(
        "SELECT userid, win_amount FROM bets WHERE status = 1 AND games_no = ? AND game_id = ?",
        [gameNo, HEAD_TAIL_GAME_ID],
      );
      for (const bet of winningBets) {
        await connection.execute(
          `UPDATE users
           SET wallet = wallet + ?, winning_wallet = winning_wallet + ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [bet.win_amount, bet.win_amount, bet.userid],
        );
      }
      await connection.execute(
        "UPDATE betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?",
        [HEAD_TAIL_GAME_ID],
      );
      await connection.commit();
      transactionStarted = false;
      return {
        gameId: HEAD_TAIL_GAME_ID,
        gameNo,
        resultNumber,
        message: `✅ Result generated for Game ID: 14 | Game No: ${gameNo} | Result: ${resultNumber}`,
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
  HEAD_TAIL_GAME_ID,
  HEADS_IMAGE,
  TAILS_IMAGE,
  HeadTailService,
};
