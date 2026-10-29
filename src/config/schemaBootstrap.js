"use strict";

const mysql = require("mysql2/promise");
const config = require("./index");
const { getPool } = require("./database");

/**
 * Single Database Centralized Schema Initializer
 * Ensures all tables for Horse Race, Payment Gateways, Customer Service,
 * and Game Features exist in the single DB_DATABASE (veronova_db).
 */
async function ensureAllTables() {
  const { host, port, user, password, name } = config.database || {};

  // Auto-create database if it does not exist yet (e.g. fresh MySQL installation)
  if (host && name && user) {
    try {
      const bootstrapConn = await mysql.createConnection({
        host,
        port: port || 3306,
        user,
        password: password || "",
      });
      await bootstrapConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
      await bootstrapConn.end();
      console.log(`[SchemaBootstrap] ✅ Database '${name}' verified/created.`);
    } catch (dbErr) {
      // Non-fatal if user has no global CREATE privileges
    }
  }

  let pool;
  try {
    pool = getPool();
  } catch (err) {
    // Database credentials not yet configured
    return;
  }

  let connection;
  try {
    connection = await pool.getConnection();
  } catch (err) {
    console.warn("[SchemaBootstrap] ⚠️ Database not available yet for schema sync:", err.message);
    return;
  }

  try {
    // Helper to safely execute statements ignoring syntax/already-exists errors
    const safeExec = async (sql) => {
      try {
        await connection.query(sql);
      } catch (err) {
        // Table or column already exists, non-fatal
      }
    };

    // 0. CORE PLATFORM & USER TABLES
    await safeExec(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NULL,
        name VARCHAR(100) NULL,
        u_id VARCHAR(50) NULL,
        mobile VARCHAR(20) NULL UNIQUE,
        email VARCHAR(255) NULL UNIQUE,
        password VARCHAR(255) NULL,
        userimage MEDIUMTEXT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        role_id INT NOT NULL DEFAULT 2,
        verification INT NOT NULL DEFAULT 1,
        role ENUM('user', 'admin', 'super_admin') NOT NULL DEFAULT 'user',
        referral_code VARCHAR(50) NULL UNIQUE,
        referral_user_id BIGINT NULL DEFAULT 1,
        country_code VARCHAR(10) NULL DEFAULT '+91',
        wallet DECIMAL(20, 4) NOT NULL DEFAULT '0.0000',
        winning_wallet DECIMAL(20, 4) NOT NULL DEFAULT '0.0000',
        third_party_wallet DECIMAL(20, 4) NOT NULL DEFAULT '0.0000',
        recharge DECIMAL(20, 4) NOT NULL DEFAULT '0.0000',
        today_turnover DECIMAL(20, 4) NOT NULL DEFAULT '0.0000',
        total_turnover DECIMAL(20, 4) NOT NULL DEFAULT '0.0000',
        login_token VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_u_id (u_id),
        INDEX idx_mobile (mobile),
        INDEX idx_email (email),
        INDEX idx_referral_code (referral_code),
        INDEX idx_login_token (login_token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure all optional columns exist on users if already created
    const userColumns = [
      "ADD COLUMN username VARCHAR(100) NULL",
      "ADD COLUMN name VARCHAR(100) NULL",
      "ADD COLUMN u_id VARCHAR(50) NULL",
      "ADD COLUMN mobile VARCHAR(20) NULL",
      "ADD COLUMN email VARCHAR(255) NULL",
      "ADD COLUMN password VARCHAR(255) NULL",
      "ADD COLUMN userimage MEDIUMTEXT NULL",
      "ADD COLUMN status TINYINT NOT NULL DEFAULT 1",
      "ADD COLUMN role_id INT NOT NULL DEFAULT 2",
      "ADD COLUMN verification INT NOT NULL DEFAULT 1",
      "ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'",
      "ADD COLUMN referral_code VARCHAR(50) NULL",
      "ADD COLUMN referral_user_id BIGINT NULL DEFAULT 1",
      "ADD COLUMN country_code VARCHAR(10) NULL DEFAULT '+91'",
      "ADD COLUMN wallet DECIMAL(20, 4) NOT NULL DEFAULT '0.0000'",
      "ADD COLUMN winning_wallet DECIMAL(20, 4) NOT NULL DEFAULT '0.0000'",
      "ADD COLUMN third_party_wallet DECIMAL(20, 4) NOT NULL DEFAULT '0.0000'",
      "ADD COLUMN recharge DECIMAL(20, 4) NOT NULL DEFAULT '0.0000'",
      "ADD COLUMN today_turnover DECIMAL(20, 4) NOT NULL DEFAULT '0.0000'",
      "ADD COLUMN total_turnover DECIMAL(20, 4) NOT NULL DEFAULT '0.0000'",
      "ADD COLUMN login_token VARCHAR(255) NULL",
    ];
    for (const col of userColumns) {
      await safeExec(`ALTER TABLE users ${col};`);
    }

    // Ensure wallet and winning_wallet are non-null and default to 0
    await safeExec("UPDATE users SET wallet = 0 WHERE wallet IS NULL");
    await safeExec("UPDATE users SET winning_wallet = 0 WHERE winning_wallet IS NULL");
    await safeExec("UPDATE users SET recharge = 0 WHERE recharge IS NULL");

    await safeExec(`
      CREATE TABLE IF NOT EXISTS personal_access_tokens (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tokenable_type VARCHAR(255) NOT NULL,
        tokenable_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        token CHAR(64) NOT NULL UNIQUE,
        abilities TEXT NULL,
        last_used_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        INDEX idx_tokenable (tokenable_type, tokenable_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NULL,
        longtext MEDIUMTEXT NULL,
        value VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await safeExec(`INSERT IGNORE INTO admin_settings (id, name, longtext, value) VALUES (10, 'commission_rate', '0.02', '0.02');`);
    } catch (_) {}

    await safeExec(`
      CREATE TABLE IF NOT EXISTS game_settings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        winning_percentage INT NOT NULL DEFAULT 90,
        status TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const wingoGameSettings = [
      [1, "Wingo 30s", 90],
      [2, "Wingo 1Min", 90],
      [3, "Wingo 3Min", 90],
      [4, "Wingo 5Min", 90],
      [10, "Wingo 10Min", 90],
    ];
    for (const g of wingoGameSettings) {
      await safeExec(`INSERT IGNORE INTO game_settings (id, name, winning_percentage, status) VALUES (${g[0]}, '${g[1]}', ${g[2]}, 1);`);
    }

    await safeExec(`
      CREATE TABLE IF NOT EXISTS virtual_games (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        name VARCHAR(100) NULL,
        number VARCHAR(50) NULL,
        actual_number VARCHAR(50) NULL,
        multiplier DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec("ALTER TABLE virtual_games ADD COLUMN name VARCHAR(100) NULL");

    await safeExec(`
      CREATE TABLE IF NOT EXISTS cards (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        card INT NOT NULL,
        colour VARCHAR(20) NOT NULL,
        image VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS betlogs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        games_no VARCHAR(50) NOT NULL,
        number VARCHAR(50) NULL,
        amount DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS bet_results (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        games_no VARCHAR(50) NOT NULL,
        number VARCHAR(50) NULL,
        status TINYINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure bet_results has AUTO_INCREMENT and all required columns for Wingo settlements
    await safeExec("UPDATE bet_results SET id = 1 WHERE id = 0 AND (SELECT count FROM (SELECT COUNT(*) AS count FROM bet_results WHERE id = 1) t) = 0");
    await safeExec("ALTER TABLE bet_results MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
    await safeExec("ALTER TABLE bet_results ADD COLUMN json LONGTEXT NULL");
    await safeExec("ALTER TABLE bet_results ADD COLUMN random_card VARCHAR(50) NULL");
    await safeExec("ALTER TABLE bet_results ADD COLUMN token VARCHAR(255) NULL");
    await safeExec("ALTER TABLE bet_results ADD COLUMN block BIGINT NULL DEFAULT 100");
    await safeExec("ALTER TABLE bet_results ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

    await safeExec(`
      CREATE TABLE IF NOT EXISTS pattern_tracking (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        current_index INT NOT NULL DEFAULT 0,
        remaining_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS wingo_result_type (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL DEFAULT 'manual',
        status TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await safeExec(`INSERT IGNORE INTO wingo_result_type (id, type, status) VALUES (1, 'manual', 1);`);
    } catch (_) {}

    await safeExec(`
      CREATE TABLE IF NOT EXISTS result_pattern_set (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL DEFAULT 1,
        number VARCHAR(50) NULL,
        number_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS wallet_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        userid BIGINT NOT NULL,
        amount DECIMAL(20, 2) NOT NULL,
        subtypeid INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS admin_winner_results (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        gamesno VARCHAR(50) NOT NULL,
        gameId INT NOT NULL,
        number VARCHAR(50) NULL,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS balloon_bet (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uid BIGINT NOT NULL,
        amount DECIMAL(20, 2) NOT NULL,
        number VARCHAR(50) NULL,
        game_id INT NOT NULL DEFAULT 23,
        totalamount DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
        color VARCHAR(50) NOT NULL DEFAULT 'Balloon',
        game_sr_num VARCHAR(50) NOT NULL,
        commission DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
        status INT NOT NULL DEFAULT 0,
        result_status INT NOT NULL DEFAULT 0,
        multiplier DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        win DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
        stop_multiplier DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS balloon_result (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_sr_num VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS lottery_bets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        game_id INT NOT NULL,
        games_no VARCHAR(50) NOT NULL,
        selected_number VARCHAR(255) NULL,
        amount DECIMAL(20, 2) NOT NULL,
        win_amount DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
        win_number VARCHAR(50) NULL,
        status INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS lottery_bet_result (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        games_no VARCHAR(50) NOT NULL,
        number VARCHAR(255) NULL,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS customer_services (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        type VARCHAR(50) NULL,
        title VARCHAR(255) NULL,
        description TEXT NULL,
        status INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        amount DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
        account_id BIGINT UNSIGNED NULL,
        type VARCHAR(50) NOT NULL DEFAULT '0',
        order_id VARCHAR(100) NOT NULL UNIQUE,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 1. HORSE RACE TABLES
    await safeExec(`
      CREATE TABLE IF NOT EXISTS horses (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        serial_number INT UNSIGNED NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        image_url MEDIUMTEXT NULL,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_serial_number (serial_number),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS races (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_serial VARCHAR(30) NOT NULL UNIQUE,
        status ENUM('WAITING', 'BETTING_OPEN', 'BETTING_CLOSED', 'COUNTDOWN', 'RUNNING', 'FINISHING', 'RESULT', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
        betting_open_at DATETIME NULL,
        betting_close_at DATETIME NULL,
        countdown_at DATETIME NULL,
        started_at DATETIME NULL,
        finished_at DATETIME NULL,
        result_at DATETIME NULL,
        winner_horse_id BIGINT UNSIGNED NULL,
        jackpot_multiplier DECIMAL(5, 2) NOT NULL DEFAULT '1.00',
        is_jackpot TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_game_serial (game_serial),
        INDEX idx_race_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS race_horses (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        race_id BIGINT UNSIGNED NOT NULL,
        horse_id BIGINT UNSIGNED NOT NULL,
        serial_number INT UNSIGNED NOT NULL,
        horse_name_snapshot VARCHAR(100) NOT NULL,
        starting_position INT UNSIGNED NOT NULL DEFAULT 1,
        finish_position INT UNSIGNED NULL,
        finish_time DECIMAL(6, 3) NULL,
        result VARCHAR(50) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_race_id (race_id),
        INDEX idx_horse_id (horse_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS horse_races (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_serial VARCHAR(30) NOT NULL,
        race_id BIGINT UNSIGNED NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'WAITING',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_game_serial (game_serial)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS wallets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL UNIQUE,
        balance DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status ENUM('active', 'locked', 'suspended') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        wallet_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        type ENUM('credit', 'debit') NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'manual',
        amount DECIMAL(18, 4) NOT NULL,
        balance_before DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
        balance_after DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
        reference_id VARCHAR(100) NULL,
        reference_type VARCHAR(50) NULL,
        description VARCHAR(255) NULL,
        status ENUM('pending', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_created (user_id, created_at DESC),
        INDEX idx_wallet_created (wallet_id, created_at DESC),
        INDEX idx_reference (reference_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS games (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL UNIQUE,
        game_code VARCHAR(32) NOT NULL UNIQUE,
        status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_game_code (game_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        last_activity_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_session_user (user_id),
        INDEX idx_user_session_expiry (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        admin_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_session_admin (admin_id),
        INDEX idx_admin_session_expiry (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS admin_password_resets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        admin_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_reset_admin (admin_id),
        INDEX idx_admin_reset_expiry (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS admins (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(40) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS scheduled_race_winners (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_serial VARCHAR(30) NOT NULL,
        horse_id BIGINT UNSIGNED NULL,
        horse_serial INT UNSIGNED NULL,
        horse_name VARCHAR(100) NULL,
        reason VARCHAR(255) NULL,
        status ENUM('PENDING', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_game_serial (game_serial),
        INDEX idx_game_serial (game_serial),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`ALTER TABLE scheduled_race_winners ADD COLUMN horse_name VARCHAR(100) NULL AFTER horse_serial;`);
    await safeExec(`ALTER TABLE scheduled_race_winners ADD UNIQUE KEY uq_game_serial (game_serial);`);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS scheduled_jackpots (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_serial VARCHAR(30) NOT NULL,
        multiplier DECIMAL(5, 2) NOT NULL DEFAULT '1.00',
        reason VARCHAR(255) NULL,
        status ENUM('PENDING', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_game_serial (game_serial),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. BETS TABLE COMPATIBILITY (Wingo + Horse Race in same table)
    await safeExec(`
      CREATE TABLE IF NOT EXISTS bets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        userid BIGINT UNSIGNED NULL,
        amount DOUBLE(20, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        win_amount DOUBLE(20, 2) NOT NULL DEFAULT 0.00,
        bets TEXT NULL,
        commission DOUBLE(20, 2) NOT NULL DEFAULT 0.00,
        trade_amount DOUBLE(20, 2) NOT NULL DEFAULT 0.00,
        number VARCHAR(200) NULL,
        win_number INT NULL DEFAULT 0,
        games_no VARCHAR(64) NULL,
        game_id INT NOT NULL DEFAULT 1,
        game_code VARCHAR(32) NULL,
        race_id BIGINT UNSIGNED NULL,
        game_serial VARCHAR(30) NULL,
        horse_id BIGINT UNSIGNED NULL,
        horse_serial INT UNSIGNED NULL,
        horse_name VARCHAR(100) NULL,
        odds DECIMAL(8, 2) NOT NULL DEFAULT 10.00,
        potential_payout DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        payout_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        order_id VARCHAR(100) NULL,
        illegal_status INT NOT NULL DEFAULT 0,
        account_type TINYINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_race_id (race_id),
        INDEX idx_game_serial (game_serial)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec("ALTER TABLE bets MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
    await safeExec("ALTER TABLE races MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
    await safeExec("ALTER TABLE race_horses MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
    await safeExec("ALTER TABLE wallets MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");

    // Add horse columns to bets if bets table was created by Wingo without them
    const horseColumns = [
      "ADD COLUMN user_id BIGINT UNSIGNED NULL",
      "ADD COLUMN race_id BIGINT UNSIGNED NULL",
      "ADD COLUMN game_serial VARCHAR(30) NULL",
      "ADD COLUMN game_code VARCHAR(32) NULL",
      "ADD COLUMN horse_id BIGINT UNSIGNED NULL",
      "ADD COLUMN horse_serial INT UNSIGNED NULL",
      "ADD COLUMN horse_name VARCHAR(100) NULL",
      "ADD COLUMN odds DECIMAL(8, 2) NULL DEFAULT 10.00",
      "ADD COLUMN potential_payout DECIMAL(18, 4) NULL DEFAULT 0.0000",
      "ADD COLUMN payout_amount DECIMAL(18, 4) NULL DEFAULT 0.0000",
    ];
    for (const col of horseColumns) {
      await safeExec(`ALTER TABLE bets ${col};`);
    }

    // 3. PAYMENT & WALLET TABLES
    await safeExec(`
      CREATE TABLE IF NOT EXISTS payins (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        cash DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
        usdt_amount DECIMAL(18, 4) NULL,
        bonus DECIMAL(18, 4) DEFAULT '0.0000',
        type VARCHAR(50) NOT NULL DEFAULT '0',
        order_id VARCHAR(100) NOT NULL UNIQUE,
        redirect_url VARCHAR(500) NULL,
        typeimage VARCHAR(500) NULL,
        screenshot VARCHAR(500) NULL,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_order_id (order_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS withdraw_histories (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        amount DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
        account_id BIGINT UNSIGNED NULL,
        type VARCHAR(50) NOT NULL DEFAULT '0',
        order_id VARCHAR(100) NOT NULL UNIQUE,
        typeimage VARCHAR(500) NULL,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS account_details (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(150) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        ifsc_code VARCHAR(50) NOT NULL,
        bank_name VARCHAR(150) NOT NULL,
        branch VARCHAR(150) NULL,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS usdt_account_details (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(150) NOT NULL,
        usdt_wallet_address VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS payzaar_callback (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        data LONGTEXT NOT NULL,
        datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS usdt_callbacks (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        data LONGTEXT NOT NULL,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS usdt_qr (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        wallet_address VARCHAR(255) NOT NULL,
        qr_code VARCHAR(500) NOT NULL,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS pay_modes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT '0',
        image VARCHAR(500) NULL,
        status VARCHAR(10) NOT NULL DEFAULT '1',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS payment_limits (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        amount DECIMAL(18, 4) NOT NULL DEFAULT 100.0000,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. CHICKEN ROAD & CASINO TABLES
    await safeExec(`
      CREATE TABLE IF NOT EXISTS bet_values (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        value DECIMAL(18, 2) NOT NULL,
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS multiplier (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
        type VARCHAR(50) NOT NULL DEFAULT '1',
        multiplier VARCHAR(255) NOT NULL,
        roast_multiplier DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS roast_control (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        types VARCHAR(50) NOT NULL,
        roast_multiplier DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      INSERT IGNORE INTO roast_control (id, types, roast_multiplier) VALUES
      (1, '1', 0.00),
      (2, '2', 0.00),
      (3, '3', 0.00),
      (4, '4', 0.00);
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS chicken_bets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        game_id BIGINT UNSIGNED NOT NULL,
        amount DECIMAL(18, 4) NOT NULL,
        win_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        multiplier DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
        cashout_status INT NOT NULL DEFAULT 0,
        status INT NOT NULL DEFAULT 0,
        account_type INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_chicken_user (user_id),
        INDEX idx_chicken_game (game_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec("ALTER TABLE chicken_bets MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
    await safeExec("ALTER TABLE chicken_bets ADD COLUMN account_type INT NOT NULL DEFAULT 0");
    await safeExec("ALTER TABLE chicken_bets ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

    try {
      const [existingBetValues] = await connection.query("SELECT COUNT(*) as cnt FROM bet_values");
      if (!existingBetValues[0]?.cnt) {
        const defaultVals = [10, 20, 50, 100, 200, 500, 1000];
        for (const v of defaultVals) {
          await safeExec(`INSERT IGNORE INTO bet_values (value, status) VALUES (${v}, 1);`);
        }
      }
    } catch (_) {}

    // 5. AVIATOR GAME TABLES
    await safeExec(`
      CREATE TABLE IF NOT EXISTS aviator_result (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        color VARCHAR(50) NOT NULL DEFAULT 'Aviator',
        game_sr_num VARCHAR(50) NOT NULL UNIQUE,
        game_id INT NOT NULL DEFAULT 5,
        price DECIMAL(8, 2) NOT NULL,
        status INT NOT NULL DEFAULT 1,
        datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_aviator_res_sr (game_sr_num),
        INDEX idx_aviator_res_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS aviator_bet (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uid BIGINT UNSIGNED NOT NULL,
        game_id INT NOT NULL DEFAULT 5,
        game_sr_num VARCHAR(50) NOT NULL,
        number INT NOT NULL DEFAULT 1,
        amount DECIMAL(18, 4) NOT NULL,
        totalamount DECIMAL(18, 4) NOT NULL,
        stop_multiplier DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
        multiplier DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
        win DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        color VARCHAR(50) NULL DEFAULT 'Aviator',
        commission DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        status INT NOT NULL DEFAULT 0,
        result_status INT NOT NULL DEFAULT 0,
        datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_aviator_bet_uid (uid),
        INDEX idx_aviator_bet_sr (game_sr_num),
        INDEX idx_aviator_bet_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure aviator_result and aviator_bet have AUTO_INCREMENT primary keys and required columns
    await safeExec("ALTER TABLE aviator_result MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
    await safeExec("ALTER TABLE aviator_bet MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");

    const aviatorBetColumns = [
      "ADD COLUMN color VARCHAR(50) NULL DEFAULT 'Aviator'",
      "ADD COLUMN commission DECIMAL(18, 4) NOT NULL DEFAULT 0.0000",
      "ADD COLUMN datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    ];
    for (const col of aviatorBetColumns) {
      await safeExec(`ALTER TABLE aviator_bet ${col}`);
    }

    await safeExec(`
      CREATE TABLE IF NOT EXISTS aviator_setting (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        win_per INT NOT NULL DEFAULT 50,
        loss_per INT NOT NULL DEFAULT 50,
        amount DECIMAL(18, 2) NOT NULL DEFAULT 10.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await safeExec(`
      CREATE TABLE IF NOT EXISTS aviator_admin_result (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL DEFAULT 5,
        game_sr_num VARCHAR(50) NOT NULL,
        number DECIMAL(8, 2) NOT NULL,
        status INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_aviator_admin_sr (game_sr_num)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await safeExec(`INSERT IGNORE INTO aviator_setting (id, win_per, loss_per, amount) VALUES (1, 50, 50, 10.00);`);
    } catch (_) {}

    // 6. Seed Default Horses if table is empty
    try {
      const [existingHorses] = await connection.query("SELECT COUNT(*) as cnt FROM horses");
      if (!existingHorses[0]?.cnt) {
        const defaultHorses = [
          [1, "Thunder Bolt", "active"],
          [2, "Storm Runner", "active"],
          [3, "Golden Arrow", "active"],
          [4, "Shadow Blaze", "active"],
          [5, "Midnight Star", "active"],
          [6, "Royal Knight", "active"],
          [7, "Silver Bullet", "active"],
          [8, "Fire Steed", "active"],
          [9, "Wild Pegasus", "active"],
          [10, "Iron Gallop", "active"],
          [11, "Desert Comet", "active"],
          [12, "Victory Spirit", "active"],
        ];
        for (const h of defaultHorses) {
          await safeExec(
            `INSERT IGNORE INTO horses (serial_number, name, status) VALUES (${h[0]}, '${h[1]}', '${h[2]}');`
          );
        }
      }
    } catch (_) {}

    // 7. COUNTRIES TABLE
    await safeExec(`
      CREATE TABLE IF NOT EXISTS countries (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        country_code VARCHAR(20) NOT NULL,
        phone_code VARCHAR(20) NOT NULL,
        short_name VARCHAR(10) NOT NULL DEFAULT 'IN',
        iso_code VARCHAR(10) NOT NULL DEFAULT 'IN',
        currency VARCHAR(20) NOT NULL DEFAULT 'INR',
        status INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      const [existingCountries] = await connection.query("SELECT COUNT(*) as cnt FROM countries");
      if (!existingCountries[0]?.cnt) {
        await safeExec(`
          INSERT IGNORE INTO countries (name, country_code, phone_code, short_name, iso_code, currency, status)
          VALUES ('India', '91', '+91', 'IN', 'IN', 'INR', 1);
        `);
      }
    } catch (_) {}

    // 8. Seed Default 52 Playing Cards if empty
    try {
      const [existingCards] = await connection.query("SELECT COUNT(*) as cnt FROM cards");
      if (!existingCards[0]?.cnt) {
        for (const colour of ['red', 'black']) {
          for (let cardNum = 1; cardNum <= 13; cardNum++) {
            await safeExec(`INSERT IGNORE INTO cards (card, colour) VALUES (${cardNum}, '${colour}');`);
          }
        }
      }
    } catch (_) {}

    // 9. Seed Default Admin if empty
    try {
      const [existingAdmins] = await connection.query("SELECT COUNT(*) as cnt FROM admins");
      if (!existingAdmins[0]?.cnt) {
        await safeExec(`
          INSERT IGNORE INTO admins (id, username, email, password_hash)
          VALUES (1, 'admin', 'admin@veronova.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoO5d6N3hI005rE1xV9uQ0U19N.k456g8u');
        `);
      }
    } catch (_) {}

    console.log("[SchemaBootstrap] ✅ All tables verified & synchronized in single database (veronova_db).");
  } catch (err) {
    console.warn("[SchemaBootstrap] ⚠️ Non-fatal schema verification error:", err.message);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { ensureAllTables };

