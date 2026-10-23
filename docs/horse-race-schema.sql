-- Apply only to the dedicated HORSE_DB_DATABASE schema.
-- The runtime does not run migrations or modify database schemas.

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(80) NULL,
    username VARCHAR(40) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        last_activity_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_session_user (user_id), INDEX idx_user_session_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(40) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    admin_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin_session_admin (admin_id), INDEX idx_admin_session_expiry (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_password_resets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    admin_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_admin_reset_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin_reset_admin (admin_id), INDEX idx_admin_reset_expiry (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    balance DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status ENUM('active', 'locked', 'suspended') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    wallet_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('credit', 'debit') NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'manual',
    amount DECIMAL(18, 4) NOT NULL,
    balance_before DECIMAL(18, 4) NOT NULL,
    balance_after DECIMAL(18, 4) NOT NULL,
    reference_id VARCHAR(100) NULL,
    reference_type VARCHAR(50) NULL,
    description VARCHAR(255) NULL,
    status ENUM('pending', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_wallet_tx_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
    CONSTRAINT fk_wallet_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at DESC),
    INDEX idx_wallet_created (wallet_id, created_at DESC),
    INDEX idx_reference (reference_id),
    INDEX idx_type (type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS horses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    serial_number INT UNSIGNED NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    image_url MEDIUMTEXT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_serial_number (serial_number),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS games (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    game_code VARCHAR(30) NOT NULL UNIQUE,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_games_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_game_user_id (user_id),
    INDEX idx_game_code (game_code),
    INDEX idx_game_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS races (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
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
    PRIMARY KEY (id),
    CONSTRAINT fk_races_winner_horse FOREIGN KEY (winner_horse_id) REFERENCES horses(id) ON DELETE SET NULL,
    INDEX idx_game_serial (game_serial),
    INDEX idx_race_status (status),
    INDEX idx_winner_horse_id (winner_horse_id),
    INDEX idx_race_created (created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS race_horses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
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
    PRIMARY KEY (id),
    CONSTRAINT fk_race_horses_race FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
    CONSTRAINT fk_race_horses_horse FOREIGN KEY (horse_id) REFERENCES horses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_race_horse (race_id, horse_id),
    UNIQUE KEY uk_race_serial (race_id, serial_number),
    INDEX idx_race_id (race_id),
    INDEX idx_horse_id (horse_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    game_id BIGINT UNSIGNED NULL,
    game_code VARCHAR(30) NULL,
    race_id BIGINT UNSIGNED NOT NULL,
    game_serial VARCHAR(30) NOT NULL,
    horse_id BIGINT UNSIGNED NOT NULL,
    horse_serial INT UNSIGNED NOT NULL,
    horse_name VARCHAR(100) NOT NULL,
    amount DECIMAL(18, 4) NOT NULL,
    odds DECIMAL(10, 2) NOT NULL DEFAULT '2.00',
    jackpot_multiplier DECIMAL(5, 2) NOT NULL DEFAULT '1.00',
    potential_payout DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
    status ENUM('PENDING', 'WON', 'LOST', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    payout_amount DECIMAL(18, 4) NOT NULL DEFAULT '0.0000',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bets_race FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
    CONSTRAINT fk_bets_horse FOREIGN KEY (horse_id) REFERENCES horses(id) ON DELETE CASCADE,
    INDEX idx_bet_user_race (user_id, race_id),
    INDEX idx_bet_race_status (race_id, status),
    INDEX idx_bet_game_serial (game_serial),
    INDEX idx_bet_user_created (user_id, created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scheduled_race_winners (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    game_serial VARCHAR(30) NOT NULL UNIQUE,
    horse_id BIGINT UNSIGNED NULL,
    horse_serial INT UNSIGNED NOT NULL,
    horse_name VARCHAR(100) NULL,
    reason VARCHAR(255) NULL,
    status ENUM('PENDING', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_sched_game_serial (game_serial),
    INDEX idx_sched_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scheduled_jackpots (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    game_serial VARCHAR(30) NOT NULL UNIQUE,
    multiplier DECIMAL(5, 2) NOT NULL DEFAULT '2.00',
    reason VARCHAR(255) NULL,
    status ENUM('PENDING', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_sched_jackpot_serial (game_serial),
    INDEX idx_sched_jackpot_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO horses (serial_number, name, status) VALUES
(1, 'Thunder Bolt', 'active'),
(2, 'Storm Runner', 'active'),
(3, 'Golden Arrow', 'active'),
(4, 'Shadow Blaze', 'active'),
(5, 'Midnight Star', 'active'),
(6, 'Royal Knight', 'active'),
(7, 'Silver Bullet', 'active'),
(8, 'Fire Steed', 'active'),
(9, 'Wild Pegasus', 'active'),
(10, 'Iron Gallop', 'active'),
(11, 'Desert Comet', 'active'),
(12, 'Victory Spirit', 'active');
