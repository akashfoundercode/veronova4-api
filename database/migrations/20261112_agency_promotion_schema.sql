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

