"use strict";

const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

function num(v, field, min = 1) {
  const n = Number(v);
  if (v === undefined || v === null || v === "" || !Number.isFinite(n) || n < min) {
    throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is invalid.`);
  }
  return n;
}

function reqStr(v, field) {
  if (v === undefined || v === null || String(v).trim() === "") {
    throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is required.`);
  }
  return String(v).trim();
}

class CustomerServiceService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
    this.tablesChecked = false;
  }

  async ensureTables() {
    if (this.tablesChecked) return;
    const pool = this.poolProvider();
    const tables = [
      `CREATE TABLE IF NOT EXISTS customer_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NULL,
        Image VARCHAR(500) NULL,
        link VARCHAR(500) NULL,
        status TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS ifsc_modifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        account_no VARCHAR(100) NOT NULL,
        ifsc_code VARCHAR(50) NOT NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS delete_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        account_no VARCHAR(100) NOT NULL,
        ifsc_code VARCHAR(50) NOT NULL,
        passbook_photo VARCHAR(500) NULL,
        identity_card_photo VARCHAR(500) NULL,
        last_deposit_proof VARCHAR(500) NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS bank_name_modifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        account_no VARCHAR(100) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS game_issue_complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        description TEXT NOT NULL,
        image LONGTEXT NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS change_login_passwords (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        password VARCHAR(255) NOT NULL,
        bdg_win_id VARCHAR(100) NOT NULL,
        latest_deposit_receipt VARCHAR(500) NULL,
        photo_selfie_hold_passbook VARCHAR(500) NULL,
        photo_selfie_hold_identity_card VARCHAR(500) NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS usdt_user_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        region_status TINYINT NOT NULL DEFAULT 1,
        wallet_type VARCHAR(100) NOT NULL,
        exchange_name VARCHAR(100) NOT NULL,
        screenshot_bdgwin_id VARCHAR(500) NULL,
        photo_government_card VARCHAR(500) NULL,
        photo_deposit_proof1 VARCHAR(500) NULL,
        photo_deposit_proof2 VARCHAR(500) NULL,
        photo_usdt_bind_bdgwin VARCHAR(500) NULL,
        photo_new_usdt_address VARCHAR(500) NULL,
        photo_adhaar_card VARCHAR(500) NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS submit_old_usdt_addresses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        deposit_proof VARCHAR(500) NULL,
        selfie_id VARCHAR(500) NULL,
        selfie_usdt VARCHAR(500) NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS aviator_lucky_bonuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bdg_u_id VARCHAR(100) NOT NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS deposit_problems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_number VARCHAR(100) NOT NULL,
        order_amount DECIMAL(15,2) NOT NULL,
        upi_id VARCHAR(100) NULL,
        utr_number VARCHAR(100) NULL,
        pdf_password VARCHAR(100) NULL,
        deposit_proof_recipt VARCHAR(500) NULL,
        bank_transaction_video VARCHAR(500) NULL,
        pdf_bank_statement VARCHAR(500) NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS withdraw_problems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_number VARCHAR(100) NOT NULL,
        order_amount DECIMAL(15,2) NOT NULL,
        upi_id VARCHAR(100) NULL,
        pdf_password VARCHAR(100) NULL,
        deposit_proof_recipt VARCHAR(500) NULL,
        bank_transaction_video VARCHAR(500) NULL,
        pdf_bank_statement VARCHAR(500) NULL,
        status TINYINT DEFAULT 0,
        remarks VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      )`,
    ];

    try {
      for (const sql of tables) {
        await pool.execute(sql);
      }
      this.tablesChecked = true;
    } catch {
      // Table check fallback in mock/testing environments
      this.tablesChecked = true;
    }
  }

  // 1. GET /api/customer_service
  async getCustomerServices() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT id, name, Image, link, status, created_at, updated_at FROM customer_services WHERE status = 1 ORDER BY id ASC",
    );
    return {
      status: 200,
      success: true,
      message: "Customer services fetched successfully",
      data: rows,
    };
  }

  // 2. POST /api/ifsc_modification
  async ifscModification(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const accountNo = reqStr(p.account_no, "account_no");
    const ifscCode = reqStr(p.ifsc_code, "ifsc_code");

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO ifsc_modifications (user_id, account_no, ifsc_code, status, created_at, updated_at)
       VALUES (?, ?, ?, 0, NOW(), NOW())`,
      [uid, accountNo, ifscCode],
    );

    return {
      status: 200,
      success: true,
      message: "IFSC modification request submitted successfully",
    };
  }

  // 3. POST /api/delete_account
  async deleteAccount(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const accountNo = reqStr(p.account_no, "account_no");
    const ifscCode = reqStr(p.ifsc_code, "ifsc_code");
    const passbookPhoto = p.passbook_photo ?? null;
    const identityCardPhoto = p.identity_card_photo ?? null;
    const lastDepositProof = p.last_deposit_proof ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO delete_accounts (user_id, account_no, ifsc_code, passbook_photo, identity_card_photo, last_deposit_proof, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [uid, accountNo, ifscCode, passbookPhoto, identityCardPhoto, lastDepositProof],
    );

    return {
      status: 200,
      success: true,
      message: "Account deletion request submitted successfully",
    };
  }

  // 4. POST /api/bank_name_modification
  async bankNameModification(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const accountNo = reqStr(p.account_no, "account_no");
    const bankName = reqStr(p.bank_name, "bank_name");

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO bank_name_modifications (user_id, account_no, bank_name, status, created_at, updated_at)
       VALUES (?, ?, ?, 0, NOW(), NOW())`,
      [uid, accountNo, bankName],
    );

    return {
      status: 200,
      success: true,
      message: "Bank name modification request submitted successfully",
    };
  }

  // 5. POST /api/game_issue_report
  async gameIssueReport(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const description = reqStr(p.description, "description");
    const image = p.image ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO game_issue_complaints (user_id, description, image, status, created_at, updated_at)
       VALUES (?, ?, ?, 0, NOW(), NOW())`,
      [uid, description, image],
    );

    return {
      status: 200,
      success: true,
      message: "Game issue complaint submitted successfully",
    };
  }

  // 6. POST /api/change_login_password
  async changeLoginPassword(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const password = reqStr(p.password, "password");
    const bdgWinId = reqStr(p.bdg_win_id ?? p.bdg_u_id, "bdg_win_id");
    const receipt = p.latest_deposit_receipt ?? null;
    const selfiePassbook = p.photo_selfie_hold_passbook ?? null;
    const selfieId = p.photo_selfie_hold_identity_card ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO change_login_passwords (user_id, password, bdg_win_id, latest_deposit_receipt, photo_selfie_hold_passbook, photo_selfie_hold_identity_card, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [uid, password, bdgWinId, receipt, selfiePassbook, selfieId],
    );

    return {
      status: 200,
      success: true,
      message: "Password change request submitted successfully",
    };
  }

  // 7. POST /api/usdt-user-verification
  async usdtUserVerification(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const regionStatus = num(p.region_status ?? 1, "region_status", 1);
    const walletType = reqStr(p.wallet_type, "wallet_type");
    const exchangeName = reqStr(p.exchange_name, "exchange_name");

    const screenshotBdg = p.screenshot_bdgwin_id ?? null;
    const photoGov = p.photo_government_card ?? null;
    const deposit1 = p.photo_deposit_proof1 ?? null;
    const deposit2 = p.photo_deposit_proof2 ?? null;
    const usdtBind = p.photo_usdt_bind_bdgwin ?? null;
    const newUsdt = p.photo_new_usdt_address ?? null;
    const adhaar = p.photo_adhaar_card ?? null;

    if (regionStatus === 1 && !adhaar) {
      throw new AppError(400, "VALIDATION_ERROR", "photo_adhaar_card is required for region 1.");
    }

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO usdt_user_verifications
       (user_id, region_status, wallet_type, exchange_name, screenshot_bdgwin_id, photo_government_card, photo_deposit_proof1, photo_deposit_proof2, photo_usdt_bind_bdgwin, photo_new_usdt_address, photo_adhaar_card, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [
        uid,
        regionStatus,
        walletType,
        exchangeName,
        screenshotBdg,
        photoGov,
        deposit1,
        deposit2,
        usdtBind,
        newUsdt,
        adhaar,
      ],
    );

    return {
      status: 200,
      success: true,
      message: "USDT user verification submitted successfully",
    };
  }

  // 8. POST /api/submit-old-usdt-address
  async submitOldUsdtAddress(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const depositProof = p.depositProof ?? p.deposit_proof ?? null;
    const selfieId = p.selfieId ?? p.selfie_id ?? null;
    const selfieUsdt = p.selfieUsdt ?? p.selfie_usdt ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO submit_old_usdt_addresses (user_id, deposit_proof, selfie_id, selfie_usdt, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, NOW(), NOW())`,
      [uid, depositProof, selfieId, selfieUsdt],
    );

    return {
      status: 200,
      success: true,
      message: "USDT address change request submitted successfully",
    };
  }

  // 9. POST /api/aviator-lucky-bonus
  async aviatorLuckyBonus(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const bdgUId = reqStr(p.bdg_u_id ?? p.bdg_win_id, "bdg_u_id");

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO aviator_lucky_bonuses (user_id, bdg_u_id, status, created_at, updated_at)
       VALUES (?, ?, 0, NOW(), NOW())`,
      [uid, bdgUId],
    );

    return {
      status: 200,
      success: true,
      message: "Aviator lucky bonus request submitted successfully",
    };
  }

  // 10. GET /api/fetch-by-typeid?typeid=…&userid=…
  async fetchByTypeId(q = {}) {
    await this.ensureTables();
    const typeid = num(q.typeid, "typeid", 1);
    const uid = num(q.userid ?? q.user_id, "userid", 1);

    const typeTableMap = {
      1: "ifsc_modifications",
      2: "delete_accounts",
      3: "bank_name_modifications",
      4: "game_issue_complaints",
      5: "change_login_passwords",
      6: "usdt_user_verifications",
      7: "submit_old_usdt_addresses",
    };

    const tableName = typeTableMap[typeid];
    if (!tableName) {
      throw new AppError(400, "INVALID_TYPE_ID", "typeid must be between 1 and 7.");
    }

    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      `SELECT * FROM ${tableName} WHERE user_id = ? ORDER BY id DESC`,
      [uid],
    );

    return {
      status: 200,
      success: true,
      message: rows.length ? "Data found" : "No record found",
      typeid,
      count: rows.length,
      data: rows,
    };
  }

  // 11. POST /api/deposit_Problem
  async depositProblem(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const orderNumber = reqStr(p.order_number, "order_number");
    const orderAmount = num(p.order_amount, "order_amount", 0.01);
    const upiId = p.upi_id ?? null;
    const utrNumber = p.utr_number ?? null;
    const pdfPassword = p.pdf_password ?? null;
    const receipt = p.deposit_proof_recipt ?? null;
    const video = p.bank_transaction_video ?? null;
    const statement = p.pdf_bank_statement ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO deposit_problems
       (user_id, order_number, order_amount, upi_id, utr_number, pdf_password, deposit_proof_recipt, bank_transaction_video, pdf_bank_statement, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [uid, orderNumber, orderAmount, upiId, utrNumber, pdfPassword, receipt, video, statement],
    );

    return {
      status: 200,
      success: true,
      message: "Deposit problem submitted successfully",
    };
  }

  // 12. GET /api/deposit_pending_list?user_id=…
  async depositPendingList(q = {}) {
    await this.ensureTables();
    const uid = num(q.user_id ?? q.userid, "user_id");
    const pool = this.poolProvider();

    let rows = [];
    try {
      // Try payins table first (standard Laravel deposit table)
      const [payinRows] = await pool.execute(
        `SELECT id, user_id, order_id, amount, status, type, created_at, updated_at
         FROM payins WHERE user_id = ? AND status = 0
         ORDER BY id DESC LIMIT 50`,
        [uid],
      );
      rows = payinRows;
    } catch {
      try {
        // Fallback to deposit_problems if payins does not exist
        const [probRows] = await pool.execute(
          `SELECT id, user_id, order_number AS order_id, order_amount AS amount, status, created_at, updated_at
           FROM deposit_problems WHERE user_id = ? AND status = 0
           ORDER BY id DESC LIMIT 50`,
          [uid],
        );
        rows = probRows;
      } catch {
        rows = [];
      }
    }

    return {
      status: 200,
      success: true,
      message: rows.length ? "Data found" : "No pending deposits found",
      count: rows.length,
      data: rows,
    };
  }

  // 13. GET /api/withdraw_pending_list?user_id=…
  async withdrawPendingList(q = {}) {
    await this.ensureTables();
    const uid = num(q.user_id ?? q.userid, "user_id");
    const pool = this.poolProvider();

    let rows = [];
    try {
      // Try withdrawals table first (standard Laravel withdrawal table)
      const [withdrawRows] = await pool.execute(
        `SELECT id, user_id, order_id, amount, status, type, created_at, updated_at
         FROM withdrawals WHERE user_id = ? AND status = 0
         ORDER BY id DESC LIMIT 50`,
        [uid],
      );
      rows = withdrawRows;
    } catch {
      try {
        // Fallback to withdraw_problems
        const [probRows] = await pool.execute(
          `SELECT id, user_id, order_number AS order_id, order_amount AS amount, status, created_at, updated_at
           FROM withdraw_problems WHERE user_id = ? AND status = 0
           ORDER BY id DESC LIMIT 50`,
          [uid],
        );
        rows = probRows;
      } catch {
        rows = [];
      }
    }

    return {
      status: 200,
      success: true,
      message: rows.length ? "Data found" : "No pending withdrawals found",
      count: rows.length,
      data: rows,
    };
  }

  // 14. POST /api/withdraw_Problem
  async withdrawProblem(p = {}) {
    await this.ensureTables();
    const uid = num(p.user_id ?? p.userid, "user_id");
    const orderNumber = reqStr(p.order_number, "order_number");
    const orderAmount = num(p.order_amount, "order_amount", 0.01);
    const upiId = p.upi_id ?? null;
    const pdfPassword = p.pdf_password ?? null;
    const receipt = p.deposit_proof_recipt ?? null;
    const video = p.bank_transaction_video ?? null;
    const statement = p.pdf_bank_statement ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      `INSERT INTO withdraw_problems
       (user_id, order_number, order_amount, upi_id, pdf_password, deposit_proof_recipt, bank_transaction_video, pdf_bank_statement, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [uid, orderNumber, orderAmount, upiId, pdfPassword, receipt, video, statement],
    );

    return {
      status: 200,
      success: true,
      message: "Withdrawal problem submitted successfully",
    };
  }

  // ================= ADMIN ACTIONS & REST APIS ================= //

  async adminIfscList() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT * FROM ifsc_modifications ORDER BY id DESC LIMIT 100",
    );
    return { status: 200, success: true, count: rows.length, data: rows };
  }

  async adminIfscApprove(id, body = {}) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const status = body.status !== undefined ? Number(body.status) : 1; // 1 = approved
    const remarks = body.remarks ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE ifsc_modifications SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?",
      [status, remarks, reqId],
    );
    return { status: 200, success: true, message: "IFSC modification status updated." };
  }

  async adminDeleteAccountList() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT * FROM delete_accounts ORDER BY id DESC LIMIT 100",
    );
    return { status: 200, success: true, count: rows.length, data: rows };
  }

  async adminDeleteAccountStatus(id, body = {}) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const status = body.status !== undefined ? Number(body.status) : 1;
    const remarks = body.remarks ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE delete_accounts SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?",
      [status, remarks, reqId],
    );
    return { status: 200, success: true, message: "Account deletion request status updated." };
  }

  async adminBankNameList() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT * FROM bank_name_modifications ORDER BY id DESC LIMIT 100",
    );
    return { status: 200, success: true, count: rows.length, data: rows };
  }

  async adminBankNameApprove(id, body = {}) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const status = body.status !== undefined ? Number(body.status) : 1;
    const remarks = body.remarks ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE bank_name_modifications SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?",
      [status, remarks, reqId],
    );
    return { status: 200, success: true, message: "Bank name modification status updated." };
  }

  async adminGameIssueList() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT * FROM game_issue_complaints ORDER BY id DESC LIMIT 100",
    );
    return { status: 200, success: true, count: rows.length, data: rows };
  }

  async adminGameIssueApprove(id, body = {}) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const status = body.status !== undefined ? Number(body.status) : 1;
    const remarks = body.remarks ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE game_issue_complaints SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?",
      [status, remarks, reqId],
    );
    return { status: 200, success: true, message: "Game issue complaint status updated." };
  }

  async adminPasswordChangeList() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT * FROM change_login_passwords ORDER BY id DESC LIMIT 100",
    );
    return { status: 200, success: true, count: rows.length, data: rows };
  }

  async adminPasswordChangeApprove(id, body = {}) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const status = body.status !== undefined ? Number(body.status) : 1;
    const remarks = body.remarks ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE change_login_passwords SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?",
      [status, remarks, reqId],
    );
    return { status: 200, success: true, message: "Password change request status updated." };
  }

  async adminUsdtVerificationList() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT * FROM usdt_user_verifications ORDER BY id DESC LIMIT 100",
    );
    return { status: 200, success: true, count: rows.length, data: rows };
  }

  async adminUsdtVerificationDetail(id) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const pool = this.poolProvider();
    const [[row]] = await pool.execute(
      "SELECT * FROM usdt_user_verifications WHERE id = ?",
      [reqId],
    );
    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Verification record not found.");
    }
    return { status: 200, success: true, data: row };
  }

  async adminUsdtApprove(id, body = {}) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const status = body.status !== undefined ? Number(body.status) : 1;
    const remarks = body.remarks ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE usdt_user_verifications SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?",
      [status, remarks, reqId],
    );
    return { status: 200, success: true, message: "USDT user verification status updated." };
  }

  async adminUsdtAddressList() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT * FROM submit_old_usdt_addresses ORDER BY id DESC LIMIT 100",
    );
    return { status: 200, success: true, count: rows.length, data: rows };
  }

  async adminUsdtAddressStatus(id, body = {}) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const status = body.status !== undefined ? Number(body.status) : 1;
    const remarks = body.remarks ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE submit_old_usdt_addresses SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?",
      [status, remarks, reqId],
    );
    return { status: 200, success: true, message: "USDT address request status updated." };
  }

  async adminDepositProblemList() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT * FROM deposit_problems ORDER BY id DESC LIMIT 100",
    );
    return { status: 200, success: true, count: rows.length, data: rows };
  }

  async adminDepositProblemStatus(id, body = {}) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const status = body.status !== undefined ? Number(body.status) : 1;
    const remarks = body.remarks ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE deposit_problems SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?",
      [status, remarks, reqId],
    );
    return { status: 200, success: true, message: "Deposit problem status updated." };
  }

  async adminWithdrawProblemList() {
    await this.ensureTables();
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      "SELECT * FROM withdraw_problems ORDER BY id DESC LIMIT 100",
    );
    return { status: 200, success: true, count: rows.length, data: rows };
  }

  async adminWithdrawProblemStatus(id, body = {}) {
    await this.ensureTables();
    const reqId = num(id, "id");
    const status = body.status !== undefined ? Number(body.status) : 1;
    const remarks = body.remarks ?? null;

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE withdraw_problems SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?",
      [status, remarks, reqId],
    );
    return { status: 200, success: true, message: "Withdrawal problem status updated." };
  }
}

module.exports = { CustomerServiceService };

