"use strict";

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const config = require("../../config");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");
const { findAvailableReferralCode, findAvailableUserId } = require("../auth/auth.service");

const TIME_ZONE = "Asia/Kolkata";
const DAYS_BY_PERIOD = Object.freeze({ "7d": 7, "30d": 30 });

function localDateString(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(dateString, days) {
  const shifted = new Date(`${dateString}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metric(value, currentPeriod, previousPeriod) {
  const current = number(currentPeriod);
  const previous = number(previousPeriod);
  const changePercent = previous === 0
    ? (current === 0 ? 0 : 100)
    : Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
  return {
    value: number(value),
    currentPeriod: current,
    previousPeriod: previous,
    changePercent,
    trend: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat",
  };
}

function dateSeries(startDate, days, rows) {
  const values = new Map(rows.map((row) => [
    row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10),
    number(row.value),
  ]));
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDate(startDate, index);
    return { date, value: values.get(date) ?? 0 };
  });
}

function randomCharacters(characters, length) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += characters[crypto.randomInt(characters.length)];
  }
  return value;
}

function formatKycStatus(verification) {
  const code = Number(verification ?? 0);
  if (code === 2) return "Verified";
  if (code === 1) return "Pending";
  return "Unverified";
}

function calculateVipTier(turnover, totalDeposit, wallet) {
  const thresholds = [
    { level: 10, min: 100000000 },
    { level: 9, min: 30000000 },
    { level: 8, min: 10000000 },
    { level: 7, min: 3000000 },
    { level: 6, min: 1000000 },
    { level: 5, min: 300000 },
    { level: 4, min: 100000 },
    { level: 3, min: 30000 },
    { level: 2, min: 10000 },
    { level: 1, min: 3000 },
  ];

  const highestMetric = Math.max(number(turnover), number(totalDeposit));
  let level = 0;
  for (const t of thresholds) {
    if (highestMetric >= t.min) {
      level = t.level;
      break;
    }
  }

  const isHighRoller =
    number(turnover) >= 30000 ||
    number(wallet) >= 10000 ||
    number(totalDeposit) >= 10000 ||
    level >= 2;

  return {
    level,
    name: `VIP ${level}`,
    is_high_roller: isHighRoller,
  };
}

function formatPlayer(row) {
  const totalTurnover = number(row.turnover) + number(row.bets_turnover);
  const todayTurnover = number(row.today_turnover);
  const mainWallet = number(row.wallet);
  const winningWallet = number(row.winning_wallet);
  const totalDeposit = number(row.total_deposit);
  const kycStatus = formatKycStatus(row.verification);
  const vipTier = calculateVipTier(totalTurnover, totalDeposit, mainWallet);
  const isSuspended = Number(row.status) === 0;
  const illegalCount = number(row.illegal_count);
  const isIllegal = illegalCount > 0;

  return {
    id: row.id,
    username: row.username,
    u_id: row.u_id,
    userimage: row.userimage,
    created_at: row.created_at,

    // Player Details
    player_details: {
      id: row.id,
      username: row.username,
      u_id: row.u_id,
      userimage: row.userimage,
      created_at: row.created_at,
      account_type: row.account_type ?? 0,
      illegal_count: illegalCount,
      is_illegal: isIllegal,
    },

    // Contact & KYC
    contact_and_kyc: {
      mobile: row.mobile,
      email: row.email,
      country_code: row.country_code ? String(row.country_code) : "91",
      verification: Number(row.verification ?? 0),
      kyc_status: kycStatus,
    },
    mobile: row.mobile,
    email: row.email,
    country_code: row.country_code ? String(row.country_code) : "91",
    kyc_status: kycStatus,

    // VIP Tier
    vip_tier: vipTier,
    vip_level: vipTier.level,
    vip_tier_name: vipTier.name,
    is_high_roller: vipTier.is_high_roller,

    // Main Wallet (Player Holdings)
    main_wallet: mainWallet,
    wallet: mainWallet,

    // Winning Wallet (Winning Liability)
    winning_wallet: winningWallet,

    // Turn Over
    turn_over: {
      total_turnover: totalTurnover,
      today_turnover: todayTurnover,
    },
    turnover: totalTurnover,
    today_turnover: todayTurnover,

    // Sponsor Info
    sponsor_info: {
      sponsor_id: row.referral_user_id ?? null,
      sponsor_username: row.sponsor_username ?? null,
      sponsor_referral_code: row.sponsor_referral_code ?? null,
      sponsor_mobile: row.sponsor_mobile ?? null,
    },
    sponsor_id: row.referral_user_id ?? null,
    sponsor_username: row.sponsor_username ?? null,
    sponsor_referral_code: row.sponsor_referral_code ?? null,

    // Illegal Count & Status
    illegal_count: illegalCount,
    illegalCount: illegalCount,
    is_illegal: isIllegal,
    isIllegal: isIllegal,

    // Status & Actions
    status: Number(row.status),
    status_label: isSuspended ? "Suspended" : "Active",
    actions: ["suspend", "unsuspend"],
    available_actions: isSuspended ? ["unsuspend"] : ["suspend"],
  };
}

let attendanceTableInitialized = false;

async function ensureAttendanceTable(pool) {
  if (attendanceTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS attendances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        accumulated_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        attendance_bonus DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        date VARCHAR(50) DEFAULT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    attendanceTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatAttendance(row) {
  if (!row) return null;
  const isStatusActive = Number(row.status) === 1;
  let dateStr = null;
  if (row.date) {
    if (row.date instanceof Date) {
      dateStr = row.date.toISOString().slice(0, 10);
    } else {
      dateStr = String(row.date);
    }
  } else if (row.created_at) {
    dateStr = row.created_at instanceof Date
      ? row.created_at.toISOString().slice(0, 10)
      : String(row.created_at).slice(0, 10);
  }

  return {
    id: Number(row.id),
    accumulated_amount: number(row.accumulated_amount),
    attendance_bonus: number(row.attendance_bonus),
    date: dateStr,
    status: Number(row.status ?? 1),
    status_label: isStatusActive ? "Active" : "Inactive",
    action: ["edit", "update"],
    actions: ["edit", "update"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

let fundTransferTableInitialized = false;

async function ensureFundTransferTable(pool) {
  if (fundTransferTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin_fund_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        type VARCHAR(100) NOT NULL,
        remark VARCHAR(255) DEFAULT NULL,
        description VARCHAR(255) DEFAULT NULL,
        previous_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        admin_id INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);
    fundTransferTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

const VALID_FUND_TRANSFER_TYPES = Object.freeze([
  "ADD FUND",
  "FUND TRANSFER",
  "FIRST RECHARGE SELF BONUS",
  "SECOND RECHARGE SELF BONUS",
  "FIRST RECHARGE AGENT BONUS",
  "ADVERTISEMENT SUPPORT",
  "ADVANCE SALLARY",
]);

function normalizeTransferType(rawType) {
  if (!rawType || typeof rawType !== "string") {
    return "FUND TRANSFER";
  }
  const clean = rawType.trim().replace(/[-_]+/g, " ").toUpperCase();
  const matched = VALID_FUND_TRANSFER_TYPES.find(
    (t) => t === clean || t.replace(/\s+/g, "") === clean.replace(/\s+/g, ""),
  );
  return matched || clean;
}

function formatFundTransfer(row) {
  if (!row) return null;
  const rawDate = row.created_at
    ? (row.created_at instanceof Date ? row.created_at.toISOString().slice(0, 19).replace("T", " ") : String(row.created_at))
    : null;

  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    u_id: row.u_id ?? null,
    username: row.username ?? null,
    mobile: row.mobile ?? null,
    amount: number(row.amount),
    type: row.type,
    remark: row.remark ?? "",
    description: row.description ?? "",
    previous_balance: number(row.previous_balance),
    current_balance: number(row.current_balance),
    date: rawDate,
    created_at: row.created_at,
  };
}

let vipLevelsTableInitialized = false;

async function ensureVipLevelsTable(pool) {
  if (vipLevelsTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vip_levels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(28) NOT NULL,
        betting_range VARCHAR(64) NOT NULL,
        deposit_range VARCHAR(64) NOT NULL,
        level_up_rewards INT(11) NOT NULL DEFAULT 0,
        monthly_rewards INT(11) NOT NULL DEFAULT 0,
        rebate_rate DOUBLE(10,2) NOT NULL DEFAULT 0.06,
        safe_income FLOAT NOT NULL DEFAULT 0.20,
        my_exprience INT(11) NOT NULL DEFAULT 0,
        days_count INT(11) NOT NULL DEFAULT 30,
        status TINYINT(4) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    vipLevelsTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatVipLevel(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    betting_range: row.betting_range != null ? String(row.betting_range) : "0",
    level_up_rewards: number(row.level_up_rewards),
    monthly_rewards: number(row.monthly_rewards),
    action: ["edit", "update"],
  };
}

let ipAddressTableInitialized = false;

async function ensureIpAddressTable(pool) {
  if (ipAddressTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ip_address (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT(11) NOT NULL,
        ip_address VARCHAR(100) NOT NULL,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    ipAddressTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatLoginRecord(row, todayStr) {
  if (!row) return null;
  const loginDate = row.login_time || row.created_at;
  let dateStr = null;
  let timeStr = null;
  if (loginDate instanceof Date) {
    const iso = loginDate.toISOString();
    dateStr = iso.slice(0, 10);
    timeStr = iso.slice(0, 19).replace("T", " ");
  } else if (loginDate) {
    const s = String(loginDate);
    dateStr = s.slice(0, 10);
    timeStr = s.slice(0, 19).replace("T", " ");
  }

  const isToday = todayStr ? dateStr === todayStr : false;

  return {
    "#": Number(row.id),
    id: Number(row.id),
    user_id: row.user_id,
    u_id: row.u_id ?? String(row.user_id),
    username: row.username ?? null,
    mobile: row.mobile ?? null,
    email: row.email ?? null,
    account_type: row.account_type != null ? Number(row.account_type) : 0,
    ip_address: row.ip_address,
    login_time: timeStr,
    date: dateStr,
    is_today: isToday,
    created_at: row.created_at,
  };
}

let salaryTablesInitialized = false;

async function ensureSalaryTables(pool) {
  if (salaryTablesInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_salary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT(11) NOT NULL,
        active_players INT(11) NOT NULL DEFAULT 0,
        downline_levels INT(11) NOT NULL DEFAULT 0,
        daily_deposit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        daily_withdrawal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        daily_profit_loss DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        daily_profit_loss_type ENUM('profit','loss') NOT NULL DEFAULT 'profit',
        monthly_deposit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        monthly_withdrawal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        monthly_profit_loss DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        monthly_profit_loss_type ENUM('profit','loss') NOT NULL DEFAULT 'profit',
        salary DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        salary_type INT(5) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS all_users_salary_record (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT(11) NOT NULL,
        salary_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        remark VARCHAR(100) DEFAULT NULL,
        status TINYINT(4) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    salaryTablesInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

let mlmLevelsTableInitialized = false;

async function ensureMlmLevelsTable(pool) {
  if (mlmLevelsTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS mlm_levels (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        count INT(11) NOT NULL DEFAULT 1,
        commission FLOAT NOT NULL DEFAULT 0.00,
        cashback DECIMAL(10,2) DEFAULT NULL,
        status TINYINT(4) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    mlmLevelsTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatSalaryRecord(row) {
  if (!row) return null;
  let salaryType = 1;
  let salaryTypeLabel = "Daily Salary";
  if (row.salary_type === 2 || String(row.salary_type).toLowerCase() === "monthly") {
    salaryType = 2;
    salaryTypeLabel = "Monthly Salary";
  } else if (row.salary_type === 1 || String(row.salary_type).toLowerCase() === "daily") {
    salaryType = 1;
    salaryTypeLabel = "Daily Salary";
  } else if (Number.isFinite(Number(row.salary_type))) {
    salaryType = Number(row.salary_type);
    salaryTypeLabel = salaryType === 2 ? "Monthly Salary" : "Daily Salary";
  }

  const dateStr = row.created_at
    ? (row.created_at instanceof Date ? row.created_at.toISOString().slice(0, 19).replace("T", " ") : String(row.created_at))
    : null;

  return {
    "#": Number(row.id),
    id: Number(row.id),
    user_id: Number(row.user_id),
    u_id: row.u_id ?? String(row.user_id),
    username: row.username ?? null,
    mobile: row.mobile ?? null,
    salary: number(row.salary ?? row.salary_amount),
    salary_amount: number(row.salary ?? row.salary_amount),
    salary_type: salaryType,
    salary_type_label: salaryTypeLabel,
    active_players: number(row.active_players),
    downline_levels: number(row.downline_levels),
    daily_deposit: number(row.daily_deposit),
    daily_withdrawal: number(row.daily_withdrawal),
    daily_profit_loss: number(row.daily_profit_loss),
    daily_profit_loss_type: row.daily_profit_loss_type ?? "profit",
    monthly_deposit: number(row.monthly_deposit),
    monthly_withdrawal: number(row.monthly_withdrawal),
    monthly_profit_loss: number(row.monthly_profit_loss),
    monthly_profit_loss_type: row.monthly_profit_loss_type ?? "profit",
    remark: row.remark ?? "",
    status: Number(row.status ?? 1),
    status_label: Number(row.status ?? 1) === 1 ? "Paid" : "Pending",
    date: dateStr,
    created_at: row.created_at,
  };
}

let offersTableInitialized = false;

async function ensureOffersTable(pool) {
  if (offersTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        code VARCHAR(50) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        offer_type VARCHAR(50) NOT NULL DEFAULT 'general',
        bonus_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        bonus_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        min_recharge DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        max_bonus DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        banner_image VARCHAR(255) DEFAULT NULL,
        start_date VARCHAR(50) DEFAULT NULL,
        end_date VARCHAR(50) DEFAULT NULL,
        usage_limit INT(11) NOT NULL DEFAULT 0,
        used_count INT(11) NOT NULL DEFAULT 0,
        status TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    offersTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatOffer(row) {
  if (!row) return null;
  const statusNum = Number(row.status ?? 1);
  const statusLabel = statusNum === 1 ? "Active" : (statusNum === -1 ? "Deleted" : "Inactive");
  const dateStr = row.created_at
    ? (row.created_at instanceof Date ? row.created_at.toISOString().slice(0, 19).replace("T", " ") : String(row.created_at))
    : null;

  return {
    "#": Number(row.id),
    id: Number(row.id),
    title: row.title ?? row.name ?? "",
    name: row.title ?? row.name ?? "",
    code: row.code ?? null,
    description: row.description ?? "",
    offer_type: row.offer_type ?? "general",
    type: row.offer_type ?? "general",
    bonus_amount: number(row.bonus_amount),
    amount: number(row.bonus_amount),
    bonus_percentage: number(row.bonus_percentage),
    percentage: number(row.bonus_percentage),
    min_recharge: number(row.min_recharge),
    min_amount: number(row.min_recharge),
    max_bonus: number(row.max_bonus),
    banner_image: row.banner_image ?? null,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    usage_limit: Number(row.usage_limit ?? 0),
    used_count: Number(row.used_count ?? 0),
    status: statusNum,
    status_label: statusLabel,
    action: ["edit", "update", "delete"],
    actions: ["edit", "update", "delete"],
    available_actions: ["edit", "update", "delete"],
    date: dateStr,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function generate15DigitGiftCode() {
  const first = Math.floor(Math.random() * 9) + 1;
  const rem = crypto.randomBytes(8).readBigUInt64BE() % 100000000000000n;
  return `${first}${String(rem).padStart(14, "0")}`;
}

let giftCartTableInitialized = false;

async function ensureGiftCartTable(pool) {
  if (giftCartTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS gift_cart (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(111) NOT NULL,
        amount INT(11) NOT NULL DEFAULT 0,
        number_people INT(11) NOT NULL DEFAULT 1,
        availed_num INT(11) NOT NULL DEFAULT 0,
        deposit_amount INT(11) NOT NULL DEFAULT 0,
        campaign_tag VARCHAR(100) DEFAULT NULL,
        status INT(11) NOT NULL DEFAULT 1,
        datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await pool.execute("ALTER TABLE gift_cart ADD COLUMN campaign_tag VARCHAR(100) DEFAULT NULL");
    } catch {
      // ignore if exists
    }
    giftCartTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatGift(row) {
  if (!row) return null;
  const id = Number(row.id);
  const code = String(row.code ?? "");
  const depositRequired = number(row.deposit_amount);
  const giftRewardAmount = number(row.amount);
  const numberPeople = Number(row.number_people ?? 1);
  const availedNum = Number(row.availed_num ?? 0);
  const slotsRemaining = Math.max(0, numberPeople - availedNum);
  const percentClaimed = numberPeople > 0 ? Math.min(100, Math.round((availedNum / numberPeople) * 100)) : 0;
  const claimProgress = `${availedNum}/${numberPeople} (${percentClaimed}%)`;

  const dateVal = row.datetime || row.created_at;
  let createdDate = null;
  if (dateVal instanceof Date) {
    createdDate = dateVal.toISOString().slice(0, 19).replace("T", " ");
  } else if (dateVal) {
    createdDate = String(dateVal).slice(0, 19).replace("T", " ");
  }

  const isExhausted = slotsRemaining <= 0;
  const statusNum = Number(row.status ?? 1);
  const statusLabel = statusNum === -1 ? "Deleted" : (isExhausted ? "Exhausted" : (statusNum === 1 ? "Active" : "Inactive"));

  return {
    "#": id,
    "#ID": id,
    id,
    "15-Digit Gift Code": code,
    code,
    gift_code: code,
    "Deposit Required": depositRequired,
    deposit_required: depositRequired,
    deposit_amount: depositRequired,
    req_deposit: depositRequired,
    "Gift Reward Amount": giftRewardAmount,
    gift_reward_amount: giftRewardAmount,
    amount: giftRewardAmount,
    gift_amount: giftRewardAmount,
    "Claim Progress": claimProgress,
    claim_progress: claimProgress,
    claim_stats: {
      claimed: availedNum,
      total_slots: numberPeople,
      slots_remaining: slotsRemaining,
      percentage: percentClaimed,
    },
    availed_num: availedNum,
    number_people: numberPeople,
    max_claims: numberPeople,
    "Slots Remaining": slotsRemaining,
    slots_remaining: slotsRemaining,
    campaign_tag: row.campaign_tag ?? null,
    Campaign_Tag: row.campaign_tag ?? null,
    status: statusNum,
    status_label: statusLabel,
    is_exhausted: isExhausted,
    "Created Date": createdDate,
    created_date: createdDate,
    datetime: createdDate,
    created_at: dateVal,
    action: ["view", "edit", "status", "delete"],
    actions: ["view", "edit", "status", "delete"],
    Actions: ["view", "edit", "status", "delete"],
    available_actions: ["view", "edit", "status", "delete"],
  };
}

let slidersTableInitialized = false;

async function ensureSlidersTable(pool) {
  if (slidersTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sliders (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        image VARCHAR(255) NOT NULL,
        activity_image VARCHAR(255) NOT NULL,
        activity_image_url VARCHAR(255) DEFAULT NULL,
        status TINYINT(4) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    slidersTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatBanner(row) {
  if (!row) return null;
  const id = Number(row.id);
  const statusNum = Number(row.status ?? 1);
  const isStatusActive = statusNum === 1;
  const statusLabel = statusNum === -1 ? "Deleted" : (isStatusActive ? "Active" : "Inactive");
  const bannerImage = row.image ?? row.banner_image ?? "";
  const activityImage = row.activity_image ?? "";
  const activityImageUrl = row.activity_image_url ?? activityImage;
  const title = row.title ?? "";

  const dateVal = row.created_at || row.updated_at;
  const dateStr = dateVal instanceof Date
    ? dateVal.toISOString().slice(0, 19).replace("T", " ")
    : (dateVal ? String(dateVal).slice(0, 19).replace("T", " ") : null);

  return {
    "#": id,
    id,
    Title: title,
    title,
    "Banner Image": bannerImage,
    banner_image: bannerImage,
    image: bannerImage,
    "Activity Image": activityImage,
    activity_image: activityImage,
    activity_image_url: activityImageUrl,
    Status: statusNum,
    status: statusNum,
    status_label: statusLabel,
    Actions: ["edit", "update", "delete", "status"],
    action: ["edit", "update", "delete", "status"],
    actions: ["edit", "update", "delete", "status"],
    available_actions: ["edit", "update", "delete", "status"],
    created_at: row.created_at,
    updated_at: row.updated_at,
    date: dateStr,
  };
}

let paymentLimitsTableInitialized = false;

async function ensurePaymentLimitsTable(pool) {
  if (paymentLimitsTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payment_limits (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        amount FLOAT NOT NULL DEFAULT 0,
        status INT(11) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    paymentLimitsTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatPaymentLimit(row) {
  if (!row) return null;
  const id = Number(row.id);
  const statusNum = Number(row.status ?? 1);
  const isStatusActive = statusNum === 1;
  const statusLabel = statusNum === -1 ? "Deleted" : (isStatusActive ? "Active" : "Inactive");
  const name = row.name ? String(row.name).trim() : (row.Name ? String(row.Name).trim() : "");
  const amount = number(row.amount ?? row.Amount);

  const dateVal = row.updated_at || row.created_at;
  const dateStr = dateVal instanceof Date
    ? dateVal.toISOString().slice(0, 19).replace("T", " ")
    : (dateVal ? String(dateVal).slice(0, 19).replace("T", " ") : null);

  const createdDateVal = row.created_at || row.updated_at;
  const createdDateStr = createdDateVal instanceof Date
    ? createdDateVal.toISOString().slice(0, 19).replace("T", " ")
    : (createdDateVal ? String(createdDateVal).slice(0, 19).replace("T", " ") : null);

  return {
    "#": id,
    "#ID": id,
    ID: id,
    id,
    Name: name,
    name,
    Amount: amount,
    amount,
    Status: statusNum,
    status: statusNum,
    status_label: statusLabel,
    "Updated At": dateStr,
    updated_at: dateStr,
    "Created At": createdDateStr,
    created_at: createdDateStr,
    Action: ["edit", "update", "delete", "status"],
    Actions: ["edit", "update", "delete", "status"],
    action: ["edit", "update", "delete", "status"],
    actions: ["edit", "update", "delete", "status"],
    available_actions: ["edit", "update", "delete", "status"],
  };
}

let payinsTableInitialized = false;

async function ensurePayinsTable(pool) {
  if (payinsTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payins (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT(20) UNSIGNED NOT NULL,
        cash DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        usdt_amount FLOAT DEFAULT NULL,
        extra_cash DECIMAL(10,2) DEFAULT NULL,
        bonus VARCHAR(20) DEFAULT NULL,
        order_id VARCHAR(255) DEFAULT NULL,
        redirect_url VARCHAR(255) DEFAULT NULL,
        type INT(11) DEFAULT 0,
        status TINYINT(4) NOT NULL DEFAULT 1,
        rejectmsg VARCHAR(111) DEFAULT NULL,
        account_type TINYINT(4) NOT NULL DEFAULT 0,
        typeimage VARCHAR(255) DEFAULT NULL,
        transaction_id VARCHAR(555) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        screenshot VARCHAR(255) DEFAULT NULL
      )
    `);
    payinsTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatDeposit(row) {
  if (!row) return null;
  const id = Number(row.id);
  const userId = Number(row.user_id);
  const username = row.username ? String(row.username).trim() : `User_${userId}`;
  const orderId = row.order_id ? String(row.order_id).trim() : "";
  const amount = number(row.cash ?? row.amount);
  const statusNum = Number(row.status ?? 1);

  let statusLabel = "Pending";
  if (statusNum === 2) {
    statusLabel = "Success";
  } else if (statusNum === 3 || statusNum === 0 || row.rejectmsg) {
    statusLabel = "Rejected";
  }

  const dateVal = row.created_at || row.updated_at;
  const dateStr = dateVal instanceof Date
    ? dateVal.toISOString().slice(0, 19).replace("T", " ")
    : (dateVal ? String(dateVal).slice(0, 19).replace("T", " ") : null);

  const actions = statusNum === 1
    ? ["approve", "reject", "view"]
    : ["view"];

  return {
    "#": id,
    "#ID": id,
    Id: id,
    id,
    "User Id": userId,
    user_id: userId,
    "User Name": username,
    username,
    u_id: row.u_id ?? String(userId),
    mobile: row.mobile ?? null,
    "Order Id": orderId,
    order_id: orderId,
    Amount: amount,
    amount,
    cash: amount,
    Status: statusLabel,
    status: statusNum,
    status_label: statusLabel,
    Date: dateStr,
    date: dateStr,
    created_at: dateVal,
    updated_at: row.updated_at ?? null,
    rejectmsg: row.rejectmsg ?? null,
    "Reject Reason": row.rejectmsg ?? null,
    transaction_id: row.transaction_id ?? null,
    screenshot: row.screenshot ?? null,
    type: row.type !== undefined ? Number(row.type) : 0,
    Actions: actions,
    actions,
    Action: actions,
    available_actions: actions,
  };
}

let withdrawHistoriesTableInitialized = false;

async function ensureWithdrawHistoriesTable(pool) {
  if (withdrawHistoriesTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS withdraw_histories (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT(20) UNSIGNED NOT NULL,
        amount DOUBLE NOT NULL DEFAULT 0,
        usdt_amount FLOAT DEFAULT NULL,
        actual_amount DOUBLE NOT NULL DEFAULT 0,
        mobile VARCHAR(255) DEFAULT NULL,
        account_id VARCHAR(555) DEFAULT NULL,
        type INT(10) UNSIGNED DEFAULT NULL,
        usdt_wallet_address VARCHAR(100) DEFAULT NULL,
        upi_id VARCHAR(64) DEFAULT NULL,
        order_id VARCHAR(100) DEFAULT NULL,
        payout INT(10) UNSIGNED DEFAULT NULL,
        remark VARCHAR(255) DEFAULT NULL,
        response TEXT DEFAULT NULL,
        status TINYINT(4) NOT NULL DEFAULT 1,
        account_type TINYINT(4) NOT NULL DEFAULT 0,
        typeimage VARCHAR(255) DEFAULT NULL,
        referenceId VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        rejectmsg TEXT DEFAULT NULL
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS account_details (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT(20) UNSIGNED NOT NULL,
        name VARCHAR(40) NOT NULL,
        account_number VARCHAR(20) NOT NULL,
        branch VARCHAR(40) DEFAULT NULL,
        bank_name VARCHAR(64) DEFAULT NULL,
        ifsc_code VARCHAR(25) NOT NULL,
        upi_id VARCHAR(64) DEFAULT NULL,
        status TINYINT(4) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    withdrawHistoriesTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatWithdrawal(row) {
  if (!row) return null;
  const id = Number(row.id);
  const userId = Number(row.user_id);
  const username = row.username ? String(row.username).trim() : `User_${userId}`;
  const bankHolderName = row.bank_holder_name ? String(row.bank_holder_name).trim() : (row.name ? String(row.name).trim() : "");
  const bankName = row.bank_name ? String(row.bank_name).trim() : "";
  const accountNumber = row.account_number ? String(row.account_number).trim() : "";
  const ifscCode = row.ifsc_code ? String(row.ifsc_code).trim() : "";
  const upiId = row.upi_id ? String(row.upi_id).trim() : "";
  const amount = number(row.amount);
  const actualAmount = number(row.actual_amount ?? (amount > 0 ? amount : 0));
  const statusNum = Number(row.status ?? 1);

  let statusLabel = "Pending";
  if (statusNum === 2) {
    statusLabel = "Approved";
  } else if (statusNum === 3 || statusNum === 0 || row.rejectmsg) {
    statusLabel = "Rejected";
  }

  const msg = row.msg ? String(row.msg).trim() : (row.rejectmsg ? String(row.rejectmsg).trim() : (row.remark ? String(row.remark).trim() : ""));

  const dateVal = row.created_at || row.updated_at;
  const dateStr = dateVal instanceof Date
    ? dateVal.toISOString().slice(0, 19).replace("T", " ")
    : (dateVal ? String(dateVal).slice(0, 19).replace("T", " ") : null);

  const actions = statusNum === 1
    ? ["approve", "reject", "view"]
    : ["view"];

  return {
    "#": id,
    "#ID": id,
    Id: id,
    id,
    "User name": username,
    "User Name": username,
    username,
    "User Id": userId,
    user_id: userId,
    u_id: row.u_id ?? String(userId),
    mobile: row.mobile ?? null,
    "Bank Holder name": bankHolderName,
    bank_holder_name: bankHolderName,
    "Bank name": bankName,
    bank_name: bankName,
    "Ac. No.": accountNumber,
    account_number: accountNumber,
    IFSC: ifscCode,
    ifsc: ifscCode,
    ifsc_code: ifscCode,
    "UPI ID": upiId,
    upi_id: upiId,
    Amount: amount,
    amount,
    Actual_amount: actualAmount,
    actual_amount: actualAmount,
    Status: statusLabel,
    status: statusNum,
    status_label: statusLabel,
    Msg: msg,
    msg,
    rejectmsg: row.rejectmsg ?? null,
    Date: dateStr,
    date: dateStr,
    created_at: dateVal,
    updated_at: row.updated_at ?? null,
    order_id: row.order_id ?? null,
    Actions: actions,
    actions,
    Action: actions,
    available_actions: actions,
  };
}

let supportSettingTableInitialized = false;

async function ensureSupportSettingTable(pool) {
  if (supportSettingTableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS support_setting (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) DEFAULT NULL,
        socialmedia VARCHAR(255) DEFAULT NULL,
        status INT(11) DEFAULT 1,
        datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    supportSettingTableInitialized = true;
  } catch {
    // If pool mock or sandbox, proceed
  }
}

function formatSupportSetting(row) {
  if (!row) return null;
  const id = Number(row.id);
  const name = row.name ? String(row.name).trim() : "";
  const socialMedia = (row.socialmedia ?? row.social_media ?? row["Social Media"]) !== undefined
    ? String(row.socialmedia ?? row.social_media ?? row["Social Media"]).trim()
    : "";
  const statusNum = Number(row.status ?? 1);
  const statusLabel = statusNum === -1 ? "Deleted" : (statusNum === 1 ? "Active" : "Inactive");

  const dateVal = row.datetime || row.created_at || row.updated_at;
  const dateStr = dateVal instanceof Date
    ? dateVal.toISOString().slice(0, 19).replace("T", " ")
    : (dateVal ? String(dateVal).slice(0, 19).replace("T", " ") : null);

  const actions = ["edit", "update", "delete", "status"];

  return {
    "#": id,
    "#ID": id,
    Id: id,
    id,
    name,
    Name: name,
    "Social Media": socialMedia,
    social_media: socialMedia,
    socialmedia: socialMedia,
    link: socialMedia,
    url: socialMedia,
    Status: statusNum,
    status: statusNum,
    status_label: statusLabel,
    Date: dateStr,
    date: dateStr,
    datetime: dateVal,
    created_at: dateVal,
    Action: actions,
    Actions: actions,
    action: actions,
    actions,
    available_actions: actions,
  };
}

function buildCounts({ user = {}, bet = {}, deposit = {}, withdrawal = {}, extra = {} } = {}) {
  const chickenNet = number(extra.chicken_net);
  const aviatorNet = number(extra.aviator_net);
  const chickenProfit = Math.max(chickenNet, 0);
  const chickenLoss = Math.abs(Math.min(chickenNet, 0));
  const aviatorProfit = Math.max(aviatorNet, 0);
  const aviatorLoss = Math.abs(Math.min(aviatorNet, 0));
  const otpPack = number(extra.otp_pack);

  return {
    total_player: number(user.total_players),
    total_turnover: number(bet.total_turnover),
    total_deposit: number(deposit.total_deposit),
    total_withdrawal: number(withdrawal.total_withdrawal),
    otp_pack_balance: otpPack,
    total_commission: number(extra.total_commission),
    total_games: number(extra.total_games),
    feedbacks: number(extra.feedbacks),
    chicken_road_admin_profit: chickenProfit,
    chicken_road_admin_loss: chickenLoss,
    aviator_admin_profit: aviatorProfit,
    aviator_admin_loss: aviatorLoss,
    active_player: number(user.active_players),
    today_user: number(user.today_players),
    today_turnover: number(bet.today_turnover),
    today_deposit: number(deposit.today_deposit),
    today_withdrawal: number(withdrawal.today_withdrawal),
    pending_withdrawal: number(withdrawal.pending_withdrawal),
    pending_deposit: number(deposit.pending_deposit),
    illegal_betters: number(extra.illegal_betters),
    demo_users: number(extra.demo_users),

    totalPlayer: number(user.total_players),
    totalTurnover: number(bet.total_turnover),
    totalDeposit: number(deposit.total_deposit),
    totalWithdrawal: number(withdrawal.total_withdrawal),
    otpPackBalance: otpPack,
    otpPack: otpPack,
    totalCommission: number(extra.total_commission),
    totalGames: number(extra.total_games),
    chickenRoadAdminProfit: chickenProfit,
    chickenRoadAdminLoss: chickenLoss,
    aviatorAdminProfit: aviatorProfit,
    aviatorAdminLoss: aviatorLoss,
    activePlayer: number(user.active_players),
    todayUser: number(user.today_players),
    todayTurnover: number(bet.today_turnover),
    todayDeposit: number(deposit.today_deposit),
    todayWithdrawal: number(withdrawal.today_withdrawal),
    pendingWithdrawal: number(withdrawal.pending_withdrawal),
    pendingDeposit: number(deposit.pending_deposit),
    illegalBetters: number(extra.illegal_betters),
    demoUsers: number(extra.demo_users),
  };
}

class AdminService {
  constructor(poolProvider = getPool, clock = () => new Date()) {
    if (typeof poolProvider === "object" && poolProvider !== null && typeof poolProvider.poolProvider === "function") {
      this.poolProvider = poolProvider.poolProvider;
      this.clock = poolProvider.clock ?? clock;
    } else if (typeof poolProvider === "object" && poolProvider !== null && typeof poolProvider.execute === "function") {
      this.poolProvider = () => poolProvider;
      this.clock = clock;
    } else if (typeof poolProvider === "function") {
      this.poolProvider = poolProvider;
      this.clock = clock;
    } else {
      this.poolProvider = () => poolProvider;
      this.clock = clock;
    }
  }

  async getDashboard(period = "7d") {
    const days = DAYS_BY_PERIOD[period];
    if (!days) {
      throw new AppError(400, "INVALID_PERIOD", "The period must be 7d or 30d.");
    }
    const today = localDateString(this.clock());
    const startDate = shiftDate(today, 1 - days);
    const endDate = shiftDate(today, 1);
    const previousStartDate = shiftDate(startDate, -days);
    const previousEndDate = startDate;
    const yesterday = shiftDate(today, -1);
    const todayEndDate = endDate;

    const pool = this.poolProvider();
    const [users, bets, deposits, withdrawals, misc, turnoverRows, depositRows, withdrawalRows, playerRows] =
      await Promise.all([
        pool.execute(
          `SELECT
             (SELECT COUNT(*) FROM users WHERE account_type = 0) AS total_players,
             (SELECT COUNT(*) FROM users WHERE account_type = 0 AND status = 1) AS active_players,
             (SELECT COUNT(*) FROM users WHERE account_type = 0 AND created_at >= ? AND created_at < ?) AS current_players,
             (SELECT COUNT(*) FROM users WHERE account_type = 0 AND created_at >= ? AND created_at < ?) AS previous_players,
             (SELECT COUNT(*) FROM users WHERE account_type = 0 AND status = 1 AND created_at >= ? AND created_at < ?) AS current_active_players,
             (SELECT COUNT(*) FROM users WHERE account_type = 0 AND status = 1 AND created_at >= ? AND created_at < ?) AS previous_active_players,
             (SELECT COUNT(*) FROM users WHERE account_type = 0 AND created_at >= ? AND created_at < ?) AS today_players,
             (SELECT COUNT(*) FROM users WHERE account_type = 0 AND created_at >= ? AND created_at < ?) AS yesterday_players`,
          [
            startDate, endDate, previousStartDate, previousEndDate,
            startDate, endDate, previousStartDate, previousEndDate,
            today, todayEndDate, yesterday, today,
          ],
        ),
        pool.execute(
          `SELECT
             COALESCE(SUM(b.amount), 0) AS total_turnover,
             COALESCE(SUM(CASE WHEN b.created_at >= ? AND b.created_at < ? THEN b.amount ELSE 0 END), 0) AS current_turnover,
             COALESCE(SUM(CASE WHEN b.created_at >= ? AND b.created_at < ? THEN b.amount ELSE 0 END), 0) AS previous_turnover,
             COALESCE(SUM(CASE WHEN b.created_at >= ? AND b.created_at < ? THEN b.amount ELSE 0 END), 0) AS today_turnover,
             COALESCE(SUM(CASE WHEN b.created_at >= ? AND b.created_at < ? THEN b.amount ELSE 0 END), 0) AS yesterday_turnover
           FROM bets b
           INNER JOIN users u ON u.id = b.userid
           WHERE u.account_type = 0`,
          [
            startDate, endDate, previousStartDate, previousEndDate,
            today, todayEndDate, yesterday, today,
          ],
        ),
        pool.execute(
          `SELECT
             COALESCE(SUM(CASE WHEN p.status = 2 THEN p.cash ELSE 0 END), 0) AS total_deposit,
             COALESCE(SUM(CASE WHEN p.status = 2 AND p.created_at >= ? AND p.created_at < ? THEN p.cash ELSE 0 END), 0) AS current_deposit,
             COALESCE(SUM(CASE WHEN p.status = 2 AND p.created_at >= ? AND p.created_at < ? THEN p.cash ELSE 0 END), 0) AS previous_deposit,
             COALESCE(SUM(CASE WHEN p.status = 2 AND p.created_at >= ? AND p.created_at < ? THEN p.cash ELSE 0 END), 0) AS today_deposit,
             COALESCE(SUM(CASE WHEN p.status = 2 AND p.created_at >= ? AND p.created_at < ? THEN p.cash ELSE 0 END), 0) AS yesterday_deposit,
             (SELECT COUNT(*) FROM payins WHERE status = 1) AS pending_deposit,
             SUM(CASE WHEN p.status = 1 AND p.created_at >= ? AND p.created_at < ? THEN 1 ELSE 0 END) AS current_pending_deposit,
             SUM(CASE WHEN p.status = 1 AND p.created_at >= ? AND p.created_at < ? THEN 1 ELSE 0 END) AS previous_pending_deposit
           FROM payins p
           INNER JOIN users u ON u.id = p.user_id
           WHERE u.account_type = 0`,
          [
            startDate, endDate, previousStartDate, previousEndDate,
            today, todayEndDate, yesterday, today,
            startDate, endDate, previousStartDate, previousEndDate,
          ],
        ),
        pool.execute(
          `SELECT
             COALESCE(SUM(CASE WHEN w.status = 2 THEN w.amount ELSE 0 END), 0) AS total_withdrawal,
             COALESCE(SUM(CASE WHEN w.status = 2 AND w.created_at >= ? AND w.created_at < ? THEN w.amount ELSE 0 END), 0) AS current_withdrawal,
             COALESCE(SUM(CASE WHEN w.status = 2 AND w.created_at >= ? AND w.created_at < ? THEN w.amount ELSE 0 END), 0) AS previous_withdrawal,
             COALESCE(SUM(CASE WHEN w.status = 2 AND w.created_at >= ? AND w.created_at < ? THEN w.amount ELSE 0 END), 0) AS today_withdrawal,
             COALESCE(SUM(CASE WHEN w.status = 2 AND w.created_at >= ? AND w.created_at < ? THEN w.amount ELSE 0 END), 0) AS yesterday_withdrawal,
             (SELECT COUNT(*) FROM withdraw_histories WHERE status = 1) AS pending_withdrawal,
             SUM(CASE WHEN w.status = 1 AND w.created_at >= ? AND w.created_at < ? THEN 1 ELSE 0 END) AS current_pending_withdrawal,
             SUM(CASE WHEN w.status = 1 AND w.created_at >= ? AND w.created_at < ? THEN 1 ELSE 0 END) AS previous_pending_withdrawal
           FROM withdraw_histories w
           INNER JOIN users u ON u.id = w.user_id
           WHERE u.account_type = 0`,
          [
            startDate, endDate, previousStartDate, previousEndDate,
            today, todayEndDate, yesterday, today,
            startDate, endDate, previousStartDate, previousEndDate,
          ],
        ),
        pool.execute(
          `SELECT
             (SELECT COUNT(*) FROM feedbacks) AS feedbacks,
             (SELECT COUNT(*) FROM game_settings WHERE status = 0) AS total_games,
             (SELECT COALESCE(SUM(commission), 0) FROM users WHERE account_type = 0) AS total_commission,
             (SELECT COUNT(*) FROM users WHERE account_type = 1) AS demo_users,
             (SELECT COUNT(*) FROM users WHERE illegal_count > 0) AS illegal_betters,
             (SELECT COALESCE(SUM(amount) - SUM(win_amount), 0) FROM chicken_bets) AS chicken_net,
             (SELECT COALESCE(SUM(amount) - SUM(win), 0) FROM aviator_bet) AS aviator_net,
             (SELECT opt_pack FROM otp_sms LIMIT 1) AS otp_pack,
             (SELECT COUNT(*) FROM feedbacks WHERE created_at >= ? AND created_at < ?) AS current_feedbacks,
             (SELECT COUNT(*) FROM feedbacks WHERE created_at >= ? AND created_at < ?) AS previous_feedbacks,
             (SELECT COALESCE(SUM(commission), 0) FROM users WHERE account_type = 0 AND created_at >= ? AND created_at < ?) AS current_commission,
             (SELECT COALESCE(SUM(commission), 0) FROM users WHERE account_type = 0 AND created_at >= ? AND created_at < ?) AS previous_commission,
             (SELECT COUNT(*) FROM users WHERE account_type = 1 AND created_at >= ? AND created_at < ?) AS current_demo_users,
             (SELECT COUNT(*) FROM users WHERE account_type = 1 AND created_at >= ? AND created_at < ?) AS previous_demo_users,
             (SELECT COUNT(*) FROM users WHERE illegal_count > 0 AND created_at >= ? AND created_at < ?) AS current_illegal_betters,
             (SELECT COUNT(*) FROM users WHERE illegal_count > 0 AND created_at >= ? AND created_at < ?) AS previous_illegal_betters,
             (SELECT COALESCE(SUM(amount) - SUM(win_amount), 0) FROM chicken_bets WHERE created_at >= ? AND created_at < ?) AS current_chicken_net,
             (SELECT COALESCE(SUM(amount) - SUM(win_amount), 0) FROM chicken_bets WHERE created_at >= ? AND created_at < ?) AS previous_chicken_net,
             (SELECT COALESCE(SUM(amount) - SUM(win), 0) FROM aviator_bet WHERE created_at >= ? AND created_at < ?) AS current_aviator_net,
             (SELECT COALESCE(SUM(amount) - SUM(win), 0) FROM aviator_bet WHERE created_at >= ? AND created_at < ?) AS previous_aviator_net`,
          [
            startDate, endDate, previousStartDate, previousEndDate,
            startDate, endDate, previousStartDate, previousEndDate,
            startDate, endDate, previousStartDate, previousEndDate,
            startDate, endDate, previousStartDate, previousEndDate,
            startDate, endDate, previousStartDate, previousEndDate,
            startDate, endDate, previousStartDate, previousEndDate,
          ],
        ),
        pool.execute(
          `SELECT DATE(b.created_at) AS day, COALESCE(SUM(b.amount), 0) AS value
           FROM bets b INNER JOIN users u ON u.id = b.userid
           WHERE u.account_type = 0 AND b.created_at >= ? AND b.created_at < ?
           GROUP BY DATE(b.created_at) ORDER BY day`,
          [startDate, endDate],
        ),
        pool.execute(
          `SELECT DATE(p.created_at) AS day, COALESCE(SUM(p.cash), 0) AS value
           FROM payins p INNER JOIN users u ON u.id = p.user_id
           WHERE u.account_type = 0 AND p.status = 2 AND p.created_at >= ? AND p.created_at < ?
           GROUP BY DATE(p.created_at) ORDER BY day`,
          [startDate, endDate],
        ),
        pool.execute(
          `SELECT DATE(w.created_at) AS day, COALESCE(SUM(w.amount), 0) AS value
           FROM withdraw_histories w INNER JOIN users u ON u.id = w.user_id
           WHERE u.account_type = 0 AND w.status = 2 AND w.created_at >= ? AND w.created_at < ?
           GROUP BY DATE(w.created_at) ORDER BY day`,
          [startDate, endDate],
        ),
        pool.execute(
          `SELECT DATE(created_at) AS day, COUNT(*) AS value
           FROM users WHERE account_type = 0 AND created_at >= ? AND created_at < ?
           GROUP BY DATE(created_at) ORDER BY day`,
          [startDate, endDate],
        ),
      ]);

    const user = users[0][0] ?? {};
    const bet = bets[0][0] ?? {};
    const deposit = deposits[0][0] ?? {};
    const withdrawal = withdrawals[0][0] ?? {};
    const extra = misc[0][0] ?? {};
    const chickenNet = number(extra.chicken_net);
    const aviatorNet = number(extra.aviator_net);
    const chickenNow = number(extra.current_chicken_net);
    const chickenThen = number(extra.previous_chicken_net);
    const aviatorNow = number(extra.current_aviator_net);
    const aviatorThen = number(extra.previous_aviator_net);
    const counts = buildCounts({ user, bet, deposit, withdrawal, extra });
    const metrics = {
      totalRevenue: metric(deposit.total_deposit, deposit.current_deposit, deposit.previous_deposit),
      totalPlayer: metric(user.total_players, user.current_players, user.previous_players),
      activePlayer: metric(user.active_players, user.current_active_players, user.previous_active_players),
      todayUser: metric(user.today_players, user.today_players, user.yesterday_players),
      todayTurnover: metric(bet.today_turnover, bet.today_turnover, bet.yesterday_turnover),
      totalTurnover: metric(bet.total_turnover, bet.current_turnover, bet.previous_turnover),
      totalDeposit: metric(deposit.total_deposit, deposit.current_deposit, deposit.previous_deposit),
      todayDeposit: metric(deposit.today_deposit, deposit.today_deposit, deposit.yesterday_deposit),
      totalWithdrawal: metric(withdrawal.total_withdrawal, withdrawal.current_withdrawal, withdrawal.previous_withdrawal),
      todayWithdrawal: metric(withdrawal.today_withdrawal, withdrawal.today_withdrawal, withdrawal.yesterday_withdrawal),
      feedbacks: metric(extra.feedbacks, extra.current_feedbacks, extra.previous_feedbacks),
      totalGames: metric(extra.total_games, 0, 0),
      totalCommission: metric(extra.total_commission, extra.current_commission, extra.previous_commission),
      demoUsers: metric(extra.demo_users, extra.current_demo_users, extra.previous_demo_users),
      illegalBetters: metric(extra.illegal_betters, extra.current_illegal_betters, extra.previous_illegal_betters),
      pendingDeposit: metric(deposit.pending_deposit, deposit.current_pending_deposit, deposit.previous_pending_deposit),
      pendingWithdrawal: metric(withdrawal.pending_withdrawal, withdrawal.current_pending_withdrawal, withdrawal.previous_pending_withdrawal),
      chickenRoadAdminProfit: metric(Math.max(chickenNet, 0), Math.max(chickenNow, 0), Math.max(chickenThen, 0)),
      chickenRoadAdminLoss: metric(Math.abs(Math.min(chickenNet, 0)), Math.abs(Math.min(chickenNow, 0)), Math.abs(Math.min(chickenThen, 0))),
      aviatorAdminProfit: metric(Math.max(aviatorNet, 0), Math.max(aviatorNow, 0), Math.max(aviatorThen, 0)),
      aviatorAdminLoss: metric(Math.abs(Math.min(aviatorNet, 0)), Math.abs(Math.min(aviatorNow, 0)), Math.abs(Math.min(aviatorThen, 0))),
      otpPack: metric(extra.otp_pack, 0, 0),
      otpPackBalance: metric(extra.otp_pack, 0, 0),
    };

    return {
      period: { key: period, days, startDate, endDate: today },
      counts,
      ...counts,
      metrics,
      charts: {
        turnoverOverview: dateSeries(startDate, days, turnoverRows[0]),
        depositVsWithdrawal: {
          deposits: dateSeries(startDate, days, depositRows[0]),
          withdrawals: dateSeries(startDate, days, withdrawalRows[0]),
        },
        playerGrowth: dateSeries(startDate, days, playerRows[0]),
      },
    };
  }

  async getDashboardCounts() {
    const today = localDateString(this.clock());
    const endDate = shiftDate(today, 1);
    const yesterday = shiftDate(today, -1);
    const todayEndDate = endDate;

    const pool = this.poolProvider();
    const [users, bets, deposits, withdrawals, misc] = await Promise.all([
      pool.execute(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE account_type = 0) AS total_players,
           (SELECT COUNT(*) FROM users WHERE account_type = 0 AND status = 1) AS active_players,
           (SELECT COUNT(*) FROM users WHERE account_type = 0 AND created_at >= ? AND created_at < ?) AS today_players,
           (SELECT COUNT(*) FROM users WHERE account_type = 0 AND created_at >= ? AND created_at < ?) AS yesterday_players`,
        [today, todayEndDate, yesterday, today],
      ),
      pool.execute(
        `SELECT
           COALESCE(SUM(b.amount), 0) AS total_turnover,
           COALESCE(SUM(CASE WHEN b.created_at >= ? AND b.created_at < ? THEN b.amount ELSE 0 END), 0) AS today_turnover,
           COALESCE(SUM(CASE WHEN b.created_at >= ? AND b.created_at < ? THEN b.amount ELSE 0 END), 0) AS yesterday_turnover
         FROM bets b
         INNER JOIN users u ON u.id = b.userid
         WHERE u.account_type = 0`,
        [today, todayEndDate, yesterday, today],
      ),
      pool.execute(
        `SELECT
           COALESCE(SUM(CASE WHEN p.status = 2 THEN p.cash ELSE 0 END), 0) AS total_deposit,
           COALESCE(SUM(CASE WHEN p.status = 2 AND p.created_at >= ? AND p.created_at < ? THEN p.cash ELSE 0 END), 0) AS today_deposit,
           COALESCE(SUM(CASE WHEN p.status = 2 AND p.created_at >= ? AND p.created_at < ? THEN p.cash ELSE 0 END), 0) AS yesterday_deposit,
           (SELECT COUNT(*) FROM payins WHERE status = 1) AS pending_deposit
         FROM payins p
         INNER JOIN users u ON u.id = p.user_id
         WHERE u.account_type = 0`,
        [today, todayEndDate, yesterday, today],
      ),
      pool.execute(
        `SELECT
           COALESCE(SUM(CASE WHEN w.status = 2 THEN w.amount ELSE 0 END), 0) AS total_withdrawal,
           COALESCE(SUM(CASE WHEN w.status = 2 AND w.created_at >= ? AND w.created_at < ? THEN w.amount ELSE 0 END), 0) AS today_withdrawal,
           COALESCE(SUM(CASE WHEN w.status = 2 AND w.created_at >= ? AND w.created_at < ? THEN w.amount ELSE 0 END), 0) AS yesterday_withdrawal,
           (SELECT COUNT(*) FROM withdraw_histories WHERE status = 1) AS pending_withdrawal
         FROM withdraw_histories w
         INNER JOIN users u ON u.id = w.user_id
         WHERE u.account_type = 0`,
        [today, todayEndDate, yesterday, today],
      ),
      pool.execute(
        `SELECT
           (SELECT COUNT(*) FROM feedbacks) AS feedbacks,
           (SELECT COUNT(*) FROM game_settings WHERE status = 0) AS total_games,
           (SELECT COALESCE(SUM(commission), 0) FROM users WHERE account_type = 0) AS total_commission,
           (SELECT COUNT(*) FROM users WHERE account_type = 1) AS demo_users,
           (SELECT COUNT(*) FROM users WHERE illegal_count > 0) AS illegal_betters,
           (SELECT COALESCE(SUM(amount) - SUM(win_amount), 0) FROM chicken_bets) AS chicken_net,
           (SELECT COALESCE(SUM(amount) - SUM(win), 0) FROM aviator_bet) AS aviator_net,
           (SELECT opt_pack FROM otp_sms LIMIT 1) AS otp_pack`,
      ),
    ]);

    const user = users[0][0] ?? {};
    const bet = bets[0][0] ?? {};
    const deposit = deposits[0][0] ?? {};
    const withdrawal = withdrawals[0][0] ?? {};
    const extra = misc[0][0] ?? {};

    return buildCounts({ user, bet, deposit, withdrawal, extra });
  }

  async getPlayers(query = {}) {
    if (query.id || query.player_id) {
      const targetId = Number(query.id || query.player_id);
      return this.getPlayerById(targetId);
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const pool = this.poolProvider();

    // 1. Overall Summary
    const [summaryRows] = await pool.execute(
      `SELECT
         COALESCE(SUM(wallet), 0) AS total_player_holdings,
         COALESCE(SUM(winning_wallet), 0) AS winning_liability,
         COUNT(*) AS total_players,
         COUNT(CASE WHEN status = 1 THEN 1 END) AS active_players,
         COUNT(CASE WHEN status = 0 THEN 1 END) AS suspended_players,
         COUNT(CASE WHEN illegal_count > 0 THEN 1 END) AS illegal_betters
       FROM users
       WHERE account_type = 0`,
    );

    const [highRollerRows] = await pool.execute(
      `SELECT COUNT(*) AS vip_high_rollers
       FROM users u
       WHERE u.account_type = 0
         AND (
           u.wallet >= 10000
           OR u.turnover >= 30000
           OR (SELECT COALESCE(SUM(b.amount), 0) FROM bets b WHERE b.userid = u.id) >= 30000
           OR (SELECT COALESCE(SUM(p.cash), 0) FROM payins p WHERE p.user_id = u.id AND p.status = 2) >= 10000
         )`,
    );

    const sum = summaryRows[0] ?? {};
    const hr = highRollerRows[0] ?? {};

    const summary = {
      total_player_holdings: number(sum.total_player_holdings),
      totalPlayerHoldings: number(sum.total_player_holdings),
      winning_liability: number(sum.winning_liability),
      winningLiability: number(sum.winning_liability),
      vip_high_rollers: number(hr.vip_high_rollers),
      vipHighRollers: number(hr.vip_high_rollers),
      total_players: number(sum.total_players),
      totalPlayers: number(sum.total_players),
      active_players: number(sum.active_players),
      activePlayers: number(sum.active_players),
      suspended_players: number(sum.suspended_players),
      suspendedPlayers: number(sum.suspended_players),
      illegal_betters: number(sum.illegal_betters),
      illegalBetters: number(sum.illegal_betters),
      illegal_users: number(sum.illegal_betters),
      illegalUsers: number(sum.illegal_betters),
      illegal_count: number(sum.illegal_betters),
      illegalCount: number(sum.illegal_betters),
    };

    // 2. Directory filter
    const conditions = ["u.account_type = 0"];
    const params = [];

    if (query.status !== undefined && query.status !== "all" && query.status !== "" && query.status !== "illegal") {
      conditions.push("u.status = ?");
      params.push(Number(query.status));
    }

    if (
      query.is_illegal === "true" || query.is_illegal === "1" || query.is_illegal === true ||
      query.illegal === "true" || query.illegal === "1" || query.illegal === true ||
      query.status === "illegal"
    ) {
      conditions.push("u.illegal_count > 0");
    } else if (
      query.is_illegal === "false" || query.is_illegal === "0" ||
      query.illegal === "false" || query.illegal === "0"
    ) {
      conditions.push("u.illegal_count = 0");
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(u.username LIKE ? OR u.mobile LIKE ? OR u.email LIKE ? OR u.u_id LIKE ?)");
      params.push(s, s, s, s);
    }

    if (query.is_high_roller === "true" || query.is_high_roller === "1" || query.is_high_roller === true) {
      conditions.push(`(
        u.wallet >= 10000
        OR u.turnover >= 30000
        OR (SELECT COALESCE(SUM(b.amount), 0) FROM bets b WHERE b.userid = u.id) >= 30000
        OR (SELECT COALESCE(SUM(p.cash), 0) FROM payins p WHERE p.user_id = u.id AND p.status = 2) >= 10000
      )`);
    }

    const whereClause = conditions.join(" AND ");

    // Count total filtered records
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users u WHERE ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch players page
    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.username,
         u.u_id,
         u.mobile,
         u.email,
         u.country_code,
         u.userimage,
         u.verification,
         u.wallet,
         u.winning_wallet,
         u.turnover,
         u.today_turnover,
         u.status,
         u.referral_code,
         u.referral_user_id,
         u.account_type,
         u.illegal_count,
         u.created_at,
         s.username AS sponsor_username,
         s.referral_code AS sponsor_referral_code,
         s.mobile AS sponsor_mobile,
         COALESCE((SELECT SUM(b.amount) FROM bets b WHERE b.userid = u.id), 0) AS bets_turnover,
         COALESCE((SELECT SUM(p.cash) FROM payins p WHERE p.user_id = u.id AND p.status = 2), 0) AS total_deposit
       FROM users u
       LEFT JOIN users s ON s.id = u.referral_user_id
       WHERE ${whereClause}
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      listParams,
    );

    const players = rows.map(formatPlayer);

    return {
      summary,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      player_directory: players,
      players,
    };
  }

  async getPlayerById(id) {
    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.username,
         u.u_id,
         u.mobile,
         u.email,
         u.country_code,
         u.userimage,
         u.verification,
         u.wallet,
         u.winning_wallet,
         u.turnover,
         u.today_turnover,
         u.status,
         u.referral_code,
         u.referral_user_id,
         u.account_type,
         u.illegal_count,
         u.created_at,
         s.username AS sponsor_username,
         s.referral_code AS sponsor_referral_code,
         s.mobile AS sponsor_mobile,
         COALESCE((SELECT SUM(b.amount) FROM bets b WHERE b.userid = u.id), 0) AS bets_turnover,
         COALESCE((SELECT SUM(p.cash) FROM payins p WHERE p.user_id = u.id AND p.status = 2), 0) AS total_deposit
       FROM users u
       LEFT JOIN users s ON s.id = u.referral_user_id
       WHERE u.id = ? AND u.account_type = 0
       LIMIT 1`,
      [Number(id)],
    );

    if (rows.length === 0) {
      throw new AppError(404, "PLAYER_NOT_FOUND", "Player not found");
    }

    return formatPlayer(rows[0]);
  }

  async setPlayerStatus(id, newStatus) {
    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError(400, "INVALID_PLAYER_ID", "Invalid player ID");
    }
    if (targetId === 1) {
      throw new AppError(403, "FORBIDDEN", "Cannot modify super administrator status");
    }

    const statusValue = Number(newStatus) === 1 ? 1 : 0;
    const pool = this.poolProvider();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [users] = await connection.execute(
        "SELECT id, username, status FROM users WHERE id = ? LIMIT 1 FOR UPDATE",
        [targetId],
      );
      if (users.length === 0) {
        throw new AppError(404, "PLAYER_NOT_FOUND", "Player not found");
      }

      await connection.execute(
        "UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [statusValue, targetId],
      );

      // If suspending player (status = 0), immediately revoke active tokens
      if (statusValue === 0) {
        await connection.execute(
          "DELETE FROM personal_access_tokens WHERE tokenable_id = ?",
          [targetId],
        );
        await connection.execute(
          "UPDATE users SET login_token = NULL WHERE id = ?",
          [targetId],
        );
      }

      await connection.commit();

      return {
        id: targetId,
        username: users[0].username,
        status: statusValue,
        status_label: statusValue === 1 ? "Active" : "Suspended",
        message: statusValue === 1 ? "Player unsuspended successfully" : "Player suspended successfully",
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async addPlayer(data = {}) {
    const {
      email,
      country_code = "91",
      wallet = 0,
      referral_code,
      kyc_status,
      verification,
    } = data;

    let mobile = data.mobile;
    let password = data.password;
    let username = data.username;

    if (!mobile || String(mobile).trim() === "") {
      const randomDigits = `${Math.floor(100000000 + Math.random() * 900000000)}`;
      mobile = `9${randomDigits.slice(1)}`;
    }
    if (!password || String(password).trim() === "") {
      password = `Pass${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (String(password).trim().length < 6) {
      throw new AppError(400, "VALIDATION_ERROR", "Password must be at least 6 characters.");
    }

    const normalizedMobile = String(mobile).trim();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const initialWallet = Math.max(0, number(wallet));
    const kycVerification = verification !== undefined
      ? Number(verification)
      : (kyc_status === 2 || kyc_status === "Verified" ? 2 : 0);

    const pool = this.poolProvider();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [existing] = await connection.execute(
        `SELECT id FROM users
         WHERE mobile = ? OR (email = ? AND ? IS NOT NULL)
         LIMIT 1 FOR UPDATE`,
        [normalizedMobile, normalizedEmail, normalizedEmail],
      );
      if (existing.length > 0) {
        throw new AppError(409, "DUPLICATE_USER", "This mobile number or email is already registered.");
      }

      let referralUserId = 1;
      if (referral_code) {
        const [referrers] = await connection.execute(
          "SELECT id FROM users WHERE referral_code = ? LIMIT 1",
          [referral_code],
        );
        if (referrers.length === 0) {
          throw new AppError(400, "INVALID_REFERRAL_CODE", "Invalid sponsor referral code.");
        }
        referralUserId = referrers[0].id;
      }

      const userIdCode = await findAvailableUserId(connection);
      const playerUsername = username && String(username).trim() !== ""
        ? String(username).trim()
        : `User_${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5)}`;
      const newReferralCode = await findAvailableReferralCode(connection);
      const userImage = new URL("/image/download.png", config.appUrl).toString();
      const passwordHash = await bcrypt.hash(password, 10);

      const [insertResult] = await connection.execute(
        `INSERT INTO users
          (username, u_id, mobile, email, password, userimage, status, referral_code,
           wallet, winning_wallet, turnover, today_turnover, country_code, verification,
           referral_user_id, account_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 0, 0, 0, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          playerUsername,
          userIdCode,
          normalizedMobile,
          normalizedEmail,
          passwordHash,
          userImage,
          newReferralCode,
          initialWallet,
          country_code,
          kycVerification,
          referralUserId,
        ],
      );

      const createdId = insertResult.insertId;
      await connection.commit();

      return {
        id: createdId,
        username: playerUsername,
        u_id: userIdCode,
        mobile: normalizedMobile,
        email: normalizedEmail,
        country_code,
        wallet: initialWallet,
        winning_wallet: 0,
        referral_code: newReferralCode,
        sponsor_id: referralUserId,
        verification: kycVerification,
        kyc_status: formatKycStatus(kycVerification),
        status: 1,
        status_label: "Active",
        plain_password: password,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async quickAddPlayer(data = {}) {
    return this.addPlayer(data);
  }

  async getAttendance(query = {}) {
    const pool = this.poolProvider();
    await ensureAttendanceTable(pool);

    if (query.id || query.attendance_id) {
      const targetId = Number(query.id || query.attendance_id);
      return this.getAttendanceById(targetId);
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = ["1 = 1"];
    const params = [];

    if (query.status !== undefined && query.status !== "all" && query.status !== "") {
      conditions.push("status = ?");
      params.push(Number(query.status));
    }

    if (query.date && String(query.date).trim() !== "") {
      conditions.push("date LIKE ?");
      params.push(`%${String(query.date).trim()}%`);
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(date LIKE ? OR accumulated_amount LIKE ? OR attendance_bonus LIKE ?)");
      params.push(s, s, s);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM attendances WHERE ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT id, accumulated_amount, attendance_bonus, date, status, created_at, updated_at
       FROM attendances
       WHERE ${whereClause}
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map(formatAttendance);

    return {
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      list,
      attendance: list,
    };
  }

  async getAttendanceById(id) {
    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError(400, "INVALID_ATTENDANCE_ID", "Invalid attendance ID");
    }

    const pool = this.poolProvider();
    await ensureAttendanceTable(pool);

    const [rows] = await pool.execute(
      `SELECT id, accumulated_amount, attendance_bonus, date, status, created_at, updated_at
       FROM attendances
       WHERE id = ?
       LIMIT 1`,
      [targetId],
    );

    if (rows.length === 0) {
      throw new AppError(404, "ATTENDANCE_NOT_FOUND", "Attendance record not found");
    }

    return formatAttendance(rows[0]);
  }

  async saveAttendance(data = {}) {
    const targetId = data.id !== undefined && data.id !== null && data.id !== ""
      ? Number(data.id)
      : (data.paramsId !== undefined ? Number(data.paramsId) : null);

    const pool = this.poolProvider();
    await ensureAttendanceTable(pool);

    // 1. UPDATE / EDIT
    if (targetId) {
      if (!Number.isInteger(targetId) || targetId <= 0) {
        throw new AppError(400, "INVALID_ATTENDANCE_ID", "Invalid attendance ID");
      }

      const [existing] = await pool.execute(
        "SELECT id, accumulated_amount, attendance_bonus, date, status, created_at, updated_at FROM attendances WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existing.length === 0) {
        throw new AppError(404, "ATTENDANCE_NOT_FOUND", "Attendance record not found");
      }

      const current = existing[0];
      const newAccumulated = data.accumulated_amount !== undefined
        ? number(data.accumulated_amount)
        : current.accumulated_amount;
      const newBonus = data.attendance_bonus !== undefined
        ? number(data.attendance_bonus)
        : current.attendance_bonus;
      const newDate = data.date !== undefined
        ? String(data.date).trim()
        : current.date;
      let newStatus = current.status;
      if (data.status !== undefined) {
        newStatus = Number(data.status) === 1 ? 1 : 0;
      } else if (data.action === "disable" || data.action === "suspend" || data.action === "deactivate") {
        newStatus = 0;
      } else if (data.action === "enable" || data.action === "unsuspend" || data.action === "activate") {
        newStatus = 1;
      }

      await pool.execute(
        `UPDATE attendances
         SET accumulated_amount = ?,
             attendance_bonus = ?,
             date = ?,
             status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newAccumulated, newBonus, newDate, newStatus, targetId],
      );

      const [updatedRows] = await pool.execute(
        "SELECT id, accumulated_amount, attendance_bonus, date, status, created_at, updated_at FROM attendances WHERE id = ? LIMIT 1",
        [targetId],
      );

      return {
        message: "Attendance updated successfully",
        data: formatAttendance(updatedRows[0]),
      };
    }

    // 2. CREATE
    const accumulated = number(data.accumulated_amount ?? 0);
    const bonus = number(data.attendance_bonus ?? 0);
    const dateVal = data.date !== undefined && String(data.date).trim() !== ""
      ? String(data.date).trim()
      : localDateString(new Date());
    const statusVal = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : 1;

    const [insertResult] = await pool.execute(
      `INSERT INTO attendances
        (accumulated_amount, attendance_bonus, date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [accumulated, bonus, dateVal, statusVal],
    );

    const newId = insertResult.insertId;
    const [newRows] = await pool.execute(
      "SELECT id, accumulated_amount, attendance_bonus, date, status, created_at, updated_at FROM attendances WHERE id = ? LIMIT 1",
      [newId],
    );

    return {
      message: "Attendance created successfully",
      data: formatAttendance(newRows[0]),
    };
  }

  async transferFund(data = {}, adminId = 1) {
    const rawUserId = data.user_id ?? data.userId ?? data.id;
    if (!rawUserId) {
      throw new AppError(400, "VALIDATION_ERROR", "The user_id field is required.");
    }

    const transferAmount = number(data.amount);
    if (!transferAmount || transferAmount <= 0) {
      throw new AppError(400, "VALIDATION_ERROR", "The amount must be greater than zero.");
    }

    const pool = this.poolProvider();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Find user by id, u_id, mobile, or username
      const [users] = await connection.execute(
        `SELECT id, username, u_id, mobile, wallet
         FROM users
         WHERE id = ? OR u_id = ? OR mobile = ? OR username = ?
         LIMIT 1 FOR UPDATE`,
        [rawUserId, String(rawUserId), String(rawUserId), String(rawUserId)],
      );

      if (users.length === 0) {
        throw new AppError(404, "USER_NOT_FOUND", "Player user not found.");
      }

      const targetUser = users[0];
      const previousBalance = number(targetUser.wallet);
      const currentBalance = previousBalance + transferAmount;

      // Determine subtype from fundtransfer_subtype
      const rawType = data.type ? String(data.type).trim() : "FUND TRANSFER";
      let typeId = 0;
      let typeName = rawType.toUpperCase();

      try {
        const [subtypes] = await connection.execute(
          `SELECT id, name FROM fundtransfer_subtype
           WHERE id = ? OR name = ? OR name LIKE ?
           ORDER BY id ASC
           LIMIT 1`,
          [parseInt(rawType, 10) || 0, rawType, `%${rawType.replace(/\s+/g, "%")}%`],
        );
        if (subtypes.length > 0) {
          typeId = subtypes[0].id;
          typeName = subtypes[0].name;
        } else {
          typeId = parseInt(rawType, 10) || 1;
        }
      } catch {
        typeId = parseInt(rawType, 10) || 1;
      }

      const remark = data.remark !== undefined ? String(data.remark).trim() : "";
      const description = data.description !== undefined && String(data.description).trim() !== ""
        ? String(data.description).trim()
        : typeName;

      // Update user wallet
      await connection.execute(
        "UPDATE users SET wallet = wallet + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [transferAmount, targetUser.id],
      );

      // Record in fund_user_details (user_id stored as u_id or numeric id)
      const storedUserId = targetUser.u_id || String(targetUser.id);
      const [insertResult] = await connection.execute(
        `INSERT INTO fund_user_details
          (user_id, amount, remark, type, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [storedUserId, transferAmount, remark, typeId, description],
      );

      await connection.commit();

      return {
        id: insertResult.insertId,
        user_id: targetUser.id,
        u_id: targetUser.u_id,
        stored_user_id: storedUserId,
        username: targetUser.username,
        mobile: targetUser.mobile,
        amount: transferAmount,
        type: typeId,
        type_name: typeName,
        remark,
        description,
        previous_balance: previousBalance,
        current_balance: currentBalance,
        date: localDateString(new Date()),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getFundTransferHistory(query = {}) {
    const pool = this.poolProvider();

    if (query.id || query.transfer_id) {
      const targetId = Number(query.id || query.transfer_id);
      return this.getFundTransferById(targetId);
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = ["1 = 1"];
    const params = [];

    if (query.user_id) {
      conditions.push("(f.user_id = ? OR u.u_id = ? OR u.id = ?)");
      params.push(String(query.user_id), String(query.user_id), Number(query.user_id) || 0);
    }

    if (query.type && query.type !== "all") {
      conditions.push("(f.type = ? OR s.name LIKE ? OR f.description LIKE ?)");
      params.push(Number(query.type) || 0, `%${String(query.type).trim()}%`, `%${String(query.type).trim()}%`);
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(u.username LIKE ? OR u.u_id LIKE ? OR u.mobile LIKE ? OR f.user_id LIKE ? OR f.remark LIKE ? OR f.description LIKE ? OR s.name LIKE ?)");
      params.push(s, s, s, s, s, s, s);
    }

    const whereClause = conditions.join(" AND ");

    // Fetch subtypes list
    let subtypes = [];
    try {
      const [subtypeRows] = await pool.execute(
        "SELECT id, name, status, description FROM fundtransfer_subtype ORDER BY id ASC",
      );
      subtypes = subtypeRows;
    } catch {
      subtypes = [];
    }

    // Count and totals
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(f.amount), 0) AS total_transfer_amount
       FROM fund_user_details f
       LEFT JOIN users u ON (u.id = f.user_id OR u.u_id = f.user_id)
       LEFT JOIN fundtransfer_subtype s ON s.id = f.type
       WHERE ${whereClause}`,
      params,
    );

    const total = number(summaryRows[0]?.total);
    const totalTransferAmount = number(summaryRows[0]?.total_transfer_amount);
    const totalPages = Math.ceil(total / limit) || 1;

    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT
         f.id,
         f.user_id,
         f.amount,
         f.remark,
         f.type,
         f.description,
         f.created_at,
         f.updated_at,
         s.name AS subtype_name,
         u.username,
         u.u_id,
         u.mobile
       FROM fund_user_details f
       LEFT JOIN users u ON (u.id = f.user_id OR u.u_id = f.user_id)
       LEFT JOIN fundtransfer_subtype s ON s.id = f.type
       WHERE ${whereClause}
       ORDER BY f.id DESC
       LIMIT ? OFFSET ?`,
      listParams,
    );

    const history = rows.map((row) => {
      const typeDisplay = row.subtype_name || row.description || "FUND TRANSFER";
      const rawDate = row.created_at
        ? (row.created_at instanceof Date ? row.created_at.toISOString().slice(0, 19).replace("T", " ") : String(row.created_at))
        : null;

      return {
        "#": Number(row.id),
        id: Number(row.id),
        user_id: row.user_id,
        u_id: row.u_id ?? row.user_id,
        username: row.username ?? null,
        mobile: row.mobile ?? null,
        amount: number(row.amount),
        type: row.type,
        type_name: typeDisplay,
        remark: row.remark ?? "",
        description: row.description ?? typeDisplay,
        date: rawDate,
        created_at: row.created_at,
      };
    });

    return {
      summary: {
        total_transfer_amount: totalTransferAmount,
        total_transactions: total,
      },
      subtypes,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      history,
      list: history,
    };
  }

  async getFundTransferById(id) {
    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError(400, "INVALID_TRANSFER_ID", "Invalid fund transfer ID");
    }

    const pool = this.poolProvider();
    const [rows] = await pool.execute(
      `SELECT
         f.id,
         f.user_id,
         f.amount,
         f.remark,
         f.type,
         f.description,
         f.created_at,
         f.updated_at,
         s.name AS subtype_name,
         u.username,
         u.u_id,
         u.mobile
       FROM fund_user_details f
       LEFT JOIN users u ON (u.id = f.user_id OR u.u_id = f.user_id)
       LEFT JOIN fundtransfer_subtype s ON s.id = f.type
       WHERE f.id = ?
       LIMIT 1`,
      [targetId],
    );

    if (rows.length === 0) {
      throw new AppError(404, "TRANSFER_NOT_FOUND", "Fund transfer record not found");
    }

    const row = rows[0];
    const typeDisplay = row.subtype_name || row.description || "FUND TRANSFER";
    const rawDate = row.created_at
      ? (row.created_at instanceof Date ? row.created_at.toISOString().slice(0, 19).replace("T", " ") : String(row.created_at))
      : null;

    return {
      "#": Number(row.id),
      id: Number(row.id),
      user_id: row.user_id,
      u_id: row.u_id ?? row.user_id,
      username: row.username ?? null,
      mobile: row.mobile ?? null,
      amount: number(row.amount),
      type: row.type,
      type_name: typeDisplay,
      remark: row.remark ?? "",
      description: row.description ?? typeDisplay,
      date: rawDate,
      created_at: row.created_at,
    };
  }

  async getVipLevels(query = {}) {
    const pool = this.poolProvider();
    await ensureVipLevelsTable(pool);

    if (query.id || query.vip_id) {
      const targetId = Number(query.id || query.vip_id);
      return this.getVipLevelById(targetId);
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = ["1 = 1"];
    const params = [];

    if (query.status !== undefined && query.status !== "all" && query.status !== "") {
      conditions.push("status = ?");
      params.push(Number(query.status));
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(name LIKE ? OR betting_range LIKE ? OR deposit_range LIKE ?)");
      params.push(s, s, s);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM vip_levels WHERE ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT id, name, betting_range, deposit_range, level_up_rewards, monthly_rewards,
              rebate_rate, safe_income, days_count, status, created_at, updated_at
       FROM vip_levels
       WHERE ${whereClause}
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map(formatVipLevel);

    return {
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      history: list,
      list,
      vip_levels: list,
    };
  }

  async getVipLevelById(id) {
    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError(400, "INVALID_VIP_ID", "Invalid VIP level ID");
    }

    const pool = this.poolProvider();
    await ensureVipLevelsTable(pool);

    const [rows] = await pool.execute(
      `SELECT id, name, betting_range, deposit_range, level_up_rewards, monthly_rewards,
              rebate_rate, safe_income, days_count, status, created_at, updated_at
       FROM vip_levels
       WHERE id = ?
       LIMIT 1`,
      [targetId],
    );

    if (rows.length === 0) {
      throw new AppError(404, "VIP_NOT_FOUND", "VIP level not found");
    }

    return formatVipLevel(rows[0]);
  }

  async saveVipLevel(data = {}) {
    const targetId = data.id !== undefined && data.id !== null && data.id !== ""
      ? Number(data.id)
      : (data.paramsId !== undefined ? Number(data.paramsId) : null);

    const pool = this.poolProvider();
    await ensureVipLevelsTable(pool);

    // 1. UPDATE / EDIT
    if (targetId) {
      if (!Number.isInteger(targetId) || targetId <= 0) {
        throw new AppError(400, "INVALID_VIP_ID", "Invalid VIP level ID");
      }

      const [existing] = await pool.execute(
        "SELECT * FROM vip_levels WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existing.length === 0) {
        throw new AppError(404, "VIP_NOT_FOUND", "VIP level not found");
      }

      const current = existing[0];
      const newName = data.name !== undefined ? String(data.name).trim() : current.name;
      const bettingInput = data.betting_range !== undefined ? data.betting_range : data.bettingRange;
      const newBetting = bettingInput !== undefined ? String(bettingInput).trim() : current.betting_range;

      const depositInput = data.deposit_range !== undefined ? data.deposit_range : data.depositRange;
      const newDeposit = depositInput !== undefined
        ? String(depositInput).trim()
        : (bettingInput !== undefined ? String(bettingInput).trim() : current.deposit_range);

      const levelUpInput = data.level_up_rewards !== undefined ? data.level_up_rewards : data.levelUpRewards;
      const newLevelUp = levelUpInput !== undefined ? number(levelUpInput) : current.level_up_rewards;

      const monthlyInput = data.monthly_rewards !== undefined ? data.monthly_rewards : data.monthlyRewards;
      const newMonthly = monthlyInput !== undefined ? number(monthlyInput) : current.monthly_rewards;

      const rebateInput = data.rebate_rate !== undefined ? data.rebate_rate : data.rebateRate;
      const newRebate = rebateInput !== undefined ? number(rebateInput) : current.rebate_rate;

      const safeInput = data.safe_income !== undefined ? data.safe_income : data.safeIncome;
      const newSafe = safeInput !== undefined ? number(safeInput) : current.safe_income;

      const daysInput = data.days_count !== undefined ? data.days_count : data.daysCount;
      const newDays = daysInput !== undefined ? number(daysInput) : current.days_count;

      const newStatus = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : current.status;

      await pool.execute(
        `UPDATE vip_levels
         SET name = ?,
             betting_range = ?,
             deposit_range = ?,
             level_up_rewards = ?,
             monthly_rewards = ?,
             rebate_rate = ?,
             safe_income = ?,
             days_count = ?,
             status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newName, newBetting, newDeposit, newLevelUp, newMonthly, newRebate, newSafe, newDays, newStatus, targetId],
      );

      const [updatedRows] = await pool.execute(
        "SELECT * FROM vip_levels WHERE id = ? LIMIT 1",
        [targetId],
      );

      return {
        message: "VIP level updated successfully",
        data: formatVipLevel(updatedRows[0]),
      };
    }

    // 2. CREATE (ADD VIP)
    if (!data.name || String(data.name).trim() === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The name field is required (e.g. 'vip 1').");
    }
    const bettingInput = data.betting_range !== undefined ? data.betting_range : data.bettingRange;
    if (bettingInput === undefined || bettingInput === null || String(bettingInput).trim() === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The betting_range field is required.");
    }

    const name = String(data.name).trim();
    const bettingRange = String(bettingInput).trim();
    const depositInput = data.deposit_range !== undefined ? data.deposit_range : data.depositRange;
    const depositRange = depositInput !== undefined && String(depositInput).trim() !== ""
      ? String(depositInput).trim()
      : bettingRange;
    const levelUpInput = data.level_up_rewards !== undefined ? data.level_up_rewards : data.levelUpRewards;
    const levelUpRewards = number(levelUpInput ?? 0);
    const monthlyInput = data.monthly_rewards !== undefined ? data.monthly_rewards : data.monthlyRewards;
    const monthlyRewards = number(monthlyInput ?? 0);
    const rebateInput = data.rebate_rate !== undefined ? data.rebate_rate : data.rebateRate;
    const rebateRate = rebateInput !== undefined ? number(rebateInput) : 0.06;
    const safeInput = data.safe_income !== undefined ? data.safe_income : data.safeIncome;
    const safeIncome = safeInput !== undefined ? number(safeInput) : 0.20;
    const daysInput = data.days_count !== undefined ? data.days_count : data.daysCount;
    const daysCount = daysInput !== undefined ? number(daysInput) : 30;
    const statusVal = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : 0;

    const [insertResult] = await pool.execute(
      `INSERT INTO vip_levels
        (name, betting_range, deposit_range, level_up_rewards, monthly_rewards,
         rebate_rate, safe_income, days_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, bettingRange, depositRange, levelUpRewards, monthlyRewards, rebateRate, safeIncome, daysCount, statusVal],
    );

    const newId = insertResult.insertId;
    const [newRows] = await pool.execute(
      "SELECT * FROM vip_levels WHERE id = ? LIMIT 1",
      [newId],
    );

    return {
      message: "VIP level created successfully",
      data: formatVipLevel(newRows[0]),
    };
  }

  async getLoginHistory(query = {}) {
    const pool = this.poolProvider();
    await ensureIpAddressTable(pool);

    const today = localDateString(this.clock());
    const tomorrow = shiftDate(today, 1);

    if (query.id || query.log_id) {
      const targetId = Number(query.id || query.log_id);
      const [rows] = await pool.execute(
        `SELECT
           i.id,
           i.user_id,
           i.ip_address,
           i.login_time,
           i.created_at,
           u.u_id,
           u.username,
           u.mobile,
           u.email,
           u.account_type
         FROM ip_address i
         LEFT JOIN users u ON u.id = i.user_id
         WHERE i.id = ?
         LIMIT 1`,
        [targetId],
      );
      if (rows.length === 0) {
        throw new AppError(404, "RECORD_NOT_FOUND", "Login record not found");
      }
      return formatLoginRecord(rows[0], today);
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const rawType = String(query.type || "all").toLowerCase().trim();
    const type = (rawType === "today" || rawType === "today_login" || rawType === "today_logins") ? "today" : "all";

    // 1. Overall Summary (Both all-time and today counts)
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_logins,
         COUNT(DISTINCT user_id) AS total_users,
         COUNT(DISTINCT ip_address) AS unique_ips,
         COUNT(CASE WHEN (login_time >= ? AND login_time < ?) OR (created_at >= ? AND created_at < ?) THEN 1 END) AS today_logins,
         COUNT(DISTINCT CASE WHEN (login_time >= ? AND login_time < ?) OR (created_at >= ? AND created_at < ?) THEN user_id END) AS today_users
       FROM ip_address`,
      [today, tomorrow, today, tomorrow, today, tomorrow, today, tomorrow],
    );

    const sum = summaryRows[0] ?? {};
    const summary = {
      total_logins: number(sum.total_logins),
      totalLogins: number(sum.total_logins),
      today_logins: number(sum.today_logins),
      todayLogins: number(sum.today_logins),
      today_users: number(sum.today_users),
      todayUsers: number(sum.today_users),
      total_users: number(sum.total_users),
      totalUsers: number(sum.total_users),
      unique_ips: number(sum.unique_ips),
      uniqueIps: number(sum.unique_ips),
      active_type: type,
    };

    // 2. Query filters
    const conditions = ["1 = 1"];
    const params = [];

    if (type === "today") {
      conditions.push("((i.login_time >= ? AND i.login_time < ?) OR (i.created_at >= ? AND i.created_at < ?))");
      params.push(today, tomorrow, today, tomorrow);
    } else if (query.date && String(query.date).trim() !== "") {
      const d = String(query.date).trim();
      const nextD = shiftDate(d, 1);
      conditions.push("((i.login_time >= ? AND i.login_time < ?) OR (i.created_at >= ? AND i.created_at < ?))");
      params.push(d, nextD, d, nextD);
    }

    if (query.user_id) {
      conditions.push("(i.user_id = ? OR u.u_id = ?)");
      params.push(query.user_id, String(query.user_id));
    }

    if (query.ip || query.ip_address) {
      const targetIp = `%${String(query.ip || query.ip_address).trim()}%`;
      conditions.push("i.ip_address LIKE ?");
      params.push(targetIp);
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(u.username LIKE ? OR u.u_id LIKE ? OR u.mobile LIKE ? OR i.ip_address LIKE ?)");
      params.push(s, s, s, s);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM ip_address i
       LEFT JOIN users u ON u.id = i.user_id
       WHERE ${whereClause}`,
      params,
    );

    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT
         i.id,
         i.user_id,
         i.ip_address,
         i.login_time,
         i.created_at,
         u.u_id,
         u.username,
         u.mobile,
         u.email,
         u.account_type
       FROM ip_address i
       LEFT JOIN users u ON u.id = i.user_id
       WHERE ${whereClause}
       ORDER BY i.id DESC
       LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map((r) => formatLoginRecord(r, today));

    return {
      summary,
      types: ["all", "today"],
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      list,
      history: list,
      logins: list,
    };
  }

  async getMlmLevels(query = {}) {
    const pool = this.poolProvider();
    await ensureMlmLevelsTable(pool);

    const targetUserIdentifier = query.user_id ?? query.userId ?? query.id;

    // 1. If user_id is passed: calculate downline MLM levels for this specific user
    if (targetUserIdentifier !== undefined && targetUserIdentifier !== null && String(targetUserIdentifier).trim() !== "") {
      const ident = String(targetUserIdentifier).trim();
      const [userRows] = await pool.execute(
        `SELECT id, username, u_id, mobile, referral_code, referral_user_id, wallet, turnover, status, created_at
         FROM users
         WHERE (id = ? OR u_id = ? OR username = ? OR mobile = ?)
         LIMIT 1`,
        [Number(ident) || 0, ident, ident, ident],
      );

      if (userRows.length === 0) {
        throw new AppError(404, "USER_NOT_FOUND", `User with identifier '${ident}' not found`);
      }

      const targetUser = userRows[0];

      // Fetch MLM level configuration rates
      const [configRows] = await pool.execute(
        "SELECT id, name, count, commission, status FROM mlm_levels ORDER BY count ASC, id ASC",
      );
      const defaultCommissions = [0.60, 0.18, 0.054, 0.016, 0.0048, 0.0014];

      const levels = [];
      const allMembers = [];
      const visited = new Set([Number(targetUser.id)]);
      let currentParentIds = [Number(targetUser.id)];

      for (let lvl = 1; lvl <= 6; lvl += 1) {
        const cfg = configRows.find((r) => Number(r.count) === lvl) ?? configRows[lvl - 1];
        const commRate = cfg ? number(cfg.commission) : (defaultCommissions[lvl - 1] ?? 0.001);

        if (currentParentIds.length === 0) {
          levels.push({
            level: lvl,
            name: cfg?.name ?? `Level ${lvl}`,
            commission_rate: commRate,
            commission_percent: `${(commRate * 100).toFixed(2)}%`,
            members_count: 0,
            active_members: 0,
            total_turnover: 0,
            total_deposit: 0,
            total_wallet: 0,
            members: [],
          });
          continue;
        }

        const placeholders = currentParentIds.map(() => "?").join(",");
        const [memberRows] = await pool.execute(
          `SELECT
             u.id,
             u.username,
             u.u_id,
             u.mobile,
             u.email,
             u.referral_code,
             u.referral_user_id,
             u.wallet,
             u.winning_wallet,
             u.turnover,
             u.status,
             u.created_at,
             COALESCE((SELECT SUM(b.amount) FROM bets b WHERE b.userid = u.id), 0) AS bets_turnover,
             COALESCE((SELECT SUM(p.cash) FROM payins p WHERE p.user_id = u.id AND p.status = 2), 0) AS total_deposit
           FROM users u
           WHERE u.referral_user_id IN (${placeholders})
           ORDER BY u.id ASC`,
          currentParentIds,
        );

        const levelMembers = [];
        const nextParentIds = [];

        for (const row of memberRows) {
          const mid = Number(row.id);
          if (visited.has(mid)) continue;
          visited.add(mid);
          nextParentIds.push(mid);

          const mTurnover = number(row.turnover) + number(row.bets_turnover);
          const mDeposit = number(row.total_deposit);
          const mWallet = number(row.wallet);
          const isActive = Number(row.status) === 1;

          const memberObj = {
            id: mid,
            username: row.username,
            u_id: row.u_id,
            mobile: row.mobile,
            email: row.email,
            referral_code: row.referral_code,
            referral_user_id: row.referral_user_id,
            level: lvl,
            level_name: `Level ${lvl}`,
            wallet: mWallet,
            winning_wallet: number(row.winning_wallet),
            turnover: mTurnover,
            total_deposit: mDeposit,
            status: Number(row.status),
            status_label: isActive ? "Active" : "Suspended",
            created_at: row.created_at,
          };

          levelMembers.push(memberObj);
          allMembers.push(memberObj);
        }

        const totalLevelTurnover = levelMembers.reduce((sum, m) => sum + m.turnover, 0);
        const totalLevelDeposit = levelMembers.reduce((sum, m) => sum + m.total_deposit, 0);
        const totalLevelWallet = levelMembers.reduce((sum, m) => sum + m.wallet, 0);
        const activeCount = levelMembers.filter((m) => m.status === 1).length;

        levels.push({
          level: lvl,
          name: cfg?.name ?? `Level ${lvl}`,
          commission_rate: commRate,
          commission_percent: `${(commRate * 100).toFixed(2)}%`,
          members_count: levelMembers.length,
          active_members: activeCount,
          total_turnover: totalLevelTurnover,
          total_deposit: totalLevelDeposit,
          total_wallet: totalLevelWallet,
          members: levelMembers,
        });

        currentParentIds = nextParentIds;
      }

      const totalTeamMembers = allMembers.length;
      const activeTeamMembers = allMembers.filter((m) => m.status === 1).length;
      const totalTeamTurnover = allMembers.reduce((sum, m) => sum + m.turnover, 0);
      const totalTeamDeposit = allMembers.reduce((sum, m) => sum + m.total_deposit, 0);
      const totalTeamWallet = allMembers.reduce((sum, m) => sum + m.wallet, 0);
      const activeLevelsCount = levels.filter((l) => l.members_count > 0).length;

      return {
        user: {
          id: Number(targetUser.id),
          username: targetUser.username,
          u_id: targetUser.u_id,
          mobile: targetUser.mobile,
          referral_code: targetUser.referral_code,
          wallet: number(targetUser.wallet),
          turnover: number(targetUser.turnover),
          status: Number(targetUser.status),
          status_label: Number(targetUser.status) === 1 ? "Active" : "Suspended",
        },
        summary: {
          total_levels: 6,
          total_team_members: totalTeamMembers,
          active_team_members: activeTeamMembers,
          total_team_turnover: totalTeamTurnover,
          total_team_deposit: totalTeamDeposit,
          total_team_wallet: totalTeamWallet,
          active_levels_count: activeLevelsCount,
        },
        levels_count: activeLevelsCount,
        levels,
        all_members: allMembers,
      };
    }

    // 2. If NO user_id: Return global MLM config & top referring agents directory
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const [configRows] = await pool.execute(
      "SELECT id, name, count, commission, cashback, status, created_at, updated_at FROM mlm_levels ORDER BY count ASC, id ASC",
    );

    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(DISTINCT referral_user_id) AS total_agents,
         COUNT(*) AS total_network_members
       FROM users
       WHERE referral_user_id IS NOT NULL AND referral_user_id > 0`,
    );

    const sum = summaryRows[0] ?? {};
    const totalAgents = number(sum.total_agents);
    const totalNetworkMembers = number(sum.total_network_members);

    // List referring agents with direct referral count
    const [agentRows] = await pool.execute(
      `SELECT
         u.id,
         u.username,
         u.u_id,
         u.mobile,
         u.referral_code,
         u.wallet,
         u.turnover,
         u.status,
         COUNT(r.id) AS direct_referrals_count
       FROM users u
       INNER JOIN users r ON r.referral_user_id = u.id
       GROUP BY u.id
       ORDER BY direct_referrals_count DESC, u.id ASC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    const agents = agentRows.map((r) => ({
      id: Number(r.id),
      username: r.username,
      u_id: r.u_id,
      mobile: r.mobile,
      referral_code: r.referral_code,
      wallet: number(r.wallet),
      turnover: number(r.turnover),
      direct_referrals_count: number(r.direct_referrals_count),
      status: Number(r.status),
      status_label: Number(r.status) === 1 ? "Active" : "Suspended",
    }));

    return {
      summary: {
        total_agents: totalAgents,
        total_network_members: totalNetworkMembers,
        total_levels_configured: configRows.length,
      },
      mlm_levels: configRows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        count: Number(r.count),
        level: Number(r.count),
        commission: number(r.commission),
        commission_percent: number(r.commission) * 100,
        commission_percent_label: `${(number(r.commission) * 100).toFixed(2)}%`,
        cashback: r.cashback !== null ? number(r.cashback) : null,
        status: Number(r.status),
        status_label: Number(r.status) === 1 ? "Active" : "Inactive",
      })),
      get levels() {
        return this.mlm_levels;
      },
      pagination: {
        total: totalAgents,
        limit,
        offset,
        page,
        totalPages: Math.ceil(totalAgents / limit) || 1,
      },
      agents,
    };
  }

  async saveMlmLevel(data = {}) {
    const pool = this.poolProvider();
    await ensureMlmLevelsTable(pool);

    const targetId = Number(data.id ?? data.paramsId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError(400, "INVALID_MLM_LEVEL_ID", "Valid MLM level ID is required");
    }

    const [existing] = await pool.execute(
      "SELECT * FROM mlm_levels WHERE id = ? LIMIT 1",
      [targetId],
    );
    if (existing.length === 0) {
      throw new AppError(404, "MLM_LEVEL_NOT_FOUND", "MLM level configuration not found");
    }

    const cur = existing[0];
    const newName = data.name !== undefined ? String(data.name).trim() : cur.name;
    const newComm = data.commission !== undefined ? number(data.commission) : cur.commission;
    const newCashback = data.cashback !== undefined ? number(data.cashback) : cur.cashback;
    const newStatus = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : cur.status;

    await pool.execute(
      `UPDATE mlm_levels
       SET name = ?, commission = ?, cashback = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newName, newComm, newCashback, newStatus, targetId],
    );

    const [updated] = await pool.execute(
      "SELECT * FROM mlm_levels WHERE id = ? LIMIT 1",
      [targetId],
    );

    return {
      success: true,
      message: "MLM level updated successfully",
      data: {
        id: Number(updated[0].id),
        name: updated[0].name,
        count: Number(updated[0].count),
        level: Number(updated[0].count),
        commission: number(updated[0].commission),
        commission_percent: `${(number(updated[0].commission) * 100).toFixed(2)}%`,
        status: Number(updated[0].status),
        status_label: Number(updated[0].status) === 1 ? "Active" : "Inactive",
      },
    };
  }

  async getSalaryList(query = {}) {
    const pool = this.poolProvider();
    await ensureSalaryTables(pool);

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = ["1 = 1"];
    const params = [];

    // Search by User ID or UID
    const targetUserId = query.user_id ?? query.userId ?? query.id;
    if (targetUserId !== undefined && targetUserId !== null && String(targetUserId).trim() !== "") {
      const uStr = String(targetUserId).trim();
      conditions.push("(s.user_id = ? OR u.u_id = ?)");
      params.push(Number(uStr) || 0, uStr);
    }

    // Search by text (username, mobile, remark)
    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(u.username LIKE ? OR u.u_id LIKE ? OR u.mobile LIKE ?)");
      params.push(s, s, s);
    }

    // Salary type (1: Daily, 2: Monthly)
    if (query.salary_type !== undefined && query.salary_type !== "all" && query.salary_type !== "") {
      conditions.push("s.salary_type = ?");
      params.push(Number(query.salary_type));
    }

    const whereClause = conditions.join(" AND ");

    // 1. Overall Summary
    const [summaryRows] = await pool.execute(
      `SELECT
         COALESCE(SUM(s.salary), 0) AS total_salary_amount,
         COUNT(*) AS total_records,
         COUNT(DISTINCT s.user_id) AS unique_users,
         COUNT(CASE WHEN s.salary_type = 1 THEN 1 END) AS daily_salary_count,
         COUNT(CASE WHEN s.salary_type = 2 THEN 1 END) AS monthly_salary_count
       FROM user_salary s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE ${whereClause}`,
      params,
    );

    const sum = summaryRows[0] ?? {};
    const summary = {
      total_salary_amount: number(sum.total_salary_amount),
      total_amount: number(sum.total_salary_amount),
      totalSalaryAmount: number(sum.total_salary_amount),
      total_records: number(sum.total_records),
      totalRecords: number(sum.total_records),
      unique_users: number(sum.unique_users),
      uniqueUsers: number(sum.unique_users),
      daily_salary_count: number(sum.daily_salary_count),
      dailySalaryCount: number(sum.daily_salary_count),
      monthly_salary_count: number(sum.monthly_salary_count),
      monthlySalaryCount: number(sum.monthly_salary_count),
    };

    const total = number(sum.total_records);
    const totalPages = Math.ceil(total / limit) || 1;

    // 2. Fetch list with pagination
    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT
         s.id,
         s.user_id,
         s.active_players,
         s.downline_levels,
         s.daily_deposit,
         s.daily_withdrawal,
         s.daily_profit_loss,
         s.daily_profit_loss_type,
         s.monthly_deposit,
         s.monthly_withdrawal,
         s.monthly_profit_loss,
         s.monthly_profit_loss_type,
         s.salary,
         s.salary_type,
         s.created_at,
         u.u_id,
         u.username,
         u.mobile,
         u.wallet
       FROM user_salary s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE ${whereClause}
       ORDER BY s.id DESC
       LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map(formatSalaryRecord);

    return {
      summary,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      list,
      records: list,
      history: list,
      salaries: list,
    };
  }

  async saveSalary(data = {}) {
    const pool = this.poolProvider();
    await ensureSalaryTables(pool);

    const targetUserIdentifier = data.user_id ?? data.userId;
    if (targetUserIdentifier === undefined || targetUserIdentifier === null || String(targetUserIdentifier).trim() === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The user_id field is required.");
    }
    const rawSalary = data.salary ?? data.amount ?? data.salary_amount;
    if (rawSalary === undefined || rawSalary === null || isNaN(Number(rawSalary)) || Number(rawSalary) <= 0) {
      throw new AppError(400, "VALIDATION_ERROR", "The salary amount must be a positive number.");
    }

    const uIdent = String(targetUserIdentifier).trim();
    const [userRows] = await pool.execute(
      "SELECT id, username, u_id, wallet FROM users WHERE (id = ? OR u_id = ?) LIMIT 1",
      [Number(uIdent) || 0, uIdent],
    );

    if (userRows.length === 0) {
      throw new AppError(404, "USER_NOT_FOUND", `User with identifier '${uIdent}' not found`);
    }

    const user = userRows[0];
    const salaryAmount = number(rawSalary);
    const salaryType = Number(data.salary_type ?? 1); // 1: Daily, 2: Monthly
    const activePlayers = number(data.active_players ?? 0);
    const downlineLevels = number(data.downline_levels ?? 0);
    const dailyDeposit = number(data.daily_deposit ?? 0);
    const dailyWithdrawal = number(data.daily_withdrawal ?? 0);
    const dailyProfitLoss = number(data.daily_profit_loss ?? dailyDeposit - dailyWithdrawal);
    const dailyProfitLossType = data.daily_profit_loss_type ?? (dailyProfitLoss >= 0 ? "profit" : "loss");
    const monthlyDeposit = number(data.monthly_deposit ?? 0);
    const monthlyWithdrawal = number(data.monthly_withdrawal ?? 0);
    const monthlyProfitLoss = number(data.monthly_profit_loss ?? monthlyDeposit - monthlyWithdrawal);
    const monthlyProfitLossType = data.monthly_profit_loss_type ?? (monthlyProfitLoss >= 0 ? "profit" : "loss");
    const remark = String(data.remark ?? (salaryType === 2 ? "Monthly Salary" : "Daily Salary")).trim();

    const [insertResult] = await pool.execute(
      `INSERT INTO user_salary
         (user_id, active_players, downline_levels,
          daily_deposit, daily_withdrawal, daily_profit_loss, daily_profit_loss_type,
          monthly_deposit, monthly_withdrawal, monthly_profit_loss, monthly_profit_loss_type,
          salary, salary_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        user.id,
        activePlayers,
        downlineLevels,
        dailyDeposit,
        dailyWithdrawal,
        Math.abs(dailyProfitLoss),
        dailyProfitLossType,
        monthlyDeposit,
        monthlyWithdrawal,
        Math.abs(monthlyProfitLoss),
        monthlyProfitLossType,
        salaryAmount,
        salaryType,
      ],
    );

    // Also insert into all_users_salary_record
    try {
      await pool.execute(
        `INSERT INTO all_users_salary_record (user_id, salary_amount, remark, status, created_at, updated_at)
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [user.id, salaryAmount, remark],
      );
    } catch {
      // ignore table mismatch
    }

    // Optionally credit wallet if requested (default true)
    if (data.credit_wallet !== false) {
      await pool.execute(
        "UPDATE users SET wallet = wallet + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [salaryAmount, user.id],
      );
    }

    const [newRow] = await pool.execute(
      `SELECT s.*, u.u_id, u.username, u.mobile, u.wallet
       FROM user_salary s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ?
       LIMIT 1`,
      [insertResult.insertId],
    );

    return {
      success: true,
      message: "Salary added successfully",
      data: formatSalaryRecord(newRow[0]),
    };
  }

  async getOffers(query = {}) {
    const pool = this.poolProvider();
    await ensureOffersTable(pool);

    const targetId = query.id ?? query.offer_id;
    if (targetId !== undefined && targetId !== null && String(targetId).trim() !== "") {
      const [rows] = await pool.execute(
        "SELECT * FROM offers WHERE id = ? LIMIT 1",
        [Number(targetId)],
      );
      if (rows.length === 0) {
        throw new AppError(404, "OFFER_NOT_FOUND", `Offer with ID '${targetId}' not found`);
      }
      return {
        offer: formatOffer(rows[0]),
        data: formatOffer(rows[0]),
      };
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = ["status != -1"];
    const params = [];

    if (query.status !== undefined && query.status !== "all" && query.status !== "") {
      if (query.status === "deleted") {
        conditions[0] = "status = -1";
      } else {
        conditions.push("status = ?");
        params.push(Number(query.status));
      }
    }

    if (query.type || query.offer_type) {
      const t = String(query.type || query.offer_type).trim();
      conditions.push("offer_type = ?");
      params.push(t);
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(title LIKE ? OR code LIKE ? OR description LIKE ?)");
      params.push(s, s, s);
    }

    const whereClause = conditions.join(" AND ");

    // Overall summary counts
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_offers,
         COUNT(CASE WHEN status = 1 THEN 1 END) AS active_offers,
         COUNT(CASE WHEN status = 0 THEN 1 END) AS inactive_offers
       FROM offers
       WHERE status != -1`,
    );

    const sum = summaryRows[0] ?? {};
    const summary = {
      total_offers: number(sum.total_offers),
      active_offers: number(sum.active_offers),
      inactive_offers: number(sum.inactive_offers),
    };

    // Total count for current filter
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM offers WHERE ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch paginated offers
    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT * FROM offers WHERE ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map(formatOffer);

    return {
      summary,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      offers: list,
      list,
    };
  }

  async saveOffer(data = {}) {
    const pool = this.poolProvider();
    await ensureOffersTable(pool);

    const targetId = Number(data.id ?? data.paramsId);
    const isDeleteAction =
      data.action === "delete" ||
      data.is_deleted === true ||
      data.delete === true ||
      String(data.status).toLowerCase() === "delete" ||
      String(data.status).toLowerCase() === "deleted";

    // 1. DELETE OFFER
    if (isDeleteAction) {
      if (!Number.isInteger(targetId) || targetId <= 0) {
        throw new AppError(400, "VALIDATION_ERROR", "Valid offer ID is required to delete an offer");
      }

      const [existing] = await pool.execute(
        "SELECT * FROM offers WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existing.length === 0) {
        throw new AppError(404, "OFFER_NOT_FOUND", `Offer with ID '${targetId}' not found`);
      }

      await pool.execute(
        "UPDATE offers SET status = -1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [targetId],
      );

      return {
        success: true,
        message: "Offer deleted successfully",
        data: { id: targetId, status: -1, status_label: "Deleted" },
      };
    }

    // 2. EDIT / UPDATE OFFER
    if (Number.isInteger(targetId) && targetId > 0) {
      const [existingRows] = await pool.execute(
        "SELECT * FROM offers WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existingRows.length === 0) {
        throw new AppError(404, "OFFER_NOT_FOUND", `Offer with ID '${targetId}' not found`);
      }

      const cur = existingRows[0];
      const title = data.title !== undefined ? String(data.title).trim() : (data.name !== undefined ? String(data.name).trim() : cur.title);
      const code = data.code !== undefined ? (data.code ? String(data.code).trim() : null) : cur.code;
      const description = data.description !== undefined ? String(data.description) : cur.description;
      const offerType = data.offer_type !== undefined ? String(data.offer_type) : (data.type !== undefined ? String(data.type) : cur.offer_type);
      const bonusAmount = (data.bonus_amount ?? data.amount) !== undefined ? number(data.bonus_amount ?? data.amount) : number(cur.bonus_amount);
      const bonusPercentage = (data.bonus_percentage ?? data.percentage) !== undefined ? number(data.bonus_percentage ?? data.percentage) : number(cur.bonus_percentage);
      const minRecharge = (data.min_recharge ?? data.min_amount) !== undefined ? number(data.min_recharge ?? data.min_amount) : number(cur.min_recharge);
      const maxBonus = data.max_bonus !== undefined ? number(data.max_bonus) : number(cur.max_bonus);
      const bannerImage = (data.banner_image ?? data.image ?? data.banner) !== undefined ? (data.banner_image ?? data.image ?? data.banner) : cur.banner_image;
      const startDate = data.start_date !== undefined ? (data.start_date ? String(data.start_date) : null) : cur.start_date;
      const endDate = data.end_date !== undefined ? (data.end_date ? String(data.end_date) : null) : cur.end_date;
      const usageLimit = data.usage_limit !== undefined ? Number(data.usage_limit) : Number(cur.usage_limit);
      const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : Number(cur.status);

      await pool.execute(
        `UPDATE offers
         SET title = ?, code = ?, description = ?, offer_type = ?, bonus_amount = ?,
             bonus_percentage = ?, min_recharge = ?, max_bonus = ?, banner_image = ?,
             start_date = ?, end_date = ?, usage_limit = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          title,
          code,
          description,
          offerType,
          bonusAmount,
          bonusPercentage,
          minRecharge,
          maxBonus,
          bannerImage,
          startDate,
          endDate,
          usageLimit,
          status,
          targetId,
        ],
      );

      const [updatedRows] = await pool.execute(
        "SELECT * FROM offers WHERE id = ? LIMIT 1",
        [targetId],
      );

      return {
        success: true,
        message: "Offer updated successfully",
        data: formatOffer(updatedRows[0]),
      };
    }

    // 3. CREATE / ADD OFFER
    const title = data.title ? String(data.title).trim() : (data.name ? String(data.name).trim() : "");
    if (!title) {
      throw new AppError(400, "VALIDATION_ERROR", "Title or Name is required for offer");
    }

    const code = data.code ? String(data.code).trim() : null;
    const description = data.description ? String(data.description) : "";
    const offerType = data.offer_type ? String(data.offer_type) : (data.type ? String(data.type) : "general");
    const bonusAmount = number(data.bonus_amount ?? data.amount ?? 0);
    const bonusPercentage = number(data.bonus_percentage ?? data.percentage ?? 0);
    const minRecharge = number(data.min_recharge ?? data.min_amount ?? 0);
    const maxBonus = number(data.max_bonus ?? 0);
    const bannerImage = data.banner_image ?? data.image ?? data.banner ?? null;
    const startDate = data.start_date ? String(data.start_date) : null;
    const endDate = data.end_date ? String(data.end_date) : null;
    const usageLimit = Number(data.usage_limit ?? 0);
    const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : 1;

    const [insertResult] = await pool.execute(
      `INSERT INTO offers (
         title, code, description, offer_type, bonus_amount,
         bonus_percentage, min_recharge, max_bonus, banner_image,
         start_date, end_date, usage_limit, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        title,
        code,
        description,
        offerType,
        bonusAmount,
        bonusPercentage,
        minRecharge,
        maxBonus,
        bannerImage,
        startDate,
        endDate,
        usageLimit,
        status,
      ],
    );

    const [newRow] = await pool.execute(
      "SELECT * FROM offers WHERE id = ? LIMIT 1",
      [insertResult.insertId],
    );

    return {
      success: true,
      message: "Offer added successfully",
      data: formatOffer(newRow[0]),
    };
  }

  async getGifts(query = {}) {
    const pool = this.poolProvider();
    await ensureGiftCartTable(pool);

    const targetId = query.id ?? query.gift_id;
    if (targetId !== undefined && targetId !== null && String(targetId).trim() !== "") {
      const [rows] = await pool.execute(
        "SELECT * FROM gift_cart WHERE id = ? LIMIT 1",
        [Number(targetId)],
      );
      if (rows.length === 0) {
        throw new AppError(404, "GIFT_NOT_FOUND", `Gift with ID '${targetId}' not found`);
      }
      return {
        gift: formatGift(rows[0]),
        data: formatGift(rows[0]),
      };
    }

    const targetCode = query.code ?? query.gift_code;
    if (targetCode !== undefined && targetCode !== null && String(targetCode).trim() !== "") {
      const [rows] = await pool.execute(
        "SELECT * FROM gift_cart WHERE code = ? LIMIT 1",
        [String(targetCode).trim()],
      );
      if (rows.length === 0) {
        throw new AppError(404, "GIFT_NOT_FOUND", `Gift with code '${targetCode}' not found`);
      }
      return {
        gift: formatGift(rows[0]),
        data: formatGift(rows[0]),
      };
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = ["status != -1"];
    const params = [];

    if (query.status !== undefined && query.status !== "all" && query.status !== "") {
      if (query.status === "deleted") {
        conditions[0] = "status = -1";
      } else if (query.status === "exhausted") {
        conditions.push("availed_num >= number_people");
      } else if (query.status === "active") {
        conditions.push("status = 1 AND availed_num < number_people");
      } else {
        conditions.push("status = ?");
        params.push(Number(query.status));
      }
    }

    if (query.campaign_tag || query.tag) {
      const tag = String(query.campaign_tag || query.tag).trim();
      conditions.push("campaign_tag = ?");
      params.push(tag);
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(code LIKE ? OR campaign_tag LIKE ?)");
      params.push(s, s);
    }

    const whereClause = conditions.join(" AND ");

    // Summary counts
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_gifts,
         COALESCE(SUM(availed_num), 0) AS total_claimed,
         COALESCE(SUM(number_people), 0) AS total_slots,
         COALESCE(SUM(GREATEST(0, number_people - availed_num)), 0) AS total_slots_remaining,
         COUNT(CASE WHEN status = 1 AND availed_num < number_people THEN 1 END) AS active_gifts,
         COUNT(CASE WHEN availed_num >= number_people THEN 1 END) AS exhausted_gifts,
         COALESCE(SUM(amount * availed_num), 0) AS total_distributed_amount
       FROM gift_cart
       WHERE status != -1`,
    );

    const sum = summaryRows[0] ?? {};
    const summary = {
      total_gifts: number(sum.total_gifts),
      total_claimed: number(sum.total_claimed),
      total_slots: number(sum.total_slots),
      total_slots_remaining: number(sum.total_slots_remaining),
      active_gifts: number(sum.active_gifts),
      exhausted_gifts: number(sum.exhausted_gifts),
      total_distributed_amount: number(sum.total_distributed_amount),
    };

    // Count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM gift_cart WHERE ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch records
    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT * FROM gift_cart WHERE ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map(formatGift);

    return {
      summary,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      gifts: list,
      history: list,
      list,
    };
  }

  async saveGift(data = {}) {
    const pool = this.poolProvider();
    await ensureGiftCartTable(pool);

    const targetId = Number(data.id ?? data.paramsId);
    const isDeleteAction =
      data.action === "delete" ||
      data.is_deleted === true ||
      data.delete === true ||
      String(data.status).toLowerCase() === "delete" ||
      String(data.status).toLowerCase() === "deleted";

    // 1. DELETE GIFT
    if (isDeleteAction) {
      if (!Number.isInteger(targetId) || targetId <= 0) {
        throw new AppError(400, "VALIDATION_ERROR", "Valid gift ID is required to delete a gift");
      }

      const [existing] = await pool.execute(
        "SELECT * FROM gift_cart WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existing.length === 0) {
        throw new AppError(404, "GIFT_NOT_FOUND", `Gift with ID '${targetId}' not found`);
      }

      await pool.execute(
        "UPDATE gift_cart SET status = -1 WHERE id = ?",
        [targetId],
      );

      return {
        success: true,
        message: "Gift deleted successfully",
        data: { id: targetId, status: -1, status_label: "Deleted" },
      };
    }

    // 2. EDIT / UPDATE GIFT
    if (Number.isInteger(targetId) && targetId > 0) {
      const [existingRows] = await pool.execute(
        "SELECT * FROM gift_cart WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existingRows.length === 0) {
        throw new AppError(404, "GIFT_NOT_FOUND", `Gift with ID '${targetId}' not found`);
      }

      const cur = existingRows[0];
      const depositRequired = (data.deposit_amount ?? data.req_deposit ?? data.deposit_required ?? data.deposit) !== undefined
        ? number(data.deposit_amount ?? data.req_deposit ?? data.deposit_required ?? data.deposit)
        : number(cur.deposit_amount);

      const giftAmount = (data.amount ?? data.gift_amount ?? data.reward_amount) !== undefined
        ? number(data.amount ?? data.gift_amount ?? data.reward_amount)
        : number(cur.amount);

      const maxClaims = (data.number_people ?? data.max_claims ?? data.people ?? data.claims) !== undefined
        ? Number(data.number_people ?? data.max_claims ?? data.people ?? data.claims)
        : Number(cur.number_people);

      const campaignTag = (data.campaign_tag ?? data.tag ?? data.campaign) !== undefined
        ? String(data.campaign_tag ?? data.tag ?? data.campaign)
        : cur.campaign_tag;

      const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : Number(cur.status);

      await pool.execute(
        `UPDATE gift_cart
         SET deposit_amount = ?, amount = ?, number_people = ?, campaign_tag = ?, status = ?
         WHERE id = ?`,
        [depositRequired, giftAmount, maxClaims, campaignTag, status, targetId],
      );

      const [updatedRows] = await pool.execute(
        "SELECT * FROM gift_cart WHERE id = ? LIMIT 1",
        [targetId],
      );

      return {
        success: true,
        message: "Gift updated successfully",
        data: formatGift(updatedRows[0]),
      };
    }

    // 3. ADD / CREATE GIFT
    const rawGiftAmount = data.amount ?? data.gift_amount ?? data.reward_amount;
    if (rawGiftAmount === undefined || rawGiftAmount === null || isNaN(Number(rawGiftAmount)) || Number(rawGiftAmount) <= 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Gift Amount (₹) must be a positive number.");
    }
    const giftAmount = number(rawGiftAmount);

    const depositRequired = number(data.deposit_amount ?? data.req_deposit ?? data.deposit_required ?? data.deposit ?? 0);
    const maxClaims = Math.max(1, parseInt(data.number_people ?? data.max_claims ?? data.people ?? data.claims ?? 1, 10));
    const campaignTag = data.campaign_tag ? String(data.campaign_tag).trim() : (data.tag ? String(data.tag).trim() : (data.campaign ? String(data.campaign).trim() : null));

    let giftCode = data.code ? String(data.code).trim() : (data.gift_code ? String(data.gift_code).trim() : "");
    if (!giftCode) {
      giftCode = generate15DigitGiftCode();
    }

    const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : 1;

    const [insertResult] = await pool.execute(
      `INSERT INTO gift_cart (
         code, amount, number_people, availed_num, deposit_amount, campaign_tag, status, datetime
       ) VALUES (?, ?, ?, 0, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [giftCode, giftAmount, maxClaims, depositRequired, campaignTag, status],
    );

    const [newRow] = await pool.execute(
      "SELECT * FROM gift_cart WHERE id = ? LIMIT 1",
      [insertResult.insertId],
    );

    return {
      success: true,
      message: "Gift added successfully",
      data: formatGift(newRow[0]),
    };
  }

  async getBanners(query = {}) {
    const pool = this.poolProvider();
    await ensureSlidersTable(pool);

    const targetId = query.id ?? query.banner_id ?? query.slider_id;
    if (targetId !== undefined && targetId !== null && String(targetId).trim() !== "") {
      const [rows] = await pool.execute(
        "SELECT * FROM sliders WHERE id = ? LIMIT 1",
        [Number(targetId)],
      );
      if (rows.length === 0) {
        throw new AppError(404, "BANNER_NOT_FOUND", `Banner with ID '${targetId}' not found`);
      }
      return {
        banner: formatBanner(rows[0]),
        data: formatBanner(rows[0]),
      };
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = ["status != -1"];
    const params = [];

    if (query.status !== undefined && query.status !== "all" && query.status !== "") {
      if (query.status === "deleted") {
        conditions[0] = "status = -1";
      } else {
        conditions.push("status = ?");
        params.push(Number(query.status));
      }
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("title LIKE ?");
      params.push(s);
    }

    const whereClause = conditions.join(" AND ");

    // Summary counts
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_banners,
         COUNT(CASE WHEN status = 1 THEN 1 END) AS active_banners,
         COUNT(CASE WHEN status = 0 THEN 1 END) AS inactive_banners
       FROM sliders
       WHERE status != -1`,
    );

    const sum = summaryRows[0] ?? {};
    const summary = {
      total_banners: number(sum.total_banners),
      active_banners: number(sum.active_banners),
      inactive_banners: number(sum.inactive_banners),
    };

    // Count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM sliders WHERE ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch records
    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT * FROM sliders WHERE ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      listParams,
    );

    // Guarantee unique items by id so duplicates never occur
    const uniqueMap = new Map();
    for (const r of rows) {
      const mid = Number(r.id);
      if (!uniqueMap.has(mid)) {
        uniqueMap.set(mid, formatBanner(r));
      }
    }
    const list = Array.from(uniqueMap.values());

    return {
      summary,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      banners: list,
    };
  }

  async saveBanner(data = {}) {
    const pool = this.poolProvider();
    await ensureSlidersTable(pool);

    const targetId = Number(data.id ?? data.paramsId);
    const isDeleteAction =
      data.action === "delete" ||
      data.is_deleted === true ||
      data.delete === true ||
      String(data.status).toLowerCase() === "delete" ||
      String(data.status).toLowerCase() === "deleted";

    // 1. DELETE
    if (isDeleteAction) {
      if (!Number.isInteger(targetId) || targetId <= 0) {
        throw new AppError(400, "VALIDATION_ERROR", "Valid banner ID is required to delete");
      }

      const [existing] = await pool.execute(
        "SELECT * FROM sliders WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existing.length === 0) {
        throw new AppError(404, "BANNER_NOT_FOUND", `Banner with ID '${targetId}' not found`);
      }

      await pool.execute(
        "UPDATE sliders SET status = -1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [targetId],
      );

      return {
        success: true,
        message: "Activity banner deleted successfully",
        data: { id: targetId, status: -1, status_label: "Deleted" },
      };
    }

    // 2. EDIT / UPDATE
    if (Number.isInteger(targetId) && targetId > 0) {
      const [existingRows] = await pool.execute(
        "SELECT * FROM sliders WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existingRows.length === 0) {
        throw new AppError(404, "BANNER_NOT_FOUND", `Banner with ID '${targetId}' not found`);
      }

      const cur = existingRows[0];
      const title = data.title !== undefined ? String(data.title).trim() : (data.Title !== undefined ? String(data.Title).trim() : cur.title);
      const image = (data.banner_image ?? data.image ?? data["Banner Image"]) !== undefined
        ? String(data.banner_image ?? data.image ?? data["Banner Image"]).trim()
        : cur.image;
      const activityImage = (data.activity_image ?? data["Activity Image"]) !== undefined
        ? String(data.activity_image ?? data["Activity Image"]).trim()
        : cur.activity_image;
      const activityImageUrl = (data.activity_image_url ?? data.url) !== undefined
        ? String(data.activity_image_url ?? data.url).trim()
        : (activityImage || cur.activity_image_url);
      const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : Number(cur.status);

      await pool.execute(
        `UPDATE sliders
         SET title = ?, image = ?, activity_image = ?, activity_image_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [title, image, activityImage, activityImageUrl, status, targetId],
      );

      const [updatedRows] = await pool.execute(
        "SELECT * FROM sliders WHERE id = ? LIMIT 1",
        [targetId],
      );

      return {
        success: true,
        message: "Activity banner updated successfully",
        data: formatBanner(updatedRows[0]),
      };
    }

    // 3. ADD / CREATE
    const title = data.title ? String(data.title).trim() : (data.Title ? String(data.Title).trim() : "");
    const bannerImage = data.banner_image
      ? String(data.banner_image).trim()
      : (data["Banner Image"] ? String(data["Banner Image"]).trim() : (data.image ? String(data.image).trim() : ""));
    const activityImage = data.activity_image
      ? String(data.activity_image).trim()
      : (data["Activity Image"] ? String(data["Activity Image"]).trim() : "");

    if (!title || !bannerImage || !activityImage) {
      throw new AppError(400, "VALIDATION_ERROR", "Title, Banner Image, and Activity Image are required.");
    }

    const activityImageUrl = data.activity_image_url
      ? String(data.activity_image_url).trim()
      : (data.url ? String(data.url).trim() : activityImage);
    const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : 1;

    const [insertResult] = await pool.execute(
      `INSERT INTO sliders (
         title, image, activity_image, activity_image_url, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [title, bannerImage, activityImage, activityImageUrl, status],
    );

    const [newRow] = await pool.execute(
      "SELECT * FROM sliders WHERE id = ? LIMIT 1",
      [insertResult.insertId],
    );

    return {
      success: true,
      message: "Activity banner added successfully",
      data: formatBanner(newRow[0]),
    };
  }

  async getPaymentLimits(query = {}) {
    const pool = this.poolProvider();
    await ensurePaymentLimitsTable(pool);

    const targetId = query.id ?? query.limit_id ?? query.ID;
    if (targetId !== undefined && targetId !== null && String(targetId).trim() !== "") {
      const [rows] = await pool.execute(
        "SELECT * FROM payment_limits WHERE id = ? LIMIT 1",
        [Number(targetId)],
      );
      if (rows.length === 0) {
        throw new AppError(404, "PAYMENT_LIMIT_NOT_FOUND", `Payment limit with ID '${targetId}' not found`);
      }
      return {
        payment_limit: formatPaymentLimit(rows[0]),
        data: formatPaymentLimit(rows[0]),
      };
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = ["status != -1"];
    const params = [];

    if (query.status !== undefined && query.status !== "all" && query.status !== "") {
      if (query.status === "deleted") {
        conditions[0] = "status = -1";
      } else {
        conditions.push("status = ?");
        params.push(Number(query.status));
      }
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("name LIKE ?");
      params.push(s);
    }

    const whereClause = conditions.join(" AND ");

    // Summary counts
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_limits,
         COUNT(CASE WHEN status = 1 THEN 1 END) AS active_limits,
         COUNT(CASE WHEN status = 0 THEN 1 END) AS inactive_limits
       FROM payment_limits
       WHERE status != -1`,
    );

    const sum = summaryRows[0] ?? {};
    const summary = {
      total_limits: number(sum.total_limits),
      active_limits: number(sum.active_limits),
      inactive_limits: number(sum.inactive_limits),
    };

    // Count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM payment_limits WHERE ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch records
    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT * FROM payment_limits WHERE ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map((r) => formatPaymentLimit(r));

    return {
      summary,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      payment_limits: list,
      history: list,
      data: list,
    };
  }

  async savePaymentLimit(data = {}) {
    const pool = this.poolProvider();
    await ensurePaymentLimitsTable(pool);

    const targetId = Number(data.id ?? data.ID ?? data.paramsId);
    const isDeleteAction =
      data.action === "delete" ||
      data.is_deleted === true ||
      data.delete === true ||
      String(data.status).toLowerCase() === "delete" ||
      String(data.status).toLowerCase() === "deleted" ||
      Number(data.status) === -1;

    // 1. DELETE
    if (isDeleteAction) {
      if (!Number.isInteger(targetId) || targetId <= 0) {
        throw new AppError(400, "VALIDATION_ERROR", "Valid payment limit ID is required to delete");
      }

      const [existing] = await pool.execute(
        "SELECT * FROM payment_limits WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existing.length === 0) {
        throw new AppError(404, "PAYMENT_LIMIT_NOT_FOUND", `Payment limit with ID '${targetId}' not found`);
      }

      await pool.execute(
        "UPDATE payment_limits SET status = -1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [targetId],
      );

      return {
        success: true,
        message: "Payment limit deleted successfully",
        data: { id: targetId, status: -1, status_label: "Deleted" },
      };
    }

    // 2. EDIT / UPDATE
    if (Number.isInteger(targetId) && targetId > 0) {
      const [existingRows] = await pool.execute(
        "SELECT * FROM payment_limits WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existingRows.length === 0) {
        throw new AppError(404, "PAYMENT_LIMIT_NOT_FOUND", `Payment limit with ID '${targetId}' not found`);
      }

      const cur = existingRows[0];
      const name = (data.name ?? data.Name) !== undefined
        ? String(data.name ?? data.Name).trim()
        : cur.name;
      const amount = (data.amount ?? data.Amount) !== undefined
        ? number(data.amount ?? data.Amount)
        : number(cur.amount);
      const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : Number(cur.status);

      if (!name) {
        throw new AppError(400, "VALIDATION_ERROR", "Payment limit Name cannot be empty.");
      }
      if (isNaN(amount) || amount < 0) {
        throw new AppError(400, "VALIDATION_ERROR", "Amount must be a non-negative number.");
      }

      await pool.execute(
        `UPDATE payment_limits
         SET name = ?, amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, amount, status, targetId],
      );

      const [updatedRows] = await pool.execute(
        "SELECT * FROM payment_limits WHERE id = ? LIMIT 1",
        [targetId],
      );

      return {
        success: true,
        message: "Payment limit updated successfully",
        data: formatPaymentLimit(updatedRows[0]),
      };
    }

    // 3. ADD / CREATE
    const name = data.name ? String(data.name).trim() : (data.Name ? String(data.Name).trim() : "");
    const rawAmount = data.amount ?? data.Amount;
    if (!name) {
      throw new AppError(400, "VALIDATION_ERROR", "Payment limit Name is required.");
    }
    if (rawAmount === undefined || rawAmount === null || isNaN(Number(rawAmount)) || Number(rawAmount) < 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Amount must be a valid non-negative number.");
    }
    const amount = number(rawAmount);
    const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : 1;

    const [insertResult] = await pool.execute(
      `INSERT INTO payment_limits (
         name, amount, status, created_at, updated_at
       ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, amount, status],
    );

    const [newRow] = await pool.execute(
      "SELECT * FROM payment_limits WHERE id = ? LIMIT 1",
      [insertResult.insertId],
    );

    return {
      success: true,
      message: "Payment limit added successfully",
      data: formatPaymentLimit(newRow[0]),
    };
  }

  async getDeposits(query = {}) {
    const pool = this.poolProvider();
    await ensurePayinsTable(pool);

    const targetId = query.id ?? query.payin_id ?? query.Id ?? query.ID;
    if (targetId !== undefined && targetId !== null && String(targetId).trim() !== "") {
      const [rows] = await pool.execute(
        `SELECT
           p.*,
           COALESCE(u.username, CONCAT('User_', p.user_id)) AS username,
           u.u_id,
           u.mobile
         FROM payins p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.id = ? LIMIT 1`,
        [Number(targetId)],
      );
      if (rows.length === 0) {
        throw new AppError(404, "DEPOSIT_NOT_FOUND", `Deposit with ID '${targetId}' not found`);
      }
      return {
        deposit: formatDeposit(rows[0]),
        data: formatDeposit(rows[0]),
      };
    }

    const orderId = query.order_id ?? query.orderId;
    if (orderId && String(orderId).trim() !== "") {
      const [rows] = await pool.execute(
        `SELECT
           p.*,
           COALESCE(u.username, CONCAT('User_', p.user_id)) AS username,
           u.u_id,
           u.mobile
         FROM payins p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.order_id = ? LIMIT 1`,
        [String(orderId).trim()],
      );
      if (rows.length > 0) {
        return {
          deposit: formatDeposit(rows[0]),
          data: formatDeposit(rows[0]),
        };
      }
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = [];
    const params = [];

    // Filter by status / type
    const rawStatus = String(query.status ?? query.type ?? "").toLowerCase().trim();
    if (rawStatus === "pending" || rawStatus === "1") {
      conditions.push("p.status = 1");
    } else if (rawStatus === "success" || rawStatus === "2" || rawStatus === "approved") {
      conditions.push("p.status = 2");
    } else if (rawStatus === "reject" || rawStatus === "rejected" || rawStatus === "3") {
      conditions.push("(p.status = 3 OR p.status = 0 OR p.rejectmsg IS NOT NULL)");
    } else if (query.status !== undefined && query.status !== "all" && query.status !== "") {
      conditions.push("p.status = ?");
      params.push(Number(query.status));
    }

    // Filter by user_id
    const userId = query.user_id ?? query.userId;
    if (userId !== undefined && userId !== null && String(userId).trim() !== "") {
      conditions.push("p.user_id = ?");
      params.push(Number(userId));
    }

    // Filter by search
    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(p.order_id LIKE ? OR u.username LIKE ? OR u.mobile LIKE ? OR u.u_id LIKE ?)");
      params.push(s, s, s, s);
    }

    // Date range
    if (query.start_date) {
      conditions.push("p.created_at >= ?");
      params.push(query.start_date);
    }
    if (query.end_date) {
      conditions.push("p.created_at <= ?");
      params.push(query.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Summary counts
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_deposits,
         COUNT(CASE WHEN p.status = 1 THEN 1 END) AS total_pending,
         COUNT(CASE WHEN p.status = 2 THEN 1 END) AS total_success,
         COUNT(CASE WHEN p.status = 3 OR p.status = 0 OR p.rejectmsg IS NOT NULL THEN 1 END) AS total_rejected,
         COALESCE(SUM(CASE WHEN p.status = 1 THEN p.cash ELSE 0 END), 0) AS total_amount_pending,
         COALESCE(SUM(CASE WHEN p.status = 2 THEN p.cash ELSE 0 END), 0) AS total_amount_success
       FROM payins p
       LEFT JOIN users u ON u.id = p.user_id`,
    );

    const sum = summaryRows[0] ?? {};
    const summary = {
      total_deposits: number(sum.total_deposits),
      total_pending: number(sum.total_pending),
      total_success: number(sum.total_success),
      total_rejected: number(sum.total_rejected),
      total_amount_pending: number(sum.total_amount_pending),
      total_amount_success: number(sum.total_amount_success),
    };

    // Count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM payins p LEFT JOIN users u ON u.id = p.user_id ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch records
    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT
         p.*,
         COALESCE(u.username, CONCAT('User_', p.user_id)) AS username,
         u.u_id,
         u.mobile
       FROM payins p
       LEFT JOIN users u ON u.id = p.user_id
       ${whereClause}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map((r) => formatDeposit(r));

    return {
      summary,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      deposits: list,
      history: list,
      data: list,
    };
  }

  async getPendingDeposits(query = {}) {
    return this.getDeposits({ ...query, status: "pending" });
  }

  async getSuccessDeposits(query = {}) {
    return this.getDeposits({ ...query, status: "success" });
  }

  async getRejectDeposits(query = {}) {
    return this.getDeposits({ ...query, status: "reject" });
  }

  async updateDepositStatus(data = {}) {
    const pool = this.poolProvider();
    await ensurePayinsTable(pool);

    const targetId = Number(data.id ?? data.Id ?? data.paramsId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Valid deposit ID is required.");
    }

    const runner = pool.getConnection ? await pool.getConnection() : pool;
    let txActive = false;
    let isApprove = false;

    try {
      if (runner.beginTransaction) {
        await runner.beginTransaction();
        txActive = true;
      }

      const [existing] = await runner.execute(
        `SELECT
           p.*,
           COALESCE(u.username, CONCAT('User_', p.user_id)) AS username,
           u.u_id,
           u.mobile
         FROM payins p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.id = ? LIMIT 1 FOR UPDATE`,
        [targetId],
      );
      if (existing.length === 0) {
        throw new AppError(404, "DEPOSIT_NOT_FOUND", `Deposit with ID '${targetId}' not found`);
      }

      const cur = existing[0];
      const rawAction = String(data.action ?? data.status ?? "").toLowerCase().trim();
      isApprove = rawAction === "approve" || rawAction === "success" || rawAction === "2";
      const isReject = rawAction === "reject" || rawAction === "rejected" || rawAction === "3";

      if (!isApprove && !isReject) {
        throw new AppError(400, "VALIDATION_ERROR", "Status or action must be 'approve' / 'success' or 'reject'.");
      }

      if (Number(cur.status) !== 1) {
        throw new AppError(400, "TRANSACTION_ALREADY_FINALIZED", "Deposit has already been processed or finalized.");
      }

      if (isApprove) {
        await runner.execute(
          "UPDATE users SET wallet = wallet + ? WHERE id = ?",
          [Number(cur.cash), Number(cur.user_id)],
        );
        await runner.execute(
          "UPDATE payins SET status = 2, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [targetId],
        );
      } else if (isReject) {
        const rejectMsg = data.rejectmsg ? String(data.rejectmsg).trim() : (data.remark ? String(data.remark).trim() : "Rejected by admin");
        await runner.execute(
          "UPDATE payins SET status = 3, rejectmsg = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [rejectMsg, targetId],
        );
      }

      if (txActive) {
        await runner.commit();
        txActive = false;
      }
    } catch (err) {
      if (txActive) {
        try { await runner.rollback(); } catch (_) {}
      }
      throw err;
    } finally {
      if (runner.release) runner.release();
    }

    const [updatedRows] = await pool.execute(
      `SELECT
         p.*,
         COALESCE(u.username, CONCAT('User_', p.user_id)) AS username,
         u.u_id,
         u.mobile
       FROM payins p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = ? LIMIT 1`,
      [targetId],
    );

    const message = isApprove ? "Deposit approved successfully" : "Deposit rejected successfully";
    return {
      success: true,
      message,
      data: formatDeposit(updatedRows[0]),
    };
  }

  async getWithdrawals(query = {}) {
    const pool = this.poolProvider();
    await ensureWithdrawHistoriesTable(pool);

    const targetId = query.id ?? query.withdraw_id ?? query.Id ?? query.ID;
    if (targetId !== undefined && targetId !== null && String(targetId).trim() !== "") {
      const [rows] = await pool.execute(
        `SELECT
           w.*,
           COALESCE(u.username, CONCAT('User_', w.user_id)) AS username,
           u.u_id,
           u.mobile,
           COALESCE(a.name, '') AS bank_holder_name,
           COALESCE(a.bank_name, '') AS bank_name,
           COALESCE(a.account_number, '') AS account_number,
           COALESCE(a.ifsc_code, '') AS ifsc_code,
           COALESCE(w.upi_id, a.upi_id, '') AS upi_id
         FROM withdraw_histories w
         LEFT JOIN users u ON u.id = w.user_id
         LEFT JOIN account_details a ON a.id = w.account_id
         WHERE w.id = ? LIMIT 1`,
        [Number(targetId)],
      );
      if (rows.length === 0) {
        throw new AppError(404, "WITHDRAWAL_NOT_FOUND", `Withdrawal with ID '${targetId}' not found`);
      }
      return {
        withdrawal: formatWithdrawal(rows[0]),
        data: formatWithdrawal(rows[0]),
      };
    }

    const orderId = query.order_id ?? query.orderId;
    if (orderId && String(orderId).trim() !== "") {
      const [rows] = await pool.execute(
        `SELECT
           w.*,
           COALESCE(u.username, CONCAT('User_', w.user_id)) AS username,
           u.u_id,
           u.mobile,
           COALESCE(a.name, '') AS bank_holder_name,
           COALESCE(a.bank_name, '') AS bank_name,
           COALESCE(a.account_number, '') AS account_number,
           COALESCE(a.ifsc_code, '') AS ifsc_code,
           COALESCE(w.upi_id, a.upi_id, '') AS upi_id
         FROM withdraw_histories w
         LEFT JOIN users u ON u.id = w.user_id
         LEFT JOIN account_details a ON a.id = w.account_id
         WHERE w.order_id = ? LIMIT 1`,
        [String(orderId).trim()],
      );
      if (rows.length > 0) {
        return {
          withdrawal: formatWithdrawal(rows[0]),
          data: formatWithdrawal(rows[0]),
        };
      }
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = [];
    const params = [];

    // Filter by status / type
    const rawStatus = String(query.status ?? query.type ?? "").toLowerCase().trim();
    if (rawStatus === "pending" || rawStatus === "1") {
      conditions.push("w.status = 1");
    } else if (rawStatus === "approved" || rawStatus === "success" || rawStatus === "2") {
      conditions.push("w.status = 2");
    } else if (rawStatus === "reject" || rawStatus === "rejected" || rawStatus === "3") {
      conditions.push("(w.status = 3 OR w.status = 0 OR w.rejectmsg IS NOT NULL)");
    } else if (query.status !== undefined && query.status !== "all" && query.status !== "") {
      conditions.push("w.status = ?");
      params.push(Number(query.status));
    }

    // Filter by user_id
    const userId = query.user_id ?? query.userId;
    if (userId !== undefined && userId !== null && String(userId).trim() !== "") {
      conditions.push("w.user_id = ?");
      params.push(Number(userId));
    }

    // Filter by search
    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(w.order_id LIKE ? OR u.username LIKE ? OR u.mobile LIKE ? OR u.u_id LIKE ? OR a.name LIKE ? OR a.bank_name LIKE ? OR a.account_number LIKE ?)");
      params.push(s, s, s, s, s, s, s);
    }

    // Date range
    if (query.start_date) {
      conditions.push("w.created_at >= ?");
      params.push(query.start_date);
    }
    if (query.end_date) {
      conditions.push("w.created_at <= ?");
      params.push(query.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Summary counts
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_withdrawals,
         COUNT(CASE WHEN w.status = 1 THEN 1 END) AS total_pending,
         COUNT(CASE WHEN w.status = 2 THEN 1 END) AS total_approved,
         COUNT(CASE WHEN w.status = 3 OR w.status = 0 OR w.rejectmsg IS NOT NULL THEN 1 END) AS total_rejected,
         COALESCE(SUM(CASE WHEN w.status = 1 THEN w.amount ELSE 0 END), 0) AS total_amount_pending,
         COALESCE(SUM(CASE WHEN w.status = 2 THEN w.amount ELSE 0 END), 0) AS total_amount_approved
       FROM withdraw_histories w
       LEFT JOIN users u ON u.id = w.user_id
       LEFT JOIN account_details a ON a.id = w.account_id`,
    );

    const sum = summaryRows[0] ?? {};
    const summary = {
      total_withdrawals: number(sum.total_withdrawals),
      total_pending: number(sum.total_pending),
      total_approved: number(sum.total_approved),
      total_rejected: number(sum.total_rejected),
      total_amount_pending: number(sum.total_amount_pending),
      total_amount_approved: number(sum.total_amount_approved),
    };

    // Count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM withdraw_histories w
       LEFT JOIN users u ON u.id = w.user_id
       LEFT JOIN account_details a ON a.id = w.account_id
       ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch records
    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT
         w.*,
         COALESCE(u.username, CONCAT('User_', w.user_id)) AS username,
         u.u_id,
         u.mobile,
         COALESCE(a.name, '') AS bank_holder_name,
         COALESCE(a.bank_name, '') AS bank_name,
         COALESCE(a.account_number, '') AS account_number,
         COALESCE(a.ifsc_code, '') AS ifsc_code,
         COALESCE(w.upi_id, a.upi_id, '') AS upi_id
       FROM withdraw_histories w
       LEFT JOIN users u ON u.id = w.user_id
       LEFT JOIN account_details a ON a.id = w.account_id
       ${whereClause}
       ORDER BY w.id DESC
       LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map((r) => formatWithdrawal(r));

    return {
      summary,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      withdrawals: list,
      history: list,
      data: list,
    };
  }

  async getPendingWithdrawals(query = {}) {
    return this.getWithdrawals({ ...query, status: "pending" });
  }

  async getApprovedWithdrawals(query = {}) {
    return this.getWithdrawals({ ...query, status: "approved" });
  }

  async getRejectWithdrawals(query = {}) {
    return this.getWithdrawals({ ...query, status: "reject" });
  }

  async updateWithdrawalStatus(data = {}) {
    const pool = this.poolProvider();
    await ensureWithdrawHistoriesTable(pool);

    const targetId = Number(data.id ?? data.Id ?? data.paramsId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Valid withdrawal ID is required.");
    }

    const runner = pool.getConnection ? await pool.getConnection() : pool;
    let txActive = false;
    let isApprove = false;

    try {
      if (runner.beginTransaction) {
        await runner.beginTransaction();
        txActive = true;
      }

      const [existing] = await runner.execute(
        `SELECT
           w.*,
           COALESCE(u.username, CONCAT('User_', w.user_id)) AS username,
           u.u_id,
           u.mobile,
           COALESCE(a.name, '') AS bank_holder_name,
           COALESCE(a.bank_name, '') AS bank_name,
           COALESCE(a.account_number, '') AS account_number,
           COALESCE(a.ifsc_code, '') AS ifsc_code,
           COALESCE(w.upi_id, a.upi_id, '') AS upi_id
         FROM withdraw_histories w
         LEFT JOIN users u ON u.id = w.user_id
         LEFT JOIN account_details a ON a.id = w.account_id
         WHERE w.id = ? LIMIT 1 FOR UPDATE`,
        [targetId],
      );
      if (existing.length === 0) {
        throw new AppError(404, "WITHDRAWAL_NOT_FOUND", `Withdrawal with ID '${targetId}' not found`);
      }

      const cur = existing[0];
      const rawAction = String(data.action ?? data.status ?? "").toLowerCase().trim();
      isApprove = rawAction === "approve" || rawAction === "approved" || rawAction === "success" || rawAction === "2";
      const isReject = rawAction === "reject" || rawAction === "rejected" || rawAction === "3";

      if (!isApprove && !isReject) {
        throw new AppError(400, "VALIDATION_ERROR", "Status or action must be 'approve' / 'approved' or 'reject'.");
      }

      if (Number(cur.status) !== 1) {
        throw new AppError(400, "TRANSACTION_ALREADY_FINALIZED", "Withdrawal has already been processed or finalized.");
      }

      if (isApprove) {
        await runner.execute(
          "UPDATE withdraw_histories SET status = 2, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [targetId],
        );
      } else if (isReject) {
        const rejectMsg = data.rejectmsg ? String(data.rejectmsg).trim() : (data.msg ? String(data.msg).trim() : (data.remark ? String(data.remark).trim() : "Rejected by admin"));
        await runner.execute(
          "UPDATE users SET winning_wallet = winning_wallet + ? WHERE id = ?",
          [Number(cur.amount), Number(cur.user_id)],
        );
        await runner.execute(
          "UPDATE withdraw_histories SET status = 3, rejectmsg = ?, remark = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [rejectMsg, rejectMsg, targetId],
        );
      }

      if (txActive) {
        await runner.commit();
        txActive = false;
      }
    } catch (err) {
      if (txActive) {
        try { await runner.rollback(); } catch (_) {}
      }
      throw err;
    } finally {
      if (runner.release) runner.release();
    }

    const [updatedRows] = await pool.execute(
      `SELECT
         w.*,
         COALESCE(u.username, CONCAT('User_', w.user_id)) AS username,
         u.u_id,
         u.mobile,
         COALESCE(a.name, '') AS bank_holder_name,
         COALESCE(a.bank_name, '') AS bank_name,
         COALESCE(a.account_number, '') AS account_number,
         COALESCE(a.ifsc_code, '') AS ifsc_code,
         COALESCE(w.upi_id, a.upi_id, '') AS upi_id
       FROM withdraw_histories w
       LEFT JOIN users u ON u.id = w.user_id
       LEFT JOIN account_details a ON a.id = w.account_id
       WHERE w.id = ? LIMIT 1`,
      [targetId],
    );

    const message = isApprove ? "Withdrawal approved successfully" : "Withdrawal rejected successfully";
    return {
      success: true,
      message,
      data: formatWithdrawal(updatedRows[0]),
    };
  }

  async getSupportSettings(query = {}) {
    const pool = this.poolProvider();
    await ensureSupportSettingTable(pool);

    const targetId = query.id ?? query.support_id ?? query.Id ?? query.ID;
    if (targetId !== undefined && targetId !== null && String(targetId).trim() !== "") {
      const [rows] = await pool.execute(
        "SELECT * FROM support_setting WHERE id = ? LIMIT 1",
        [Number(targetId)],
      );
      if (rows.length === 0) {
        throw new AppError(404, "SUPPORT_SETTING_NOT_FOUND", `Support setting with ID '${targetId}' not found`);
      }
      return {
        support_setting: formatSupportSetting(rows[0]),
        data: formatSupportSetting(rows[0]),
      };
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    let offset = 0;
    let page = 1;

    if (query.offset !== undefined) {
      offset = Math.max(0, parseInt(query.offset, 10) || 0);
      page = Math.floor(offset / limit) + 1;
    } else if (query.page !== undefined) {
      page = Math.max(1, parseInt(query.page, 10) || 1);
      offset = (page - 1) * limit;
    }

    const conditions = ["status != -1"];
    const params = [];

    if (query.status !== undefined && query.status !== "all" && query.status !== "") {
      if (query.status === "deleted") {
        conditions[0] = "status = -1";
      } else {
        conditions.push("status = ?");
        params.push(Number(query.status));
      }
    }

    if (query.search && String(query.search).trim() !== "") {
      const s = `%${String(query.search).trim()}%`;
      conditions.push("(name LIKE ? OR socialmedia LIKE ?)");
      params.push(s, s);
    }

    const whereClause = conditions.join(" AND ");

    // Summary counts
    const [summaryRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_support,
         COUNT(CASE WHEN status = 1 THEN 1 END) AS active_support,
         COUNT(CASE WHEN status = 0 THEN 1 END) AS inactive_support
       FROM support_setting
       WHERE status != -1`,
    );

    const sum = summaryRows[0] ?? {};
    const summary = {
      total_support: number(sum.total_support),
      active_support: number(sum.active_support),
      inactive_support: number(sum.inactive_support),
    };

    // Count for pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM support_setting WHERE ${whereClause}`,
      params,
    );
    const total = number(countRows[0]?.total);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch records
    const listParams = [...params, limit, offset];
    const [rows] = await pool.execute(
      `SELECT * FROM support_setting WHERE ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`,
      listParams,
    );

    const list = rows.map((r) => formatSupportSetting(r));

    return {
      summary,
      pagination: {
        total,
        limit,
        offset,
        page,
        totalPages,
      },
      support_settings: list,
      data: list,
    };
  }

  async saveSupportSetting(data = {}) {
    const pool = this.poolProvider();
    await ensureSupportSettingTable(pool);

    const targetId = Number(data.id ?? data.Id ?? data.paramsId);
    const isDeleteAction =
      data.action === "delete" ||
      data.is_deleted === true ||
      data.delete === true ||
      String(data.status).toLowerCase() === "delete" ||
      String(data.status).toLowerCase() === "deleted" ||
      Number(data.status) === -1;

    // 1. DELETE
    if (isDeleteAction) {
      if (!Number.isInteger(targetId) || targetId <= 0) {
        throw new AppError(400, "VALIDATION_ERROR", "Valid support setting ID is required to delete.");
      }

      const [existing] = await pool.execute(
        "SELECT * FROM support_setting WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existing.length === 0) {
        throw new AppError(404, "SUPPORT_SETTING_NOT_FOUND", `Support setting with ID '${targetId}' not found`);
      }

      await pool.execute(
        "UPDATE support_setting SET status = -1 WHERE id = ?",
        [targetId],
      );

      return {
        success: true,
        message: "Support setting deleted successfully",
        data: { id: targetId, status: -1, status_label: "Deleted" },
      };
    }

    // 2. EDIT / UPDATE
    if (Number.isInteger(targetId) && targetId > 0) {
      const [existingRows] = await pool.execute(
        "SELECT * FROM support_setting WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (existingRows.length === 0) {
        throw new AppError(404, "SUPPORT_SETTING_NOT_FOUND", `Support setting with ID '${targetId}' not found`);
      }

      const cur = existingRows[0];
      const name = (data.name ?? data.Name) !== undefined
        ? String(data.name ?? data.Name).trim()
        : cur.name;
      const socialMedia = (data.socialmedia ?? data.social_media ?? data["Social Media"] ?? data.link ?? data.url) !== undefined
        ? String(data.socialmedia ?? data.social_media ?? data["Social Media"] ?? data.link ?? data.url).trim()
        : cur.socialmedia;
      const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : Number(cur.status);

      if (!name) {
        throw new AppError(400, "VALIDATION_ERROR", "Support name is required.");
      }

      await pool.execute(
        `UPDATE support_setting
         SET name = ?, socialmedia = ?, status = ?
         WHERE id = ?`,
        [name, socialMedia, status, targetId],
      );

      const [updatedRows] = await pool.execute(
        "SELECT * FROM support_setting WHERE id = ? LIMIT 1",
        [targetId],
      );

      return {
        success: true,
        message: "Support setting updated successfully",
        data: formatSupportSetting(updatedRows[0]),
      };
    }

    // 3. ADD / CREATE
    const name = data.name ? String(data.name).trim() : (data.Name ? String(data.Name).trim() : "");
    const socialMedia = data.socialmedia
      ? String(data.socialmedia).trim()
      : (data.social_media
          ? String(data.social_media).trim()
          : (data["Social Media"]
              ? String(data["Social Media"]).trim()
              : (data.link ? String(data.link).trim() : (data.url ? String(data.url).trim() : ""))));
    const status = data.status !== undefined ? (Number(data.status) === 1 ? 1 : 0) : 1;

    if (!name) {
      throw new AppError(400, "VALIDATION_ERROR", "Support name is required.");
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO support_setting (
         name, socialmedia, status, datetime
       ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [name, socialMedia, status],
    );

    const [newRow] = await pool.execute(
      "SELECT * FROM support_setting WHERE id = ? LIMIT 1",
      [insertResult.insertId],
    );

    return {
      success: true,
      message: "Support setting added successfully",
      data: formatSupportSetting(newRow[0]),
    };
  }

  async getAviatorTelemetry(query = {}) {
    const pool = this.poolProvider();
    const limit = Math.min(Math.max(1, Number(query.limit) || 25), 100);
    const page = Math.max(1, Number(query.page) || 1);
    const offset = (page - 1) * limit;

    // 1. Determine target round / period number
    let latestRoundNum = 1134592;
    try {
      const [latestResultRows] = await pool.execute(
        `SELECT id, game_sr_num, price, datetime
         FROM aviator_result
         WHERE status = 1
         ORDER BY id DESC
         LIMIT 1`
      );
      if (latestResultRows && latestResultRows[0]) {
        latestRoundNum = Number(latestResultRows[0].game_sr_num) || 1134592;
      }
    } catch {
      // Fallback
    }

    let targetRound = query.period_no
      ? Number(query.period_no)
      : (query.round ? Number(query.round) : (query.period ? Number(query.period) : null));

    if (!targetRound) {
      try {
        const [latestBet] = await pool.execute(
          `SELECT game_sr_num FROM aviator_bet ORDER BY id DESC LIMIT 1`
        );
        if (latestBet && latestBet[0]?.game_sr_num) {
          targetRound = Number(latestBet[0].game_sr_num);
        }
      } catch {
        // Fallback
      }
    }
    const currentRound = targetRound || (latestRoundNum + 1);

    // 2. Per-round Total Bet and Total Cashout for this specific game round (NOT all-time cumulative)
    let roundTotalBet = 0;
    let roundTotalBetCount = 0;
    let roundTotalCashout = 0;
    let roundTotalCashoutCount = 0;

    try {
      const [roundStatsRows] = await pool.execute(
        `SELECT
           COALESCE(SUM(amount), 0) AS total_bet,
           COUNT(*) AS total_bet_count,
           COALESCE(SUM(win), 0) AS total_cashout,
           COALESCE(SUM(CASE WHEN win > 0 THEN 1 ELSE 0 END), 0) AS total_cashout_count
         FROM aviator_bet
         WHERE game_sr_num = ?`,
        [String(currentRound)]
      );
      if (roundStatsRows && roundStatsRows[0]) {
        roundTotalBet = Number(roundStatsRows[0].total_bet) || 0;
        roundTotalBetCount = Number(roundStatsRows[0].total_bet_count) || 0;
        roundTotalCashout = Number(roundStatsRows[0].total_cashout) || 0;
        roundTotalCashoutCount = Number(roundStatsRows[0].total_cashout_count) || 0;
      }
    } catch {
      // Fallback
    }

    // All-time totals for audit/reference
    let allTimeBet = 0;
    let allTimeCashout = 0;
    try {
      const [allStats] = await pool.execute(
        `SELECT COALESCE(SUM(amount), 0) AS all_bet, COALESCE(SUM(win), 0) AS all_cashout FROM aviator_bet`
      );
      if (allStats && allStats[0]) {
        allTimeBet = Number(allStats[0].all_bet) || 0;
        allTimeCashout = Number(allStats[0].all_cashout) || 0;
      }
    } catch {
      // Fallback
    }

    const periodNo = currentRound;

    // 3. Players online / playing
    let activeBettors = 0;
    let totalActiveUsers = 0;
    try {
      const [userCountRows] = await pool.execute(
        `SELECT
           COALESCE((SELECT COUNT(DISTINCT uid) FROM aviator_bet WHERE created_at >= NOW() - INTERVAL 1 HOUR), 0) AS active_bettors,
           COALESCE((SELECT COUNT(*) FROM users WHERE status = 1), 0) AS total_active_users`
      );
      if (userCountRows && userCountRows[0]) {
        activeBettors = Number(userCountRows[0].active_bettors) || 0;
        totalActiveUsers = Number(userCountRows[0].total_active_users) || 0;
      }
    } catch {
      // Fallback
    }

    const playersOnline = activeBettors > 0
      ? activeBettors
      : Math.min(Math.max(18, Math.floor(totalActiveUsers * 0.4)), 95);

    // 4. Drop History (recent crashes)
    let totalDrops = 0;
    let dropRows = [];
    try {
      const [totalDropsRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM aviator_result WHERE status = 1`
      );
      totalDrops = Number(totalDropsRows[0]?.total) || 0;

      const [rows] = await pool.execute(
        `SELECT ar.id,
                ar.game_sr_num AS round,
                ar.price AS n,
                ar.datetime AS at,
                COALESCE((SELECT SUM(ab.amount) FROM aviator_bet ab WHERE ab.game_sr_num = ar.game_sr_num), 0) AS bet_pool
         FROM aviator_result ar
         WHERE ar.status = 1
         ORDER BY ar.id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      dropRows = rows || [];
    } catch {
      // Fallback
    }

    const dropHistory = dropRows.map(formatAviatorDrop);

    return {
      total_bet: roundTotalBet,
      totalBet: roundTotalBet,
      total_bet_formatted: `₹${roundTotalBet.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      total_bet_count: roundTotalBetCount,

      total_cashout: roundTotalCashout,
      totalCashout: roundTotalCashout,
      total_cashout_formatted: `₹${roundTotalCashout.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      total_cashout_count: roundTotalCashoutCount,

      round_total_bet: roundTotalBet,
      round_total_cashout: roundTotalCashout,
      all_time_total_bet: allTimeBet,
      all_time_total_cashout: allTimeCashout,

      period_no: periodNo,
      periodNo,
      period_label: `#${periodNo}`,

      players_online: playersOnline,
      playersOnline,
      total_players: playersOnline,
      users_playing: playersOnline,

      drop_history: dropHistory,
      dropHistory,
      drops: dropHistory,

      pagination: {
        page,
        limit,
        total: totalDrops,
        totalPages: Math.max(1, Math.ceil(totalDrops / limit)),
      },
    };
  }
}

function formatAviatorDrop(row) {
  const n = Number(row.n ?? row.price ?? 1);
  const round = row.round ?? row.game_sr_num ?? row.period ?? row.id;
  const hash = row.hash || crypto.createHash("sha256").update(`${round}:${n}:${row.id}`).digest("hex");
  const rawPool = Number(row.bet_pool ?? row.pool ?? 0);
  const pool = rawPool > 0 ? rawPool : Math.floor(25000 + ((Number(row.id || 1) * 37) % 45000));

  let formattedAt = "Just now";
  if (row.at || row.datetime || row.created_at) {
    const d = new Date(row.at || row.datetime || row.created_at);
    if (!isNaN(d.getTime())) {
      formattedAt = d.toISOString().replace("T", " ").slice(0, 19);
    }
  }

  return {
    id: Number(row.id),
    round: Number(round),
    crash: `${n.toFixed(2)}x`,
    n: Number(n.toFixed(2)),
    pool,
    hash,
    at: formattedAt,
  };
}

module.exports = {
  AdminService,
  DAYS_BY_PERIOD,
  VALID_FUND_TRANSFER_TYPES,
  buildCounts,
  calculateVipTier,
  dateSeries,
  formatAttendance,
  formatAviatorDrop,
  formatBanner,
  formatDeposit,
  formatFundTransfer,
  formatGift,
  formatKycStatus,
  formatLoginRecord,
  formatOffer,
  formatPaymentLimit,
  formatPlayer,
  formatSalaryRecord,
  formatSupportSetting,
  formatVipLevel,
  formatWithdrawal,
  generate15DigitGiftCode,
  localDateString,
  metric,
  normalizeTransferType,
  randomCharacters,
};
