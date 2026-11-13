"use strict";

const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

const FALLBACK_BEGINNER_GUIDES = [
  {
    name: "How to Register",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">1. How to Register</p>\n<p style=\"color: #ffffff;\">\n    - Fill Your Phone Number<br>\n    - Set Your Own Password (6 letters)<br>\n    - Confirm The Password<br>\n    - Fill Your Recommendation Code<br>\n    - Click I Have Read And Agree<br>\n    - Click Register\n</p>\n",
    image: "https://root.veronova.co.in/images/beginner_guide/register.png",
  },
  {
    name: "How to Betting",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">2. How to Betting</p>\n\n<ul style=\"color: #ffffff;\">\n    <li>Participation in games on Veronova involves financial risk.</li>\n    <li>You may lose some or all of your money while playing games.</li>\n    <li>Play responsibly and only with funds you can afford to lose.</li>\n    <li>Ensure you understand the game rules before placing bets.</li>\n    <li>Check your account balance before and after placing a bet.</li>\n</ul>",
    image: "https://root.veronova.co.in/images/beginner_guide/betting.png",
  },
  {
    name: "How to recharge",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">3. How to recharge</p>\n\n<p style=\"color: #ffffff;\">\n    Click Wallet Icon, Click The Recharge Button, and we have five ways to make a recharge (BANK TRANSFER, E-WALLET)\n</p>\n",
    image: "https://root.veronova.co.in/images/beginner_guide/recharge.png",
  },
  {
    name: "How to Withdraw",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">4. How to Withdraw</p>\n\n<p style=\"color: #ffffff;\">\n    Click Wallet Icon, Click Withdraw Button.\n</p>\n\n<ul style=\"color: #ffffff;\">\n    <li>Enter withdraw amount</li>\n    <li>Make Sure Your Total Bet Until Zero</li>\n    <li>Select Your Bank Account Or Add Your Bank Account</li>\n    <li>Input Amount You Want To Withdraw</li>\n    <li>Input Your Login Password</li>\n</ul>\n",
    image: "https://root.veronova.co.in/images/beginner_guide/withdraw.png",
  },
  {
    name: "Orders",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">5. Orders</p>\n\n<p style=\"color: #ffffff;\">\n    When The Betting Complete You Can Click My Game Record To See Your Bet Record, You Can Check The Chart Trend.\n</p>\n",
    image: "https://root.veronova.co.in/images/beginner_guide/orders.png",
  },
  {
    name: "Promotion",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">6. Promotion</p>\n\n<ul style=\"color: #ffffff; list-style-type: none; padding-left: 0;\">\n    <li>- If you have a downline or referral member use your own link to register and if they make a recharge you can claim a reward. The agent will get a minimum commission of 0.6% (level 1) and 0.18% (level 2) from each transaction that is done by the referral (Added every day at 00:30 AM). If the accumulated transactions of the referral reach a certain target, the agent will get an additional bonus with the following rebates.</li>\n    <li>- You Can Click The Sharing Invitation Poster To See The Barcode</li>\n</ul>\n",
    image: "https://root.veronova.co.in/images/beginner_guide/pramotation.png",
  },
  {
    name: "Account security",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">7. Account security</p>\n\n<p style=\"color: #ffffff;\">\n    Go To My Icon, Click Setting Icon.\n</p>\n\n<ul style=\"color: #ffffff; list-style-type: none; padding-left: 0;\">\n    <li>- Click Login Password.</li>\n    <li>- Re-Enter Your Login Password.</li>\n    <li>- Enter Strongest New Password, and Confirm Your Password.</li>\n    <li>- Click Save Changes.</li>\n</ul>\n",
    image: "https://root.veronova.co.in/images/beginner_guide/accounts.png",
  },
  {
    name: "Forgot Password",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">8. Forgot Password</p>\n\n<p style=\"color: #ffffff;\">\n    If You Forget Your Login Password, Please Contact Customer Service Immediately.\n</p>\n\n\n",
    image: "https://root.veronova.co.in/images/beginner_guide/forget.png",
  },
  {
    name: "App download",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">9. App download</p>\n\n<p style=\"color: #ffffff;\">\n    Click top right corner download icon, you can download the app and easy to use.\n</p>\n",
    image: "https://root.veronova.co.in/images/beginner_guide/appdownload.png",
  },
  {
    name: "About",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">10. About</p>\n<p style=\"color: #ffffff;\">\n    Click About for more details regarding Privacy Policy and Risk Disclosure Agreement.\n</p>\n",
    image: "https://root.veronova.co.in/images/beginner_guide/aboutus.png",
  },
  {
    name: "Gift",
    description: "<p style=\"color: #00ff00; font-weight: bold;\">11. Gift</p>\n<p style=\"color: #ffffff;\">\n    - Click Gift Exchange<br>\n    - Input The Unique Code To Redemption Code The Money<br>\n    - Click Receive\n</p>\n",
    image: "https://root.veronova.co.in/images/beginner_guide/gift.png",
  },
];

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

  async beginnerGuide(options = {}) {
    let rows = [];
    try {
      const [res] = await this.poolProvider().execute(
        "SELECT name, description, image FROM settings WHERE type BETWEEN 11 AND 21 ORDER BY type ASC",
      );
      if (res && res.length > 0) rows = res;
    } catch (_) {
      rows = [];
    }

    const defaultHost = (options?.baseUrl && !options.baseUrl.includes("localhost") && !options.baseUrl.includes("127.0.0.1"))
      ? options.baseUrl.replace(/\/+$/, "")
      : "https://root.veronova.co.in";

    const formatImage = (img) => {
      if (!img) return null;
      if (/^https?:\/\//i.test(img)) return img;
      const cleanPath = String(img).replace(/^\/+/, "");
      return `${defaultHost}/${cleanPath}`;
    };

    const source = rows.length > 0 ? rows : FALLBACK_BEGINNER_GUIDES;
    const data = source.map((row) => ({
      name: row.name,
      description: row.description,
      image: formatImage(row.image),
    }));

    return {
      status: 200,
      message: "Beginner guide data fetched successfully",
      data,
    };
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

  async ensureFeedbackTable(pool) {
    try {
      await pool.execute(`CREATE TABLE IF NOT EXISTS feedbacks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userid INT NOT NULL,
        description LONGTEXT NOT NULL,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_feedbacks_userid (userid),
        INDEX idx_feedbacks_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    } catch (_) {}
  }

  async addFeedback(payload = {}) {
    const rawUserId = payload.userid ?? payload.user_id ?? payload.userId;
    const rawDescription = payload.description ?? payload.feedback ?? payload.message;

    if (rawUserId === undefined || rawUserId === null || String(rawUserId).trim() === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The userid field is required.");
    }
    const userId = Number(rawUserId);
    if (!Number.isInteger(userId) || userId < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid field must be a valid user ID.");
    }

    if (rawDescription === undefined || rawDescription === null || String(rawDescription).trim() === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The description field is required.");
    }
    const description = String(rawDescription).trim();

    const pool = this.poolProvider();
    await this.ensureFeedbackTable(pool);

    await pool.execute(
      "INSERT INTO feedbacks (userid, description, status, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())",
      [userId, description],
    );

    return {
      message: "Successfully",
      status: 200,
      data: true,
    };
  }

  async getFeedback(query = {}) {
    const rawUserId = query.userid ?? query.user_id ?? query.userId;
    const pool = this.poolProvider();
    await this.ensureFeedbackTable(pool);

    if (rawUserId !== undefined && rawUserId !== null && String(rawUserId).trim() !== "") {
      const userId = Number(rawUserId);
      const [rows] = await pool.execute(
        "SELECT * FROM feedbacks WHERE userid = ? ORDER BY id DESC",
        [userId],
      );
      return {
        message: "Successfully",
        status: 200,
        data: rows,
      };
    }

    const [rows] = await pool.execute(
      "SELECT f.*, u.username AS uname, u.mobile FROM feedbacks f LEFT JOIN users u ON f.userid = u.id ORDER BY f.id DESC LIMIT 50",
    );
    return {
      message: "Successfully",
      status: 200,
      data: rows,
    };
  }
}

module.exports = { LegacyApiService };
