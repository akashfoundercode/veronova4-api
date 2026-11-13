"use strict";

const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

class LegacyApiService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async ensureGiftTables(pool) {
    await pool.execute(`CREATE TABLE IF NOT EXISTS gift_cart (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(111) NOT NULL,
      amount INT NOT NULL DEFAULT 0,
      number_people INT NOT NULL DEFAULT 1,
      availed_num INT NOT NULL DEFAULT 0,
      deposit_amount INT NOT NULL DEFAULT 0,
      campaign_tag VARCHAR(100) NULL,
      status INT NOT NULL DEFAULT 1,
      datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_gift_cart_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.execute(`CREATE TABLE IF NOT EXISTS gift_claim (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      userid BIGINT UNSIGNED NOT NULL,
      gift_code VARCHAR(111) NOT NULL,
      amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_gift_claim_user (userid),
      INDEX idx_gift_claim_code (gift_code),
      INDEX idx_gift_claim_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  async giftRedeemList(userid) {
    const userId = Number(userid);
    if (!Number.isInteger(userId) || userId < 1) throw new AppError(400, "VALIDATION_ERROR", "The userid field is required.");
    const pool = this.poolProvider();
    await this.ensureGiftTables(pool);
    const [rows] = await pool.execute("SELECT * FROM gift_claim WHERE userid = ? ORDER BY id DESC", [userId]);
    return { message: rows.length ? "Successfully" : "No record found", status: rows.length ? 200 : 400, data: rows };
  }

  async applyGift({ userid, user_id, code, gift_code }) {
    const userId = Number(userid ?? user_id);
    const giftCode = String(code ?? gift_code ?? "").trim();
    if (!Number.isInteger(userId) || userId < 1 || !giftCode) {
      throw new AppError(400, "VALIDATION_ERROR", "userid and code are required.");
    }
    const pool = this.poolProvider();
    await this.ensureGiftTables(pool);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [userRows] = await connection.execute("SELECT id, wallet, bonus FROM users WHERE id = ? AND status = 1 FOR UPDATE", [userId]);
      if (!userRows.length) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
      const [giftRows] = await connection.execute("SELECT * FROM gift_cart WHERE code = ? AND status = 1 LIMIT 1 FOR UPDATE", [giftCode]);
      const gift = giftRows[0];
      if (!gift) throw new AppError(400, "INVALID_GIFT_CODE", "Invalid Gift Code!");
      const [claimed] = await connection.execute("SELECT id FROM gift_claim WHERE userid = ? AND gift_code = ? LIMIT 1", [userId, giftCode]);
      if (claimed.length) throw new AppError(409, "GIFT_ALREADY_CLAIMED", "You have already availed this offer!");
      const [todayClaims] = await connection.execute("SELECT COUNT(*) AS total FROM gift_claim WHERE userid = ? AND created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY", [userId]);
      if (Number(todayClaims[0]?.total || 0) > 0) throw new AppError(409, "DAILY_GIFT_LIMIT", "You can only claim the gift once per day.");
      if (Number(gift.availed_num) >= Number(gift.number_people)) throw new AppError(409, "GIFT_EXHAUSTED", "No longer available this offer.");
      const [depositRows] = await connection.execute("SELECT COALESCE(SUM(cash), 0) AS total FROM payins WHERE user_id = ? AND status = 2 AND created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY", [userId]);
      if (Number(depositRows[0]?.total || 0) < Number(gift.deposit_amount || 0)) {
        throw new AppError(400, "GIFT_NOT_ELIGIBLE", `You are not eligible! Deposit ₹${Number(gift.deposit_amount || 0)} today to claim the gift.`);
      }
      const amount = Number(gift.amount);
      await connection.execute("UPDATE users SET wallet = wallet + ?, bonus = COALESCE(bonus, 0) + ? WHERE id = ?", [amount, amount, userId]);
      await connection.execute("UPDATE gift_cart SET availed_num = availed_num + 1 WHERE id = ?", [gift.id]);
      await connection.execute("INSERT INTO gift_claim (userid, gift_code, amount, created_at, datetime) VALUES (?, ?, ?, NOW(), NOW())", [userId, giftCode, amount]);
      await connection.execute("INSERT INTO wallet_history (userid, amount, subtypeid, created_at, updated_at) VALUES (?, ?, 20, NOW(), NOW())", [userId, amount]);
      await connection.commit();
      return { status: 200, message: `Gift of ₹${amount} added to your wallet successfully!` };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async totalBetDetails({ userid, type }) {
    const userId = Number(userid);
    const period = Number(type);
    if (!Number.isInteger(userId) || userId < 1) throw new AppError(400, "VALIDATION_ERROR", "The userid field is required.");
    if (![1, 2, 3, 4].includes(period)) throw new AppError(400, "VALIDATION_ERROR", "type must be 1, 2, 3, or 4.");
    const pool = this.poolProvider();
    const [users] = await pool.execute("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!users.length) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
    const dateWhere = {
      1: "created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY",
      2: "created_at >= CURDATE() - INTERVAL 1 DAY AND created_at < CURDATE()",
      3: "created_at >= CURDATE() - INTERVAL 6 DAY AND created_at < CURDATE() + INTERVAL 1 DAY",
      4: "created_at >= CURDATE() - INTERVAL 1 MONTH AND created_at < CURDATE() + INTERVAL 1 DAY",
    }[period];
    const sources = [
      { game: "Wingo Game", table: "bets", userColumn: "userid", winColumn: "win_amount" },
      { game: "chicken Road Game", table: "chicken_bets", userColumn: "user_id", winColumn: "win_amount" },
      { game: "aviator Game", table: "aviator_bet", userColumn: "uid", winColumn: "win" },
    ];
    const data = [];
    for (const source of sources) {
      const [rows] = await pool.execute(
        `SELECT COALESCE(SUM(amount), 0) AS total_bet_amount, COUNT(id) AS total_bet_count, COALESCE(SUM(${source.winColumn}), 0) AS total_win_amount FROM ${source.table} WHERE ${source.userColumn} = ? AND ${dateWhere}`,
        [userId],
      );
      data.push({ game: source.game, total_bet_amount: Number(rows[0]?.total_bet_amount || 0), total_bet_count: Number(rows[0]?.total_bet_count || 0), total_win_amount: Number(rows[0]?.total_win_amount || 0) });
    }
    return { status: 200, message: "All bet details fetched successfully", grand_total: data.reduce((total, item) => total + item.total_bet_amount, 0), data };
  }

  async beginnerGuide() {
    const [rows] = await this.poolProvider().execute(
      "SELECT name, description, image FROM settings WHERE type BETWEEN 11 AND 21 ORDER BY type ASC",
    );
    const data = rows.map((row) => ({
      ...row,
      image: row.image
        ? (/^https?:\/\//i.test(row.image) ? row.image : new URL(String(row.image).replace(/^\/+/, ""), "https://root.veronova.co.in/").toString())
        : null,
    }));
    return { status: 200, message: "Beginner guide data fetched successfully", data };
  }

  async aboutUs(type) {
    const value = Number(type);
    if (!Number.isInteger(value)) throw new AppError(400, "VALIDATION_ERROR", "The type field is required and must be numeric.");
    const [data] = await this.poolProvider().execute(
      "SELECT name, description FROM settings WHERE type = ?",
      [value],
    );
    return { message: data.length ? "Successfully" : "No record found", status: data.length ? 200 : 400, data };
  }

  async announcements() {
    const [data] = await this.poolProvider().execute("SELECT * FROM announcement ORDER BY id ASC");
    return data.length
      ? { status: 200, data }
      : { status: 400, message: "No announcement found", data: [] };
  }
}

module.exports = { LegacyApiService };
