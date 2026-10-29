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

  async placeBet({ uid, amount, number, game_id = AVIATOR_GAME_ID, game_sr_num, stop_multiplier = 0 }, { legacyWalletMode = false } = {}) {
    assertMoney(amount);
    const resolvedGameId = game_id !== undefined && game_id !== null && game_id !== "" ? Number(game_id) : AVIATOR_GAME_ID;
    if (resolvedGameId !== AVIATOR_GAME_ID) {
      throw new AppError(400, "INVALID_GAME_ID", "Invalid Aviator game_id");
    }
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      let user = null;
      try {
        const [users] = await connection.execute(
          "SELECT id, wallet, winning_wallet, recharge, status FROM users WHERE id = ? FOR UPDATE",
          [uid],
        );
        user = users[0];
      } catch (_) {
        const [users] = await connection.execute(
          "SELECT id, wallet, status FROM users WHERE id = ? FOR UPDATE",
          [uid],
        );
        user = users[0];
      }

      if (!user) {
        await connection.rollback();
        transactionStarted = false;
        return { status: 400, message: "Failed to get data of user!" };
      }
      if (user.status !== undefined && Number(user.status) !== 1) {
        await connection.rollback();
        transactionStarted = false;
        return { status: 400, message: "User blocked by admin..!" };
      }

      // If game_sr_num was not provided or empty, auto-resolve from getNextRoundSettings
      let period = game_sr_num;
      if (!period || String(period).trim() === "") {
        try {
          const settings = await this.getNextRoundSettings();
          period = settings.game_sr;
        } catch (_) {
          period = "1001";
        }
      }

      const [existingBets] = await connection.execute(
        `SELECT id FROM aviator_bet
         WHERE game_id = ? AND number = ? AND game_sr_num = ? AND uid = ? AND status = 0
         LIMIT 1 FOR UPDATE`,
        [AVIATOR_GAME_ID, number, period, uid],
      );
      if (existingBets.length > 0) {
        await connection.rollback();
        transactionStarted = false;
        return { status: 400, message: "Already bet created!" };
      }

      const wallet = Number(user.wallet || 0);
      const winningWallet = Number(user.winning_wallet || 0);
      const recharge = Number(user.recharge || 0);
      if (wallet < amount) {
        await connection.rollback();
        transactionStarted = false;
        return { status: 400, message: "Insufficient funds!" };
      }

      // Safely fetch fee rate, fallback to standard 0.02 (2%) if missing or unconfigured
      let feeRate = 0.02;
      try {
        const [feeRows] = await connection.execute(
          "SELECT `longtext` FROM admin_settings WHERE id = ? LIMIT 1",
          [10],
        );
        const parsed = Number(feeRows[0]?.longtext);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
          feeRate = parsed;
        }
      } catch (_) {}

      const commission = amount * feeRate;
      const tradeAmount = amount - commission;

      if (legacyWalletMode) {
        const winningDebit = amount > winningWallet ? winningWallet : amount;
        try {
          await connection.execute(
            `UPDATE users
             SET today_turnover = COALESCE(today_turnover, 0) + ?,
                 wallet = wallet - ?,
                 winning_wallet = GREATEST(0, COALESCE(winning_wallet, 0) - ?)
             WHERE id = ?`,
            [amount, amount, winningDebit, uid],
          );
        } catch (_) {
          await connection.execute(
            `UPDATE users SET wallet = wallet - ? WHERE id = ?`,
            [amount, uid],
          );
        }
      } else {
        const rechargeDebit = Math.min(recharge, amount);
        try {
          await connection.execute(
            `UPDATE users
             SET today_turnover = COALESCE(today_turnover, 0) + ?,
                 recharge = GREATEST(0, COALESCE(recharge, 0) - ?),
                 wallet = wallet - ?
             WHERE id = ?`,
            [amount, rechargeDebit, amount, uid],
          );
        } catch (_) {
          await connection.execute(
            `UPDATE users SET wallet = wallet - ? WHERE id = ?`,
            [amount, uid],
          );
        }
      }

      // Insert into aviator_bet with resilience against schema drift, missing columns, and auto-increment/duplicate errors
      const executeInsert = async (explicitId = null) => {
        if (explicitId !== null) {
          try {
            return await connection.execute(
              `INSERT INTO aviator_bet
                (id, uid, amount, stop_multiplier, game_id, totalamount, number, color,
                 game_sr_num, commission, status, datetime, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'Aviator', ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [explicitId, uid, amount, stop_multiplier, AVIATOR_GAME_ID, tradeAmount, number, String(period), commission],
            );
          } catch (_) {
            return await connection.execute(
              `INSERT INTO aviator_bet
                (id, uid, amount, stop_multiplier, game_id, totalamount, number,
                 game_sr_num, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [explicitId, uid, amount, stop_multiplier, AVIATOR_GAME_ID, tradeAmount, number, String(period)],
            );
          }
        }

        try {
          return await connection.execute(
            `INSERT INTO aviator_bet
              (uid, amount, stop_multiplier, game_id, totalamount, number, color,
               game_sr_num, commission, status, datetime, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Aviator', ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [uid, amount, stop_multiplier, AVIATOR_GAME_ID, tradeAmount, number, String(period), commission],
          );
        } catch (colErr) {
          if (colErr && (colErr.code === "ER_BAD_FIELD_ERROR" || String(colErr.message || "").includes("Unknown column"))) {
            return await connection.execute(
              `INSERT INTO aviator_bet
                (uid, amount, stop_multiplier, game_id, totalamount, number,
                 game_sr_num, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [uid, amount, stop_multiplier, AVIATOR_GAME_ID, tradeAmount, number, String(period)],
            );
          }
          throw colErr;
        }
      };

      try {
        await executeInsert();
      } catch (insertErr) {
        if (insertErr && insertErr.code === "ER_DUP_ENTRY") {
          const errMsg = String(insertErr.message || insertErr.sqlMessage || "").toLowerCase();
          const isPrimary = errMsg.includes("primary") || errMsg.includes("'0' for key");

          if (isPrimary) {
            // Table lacks AUTO_INCREMENT or id 0 collided. Find max id and insert explicitly.
            try {
              const [maxRows] = await connection.execute(
                "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM aviator_bet"
              );
              const nextId = Number(maxRows[0]?.next_id || 1);
              await executeInsert(nextId);

              // Asynchronously attempt to restore AUTO_INCREMENT so future inserts do not need manual id
              try {
                await connection.execute("ALTER TABLE aviator_bet MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
              } catch (_) {}
            } catch (retryErr) {
              if (retryErr && retryErr.code === "ER_DUP_ENTRY") {
                await connection.rollback();
                transactionStarted = false;
                return { status: 400, message: "Already bet created!" };
              }
              throw retryErr;
            }
          } else {
            // Duplicate bet on the same round / period
            await connection.rollback();
            transactionStarted = false;
            return { status: 400, message: "Already bet created!" };
          }
        } else {
          throw insertErr;
        }
      }

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

      // Check whether round has already crashed at a lower multiplier
      const [crashRows] = await connection.execute(
        `SELECT price FROM aviator_result WHERE game_sr_num = ? LIMIT 1`,
        [game_sr_num],
      );
      if (crashRows[0] && Number(crashRows[0].price) > 0 && Number(crashRows[0].price) < multiplier) {
        await connection.rollback();
        transactionStarted = false;
        return { message: "Round has already crashed..!", status: 400 };
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
         SET winning_wallet = COALESCE(winning_wallet, 0) + ?, wallet = wallet + ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [winAmount, winAmount, uid],
      );
      if (userUpdate.affectedRows !== 1) {
        throw new AppError(404, "USER_NOT_FOUND", "Failed to get data of user!");
      }
      try {
        await connection.execute(
          `INSERT INTO wallet_history (userid, amount, subtypeid, created_at, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [uid, winAmount, AVIATOR_WALLET_HISTORY_TYPE],
        );
      } catch (_) {}
      try {
        await connection.execute(
          "UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
          [winAmount, uid],
        );
      } catch (_) {}
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
       LEFT JOIN aviator_result ON aviator_result.game_sr_num = aviator_bet.game_sr_num AND aviator_result.status = 1
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

  async getDropHistory({ limit = 25, offset = 0 } = {}) {
    const [rows] = await this.poolProvider().execute(
      `SELECT ar.id, ar.game_sr_num AS round, ar.price AS n, ar.datetime AS at,
              COALESCE((SELECT SUM(ab.amount) FROM aviator_bet ab
                        WHERE ab.game_sr_num = ar.game_sr_num AND ab.game_id = ?), 0) AS bet_pool
       FROM aviator_result ar WHERE ar.status = 1
       ORDER BY ar.id DESC LIMIT ? OFFSET ?`,
      [AVIATOR_GAME_ID, limit, offset],
    );
    const [[count]] = await this.poolProvider().execute(
      "SELECT COUNT(*) AS total FROM aviator_result WHERE status = 1",
    );
    return { rows, total: Number(count?.total ?? 0) };
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
         SET recharge = recharge + ?, wallet = wallet + ?, updated_at = CURRENT_TIMESTAMP
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

  async getNextRoundSettings() {
    const pool = this.poolProvider();
    const [resultRows] = await pool.execute(
      "SELECT COALESCE(MAX(CAST(game_sr_num AS UNSIGNED)), 0) AS latest_period FROM aviator_result",
    );
    const [betRows] = await pool.execute(
      "SELECT COALESCE(MAX(CAST(game_sr_num AS UNSIGNED)), 0) AS latest_bet_period FROM aviator_bet WHERE game_id = ?",
      [AVIATOR_GAME_ID],
    );
    const resPeriod = Number(resultRows[0]?.latest_period ?? 0);
    const betPeriod = Number(betRows[0]?.latest_bet_period ?? 0);
    let nextPeriodNum = 1001;
    if (resPeriod > 0) {
      nextPeriodNum = Math.max(resPeriod + 1, betPeriod);
    } else if (betPeriod > 0) {
      nextPeriodNum = betPeriod;
    }
    const nextPeriod = String(nextPeriodNum);

    const [[betSummary]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS totalamount,
              COUNT(uid) AS totalusers,
              COALESCE(MAX(amount), 0) AS highestamount
       FROM aviator_bet WHERE game_id = ? AND game_sr_num = ?`,
      [AVIATOR_GAME_ID, nextPeriod],
    );
    const [adminRows] = await pool.execute(
      "SELECT number FROM aviator_admin_result WHERE game_id = ? AND game_sr_num = ? LIMIT 1",
      [AVIATOR_GAME_ID, nextPeriod],
    );
    let setting = { win_per: 50, loss_per: 50, amount: 10 };
    try {
      const [settingRows] = await pool.execute("SELECT * FROM aviator_setting WHERE id = 1 LIMIT 1");
      if (settingRows && settingRows.length > 0) {
        setting = settingRows[0];
      }
    } catch (_) {}

    const [[winSummary]] = await pool.execute(
      "SELECT COALESCE(SUM(win), 0) AS total_win FROM aviator_bet WHERE game_id = ? AND game_sr_num = ?",
      [AVIATOR_GAME_ID, nextPeriod],
    );
    return {
      status: 200,
      game_sr: nextPeriod,
      totalamount: Number(betSummary?.totalamount ?? 0),
      totalusers: Number(betSummary?.totalusers ?? 0),
      highestamount: Number(betSummary?.highestamount ?? 0),
      adminmultiply: Number(adminRows?.[0]?.number ?? 0),
      adminpercent: Number(setting.win_per ?? 50),
      loss_per: Number(setting.loss_per ?? 50),
      min_amount: Number(setting.amount ?? 10),
      total_win: Number(winSummary?.total_win ?? 0),
    };
  }

  async settleRound({ game_sr_num, multiplier }) {
    assertMoney(multiplier);
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [existing] = await connection.execute(
        "SELECT id, price FROM aviator_result WHERE game_sr_num = ? LIMIT 1 FOR UPDATE",
        [String(game_sr_num)],
      );
      if (existing.length) {
        await connection.commit();
        transactionStarted = false;
        return { status: 200, message: "Game Sr No. Already Exist", game_sr: String(game_sr_num) };
      }

      const insertResult = async (explicitId = null) => {
        if (explicitId !== null) {
          try {
            return await connection.execute(
              `INSERT INTO aviator_result (id, color, game_sr_num, game_id, price, status, datetime)
               VALUES (?, 'Aviator', ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
              [explicitId, String(game_sr_num), AVIATOR_GAME_ID, multiplier],
            );
          } catch (_) {
            return await connection.execute(
              `INSERT INTO aviator_result (id, game_sr_num, game_id, price, status, created_at)
               VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
              [explicitId, String(game_sr_num), AVIATOR_GAME_ID, multiplier],
            );
          }
        }
        try {
          return await connection.execute(
            `INSERT INTO aviator_result (color, game_sr_num, game_id, price, status, datetime)
             VALUES ('Aviator', ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
            [String(game_sr_num), AVIATOR_GAME_ID, multiplier],
          );
        } catch (_) {
          return await connection.execute(
            `INSERT INTO aviator_result (game_sr_num, game_id, price, status, created_at)
             VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)`,
            [String(game_sr_num), AVIATOR_GAME_ID, multiplier],
          );
        }
      };

      try {
        await insertResult();
      } catch (resErr) {
        if (resErr && resErr.code === "ER_DUP_ENTRY") {
          const errMsg = String(resErr.message || resErr.sqlMessage || "").toLowerCase();
          if (errMsg.includes("primary") || errMsg.includes("'0' for key")) {
            try {
              const [maxRows] = await connection.execute(
                "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM aviator_result"
              );
              const nextId = Number(maxRows[0]?.next_id || 1);
              await insertResult(nextId);
            } catch (_) {}
          }
        } else {
          throw resErr;
        }
      }

      const [bets] = await connection.execute(
        `SELECT id, uid, totalamount, stop_multiplier
         FROM aviator_bet
         WHERE game_sr_num = ? AND game_id = ? AND status = 0
           AND win = 0 AND result_status = 0
         ORDER BY id FOR UPDATE`,
        [String(game_sr_num), AVIATOR_GAME_ID],
      );
      for (const bet of bets) {
        const stopMultiplier = Number(bet.stop_multiplier ?? 0);
        if (stopMultiplier > 0 && stopMultiplier <= Number(multiplier)) {
          const winAmount = Number((Number(bet.totalamount) * stopMultiplier).toFixed(2));
          await connection.execute(
            `UPDATE aviator_bet
             SET status = 1, result_status = 1, multiplier = ?, win = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 0 AND result_status = 0`,
            [stopMultiplier, winAmount, bet.id],
          );
          await connection.execute(
            `UPDATE users SET wallet = wallet + ?, winning_wallet = COALESCE(winning_wallet, 0) + ?,
             updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [winAmount, winAmount, bet.uid],
          );
          try {
            await connection.execute(
              `INSERT INTO wallet_history (userid, amount, subtypeid, created_at, updated_at)
               VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [bet.uid, winAmount, AVIATOR_WALLET_HISTORY_TYPE],
            );
          } catch (_) {}
        } else {
          await connection.execute(
            `UPDATE aviator_bet SET status = 2, result_status = 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 0 AND result_status = 0`,
            [bet.id],
          );
        }
      }
      await connection.commit();
      transactionStarted = false;
      return {
        status: 200,
        message: "Result declared, user bet history updated.",
        game_sr: String(game_sr_num),
        price: Number(multiplier),
        settled_bets: bets.length,
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
  AVIATOR_GAME_ID,
  AviatorService,
};
