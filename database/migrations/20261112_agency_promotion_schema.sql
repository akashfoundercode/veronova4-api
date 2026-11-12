-- Migration: 20261112_agency_promotion_schema.sql
-- Adds agency & promotion columns to users and ensures mlm_levels table exists.

-- 1. Ensure users table has all required columns for referral & promotion
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission DECIMAL(20, 4) NOT NULL DEFAULT '0.0000';
ALTER TABLE users ADD COLUMN IF NOT EXISTS yesterday_total_commission DECIMAL(20, 4) NOT NULL DEFAULT '0.0000';
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_first_recharge TINYINT NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_recharge INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_recharge_amount DECIMAL(20, 4) NULL DEFAULT '0.0000';
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TINYINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus DECIMAL(20, 4) NOT NULL DEFAULT '0.0000';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_wallet DECIMAL(20, 4) NOT NULL DEFAULT '0.0000';
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_payin DECIMAL(20, 4) NOT NULL DEFAULT '0.0000';
ALTER TABLE users ADD COLUMN IF NOT EXISTS no_of_payin INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_balance DECIMAL(20, 4) NOT NULL DEFAULT '0.0000';

-- 2. Ensure MLM Levels table exists
CREATE TABLE IF NOT EXISTS mlm_levels (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  count INT NOT NULL DEFAULT 1,
  commission FLOAT NOT NULL DEFAULT 0.00,
  cashback DECIMAL(10,2) DEFAULT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Insert default MLM commission tiers if not existing
INSERT IGNORE INTO mlm_levels (id, name, count, commission, status) VALUES
(1, 'level 1', 1, 0.6, 1),
(2, 'level 2', 2, 0.18, 1),
(3, 'level 3', 3, 0.054, 1),
(4, 'level 4', 4, 0.016, 1),
(5, 'level 5', 5, 0.0048, 1),
(6, 'level 6', 6, 0.0014, 1);

-- 4. Ensure wallet_history description columns exist
ALTER TABLE wallet_history ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL;
ALTER TABLE wallet_history ADD COLUMN IF NOT EXISTS description_2 VARCHAR(255) NULL;

-- 5. Ensure invite_bonus and invite_bonus_claim tables exist
CREATE TABLE IF NOT EXISTS invite_bonus (
  id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  no_of_user INT(11) NOT NULL,
  amount DOUBLE(10,2) NOT NULL DEFAULT 500.00,
  claim_amount DOUBLE(10,2) NOT NULL DEFAULT 0.00,
  status TINYINT(4) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invite_bonus_claim (
  id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  userid BIGINT(20) NOT NULL,
  invite_id BIGINT(20) NOT NULL,
  amount DOUBLE(10,2) NULL DEFAULT 0.00,
  status TINYINT(4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userid (userid),
  INDEX idx_invite_id (invite_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Insert default invitation milestone bonus tiers
INSERT IGNORE INTO invite_bonus (id, no_of_user, amount, claim_amount, status) VALUES
(1, 1, 500, 55, 1),
(2, 3, 500, 155, 1),
(3, 10, 500, 600, 1),
(4, 30, 500, 1800, 1),
(5, 50, 500, 3000, 1),
(6, 100, 500, 6000, 1),
(7, 200, 500, 12000, 1),
(8, 500, 500, 30000, 1),
(9, 1000, 500, 75000, 1),
(10, 5000, 500, 400000, 1),
(11, 10000, 500, 1000000, 1),
(12, 20000, 500, 2000000, 1),
(13, 50000, 500, 5000000, 1),
(14, 100000, 500, 10000000, 1);


