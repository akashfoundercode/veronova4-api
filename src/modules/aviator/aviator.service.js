"use strict";

const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

const AVIATOR_GAME_ID = 5;
const AVIATOR_WALLET_HISTORY_TYPE = 24;

function assertMoney(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw new AppError(400, "INVALID_AMOUNT", "The amount must be greater than zero.");
  }
}

class AviatorService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async placeBet({ uid, amount, number, game_id, game_sr_num, stop_multiplier = 0 }, { legacyWalletMode = false } = {}) {
    assertMoney(amount);
    if (Number(game_id) !== AVIATOR_GAME_ID) {
      throw new AppError(400, "INVALID_GAME_ID", "Invalid Aviator game_id");
    }
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [users] = await connection.execute(
        "SELECT id, wallet, winning_wallet, recharge, status FROM users WHERE id = ? FOR UPDATE",
        [uid],
      );
      const user = users[0];
      if (!user) {
        await connection.rollback();
        transactionStarted = false;
        return { status: 400, message: "Failed to get data of user!" };
      }
      if (Number(user.status) !== 1) {
        await connection.rollback();
        transactionStarted = false;
        return { status: 400, message: "User blocked by admin..!" };
      }

      const [existingBets] = await connection.execute(
        `SELECT id FROM aviator_bet
         WHERE game_id = ? AND number = ? AND game_sr_num = ? AND uid = ? AND status = 0
         LIMIT 1 FOR UPDATE`,
        [AVIATOR_GAME_ID, number, game_sr_num, uid],
      );
      if (existingBets.length > 0) {
        await connection.rollback();
        transactionStarted = false;
        return { status: 400, message: "Already bet created!" };
      }

      const wallet = Number(user.wallet);
      const winningWallet = Number(user.winning_wallet);
      const recharge = Number(user.recharge);
      if (wallet < amount) {
        await connection.rollback();
        transactionStarted = false;
        return { status: 400, message: "Insufficient funds!" };
      }

      const [feeRows] = await connection.execute(
        "SELECT `longtext` FROM admin_settings WHERE id = ? LIMIT 1",
        [10],
      );
      const feeRate = Number(feeRows[0]?.longtext);
      if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 1) {
        throw new AppError(500, "AVIATOR_FEE_CONFIGURATION_ERROR", "Aviator betting fee is not configured correctly.");
      }
      const commission = amount * feeRate;
      const tradeAmount = amount - commission;

      if (legacyWalletMode) {
        const winningDebit = amount > winningWallet ? winningWallet : amount;
        await connection.execute(
          `UPDATE users
           SET today_turnover = today_turnover + ?,
               wallet = wallet - ?,
               winning_wallet = winning_wallet - ?
           WHERE id = ?`,
          [amount, amount, winningDebit, uid],
        );
      } else {
        const rechargeDebit = Math.min(recharge, amount);
        await connection.execute(
          `UPDATE users
           SET today_turnover = today_turnover + ?,
               recharge = recharge - ?,
               wallet = wallet - ?
           WHERE id = ?`,
          [amount, rechargeDebit, amount, uid],
        );
      }

      await connection.execute(
        `INSERT INTO aviator_bet
          (uid, amount, stop_multiplier, game_id, totalamount, number, color,
           game_sr_num, commission, status, datetime, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'Aviator', ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [uid, amount, stop_multiplier, AVIATOR_GAME_ID, tradeAmount, number, game_sr_num, commission],
      );

      await connection.commit();
      transactionStarted = false;
      return { status: 200, message: "Bet placed successfully." };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async cashout({ uid, number, multiplier, game_sr_num }) {
    assertMoney(multiplier);
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [bets] = await connection.execute(
        `SELECT id, totalamount FROM aviator_bet
         WHERE game_sr_num = ? AND game_id = ? AND uid = ? AND number = ?
           AND status = 0 AND result_status = 0
         ORDER BY id LIMIT 1 FOR UPDATE`,
        [game_sr_num, AVIATOR_GAME_ID, uid, number],
      );
      const bet = bets[0];
      if (!bet) {
        await connection.rollback();
        transactionStarted = false;
        return { message: "Already cashout..!", status: 400 };
      }

      const winAmount = Number(bet.totalamount) * multiplier;
      if (!Number.isFinite(winAmount)) {
        throw new AppError(400, "INVALID_MULTIPLIER", "The multiplier is too large.");
      }
      const [update] = await connection.execute(
        `UPDATE aviator_bet
         SET status = 1, result_status = 1, multiplier = ?, win = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 0 AND result_status = 0`,
        [multiplier, winAmount, bet.id],
      );
      if (update.affectedRows !== 1) {
        await connection.rollback();
        transactionStarted = false;
        return { message: "Already cashout..!", status: 400 };
      }

      const [userUpdate] = await connection.execute(
        `UPDATE users
         SET winning_wallet = winning_wallet + ?, wallet = wallet + ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [winAmount, winAmount, uid],
      );
      if (userUpdate.affectedRows !== 1) {
        throw new AppError(404, "USER_NOT_FOUND", "Failed to get data of user!");
      }
      await connection.execute(
        `INSERT INTO wallet_history (userid, amount, subtypeid, created_at, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [uid, winAmount, AVIATOR_WALLET_HISTORY_TYPE],
      );
      await connection.commit();
      transactionStarted = false;
      return { message: `${winAmount} Rs. Cashout Successfully`, status: 200 };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async getHistory({ uid, game_id, limit, offset, created_at }) {
    const parameters = [uid, game_id];
    let dateFilter = "";
    if (created_at !== undefined) {
      dateFilter = " AND DATE(aviator_bet.created_at) = DATE(?)";
      parameters.push(created_at);
    }
    parameters.push(offset, limit);
    const [rows] = await this.poolProvider().execute(
      `SELECT aviator_bet.*,
              aviator_bet.win AS cashout_amount,
              aviator_bet.multiplier AS multiplier,
              aviator_result.price AS crash_point
       FROM aviator_bet
       LEFT JOIN aviator_result ON aviator_bet.game_sr_num = aviator_result.game_sr_num
       WHERE aviator_bet.uid = ? AND aviator_bet.game_id = ?${dateFilter}
       ORDER BY aviator_bet.id DESC LIMIT ?, ?`,
      parameters,
    );
    return rows;
  }

  async getLastFiveResults() {
    const [rows] = await this.poolProvider().execute(
      "SELECT price FROM aviator_result WHERE status = 1 ORDER BY id DESC LIMIT 25",
    );
    return rows;
  }

  async cancelBet({ uid, number, game_sr_num }) {
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [bets] = await connection.execute(
        `SELECT id, amount FROM aviator_bet
         WHERE uid = ? AND number = ? AND game_sr_num = ? AND game_id = ?
           AND status = 0
         ORDER BY id LIMIT 1 FOR UPDATE`,
        [uid, number, game_sr_num, AVIATOR_GAME_ID],
      );
      const bet = bets[0];
      if (!bet) {
        await connection.rollback();
        transactionStarted = false;
        return { message: "Can Not Cancel Bet", status: 400 };
      }

      const [deleted] = await connection.execute(
        "DELETE FROM aviator_bet WHERE id = ? AND status = 0",
        [bet.id],
      );
      if (deleted.affectedRows !== 1) {
        await connection.rollback();
        transactionStarted = false;
        return { message: "Can Not Cancel Bet", status: 400 };
      }
      const [userUpdate] = await connection.execute(
        `UPDATE users
         SET winning_wallet = winning_wallet + ?, wallet = wallet + ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [bet.amount, bet.amount, uid],
      );
      if (userUpdate.affectedRows !== 1) {
        throw new AppError(404, "USER_NOT_FOUND", "Failed to get data of user!");
      }
      await connection.commit();
      transactionStarted = false;
      return { message: "Bet Cancel Successfully", status: 200 };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = {
  AVIATOR_GAME_ID,
  AviatorService,
};
