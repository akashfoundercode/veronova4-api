"use strict";

const crypto = require("node:crypto");
const config = require("../../config");
const { getPool } = require("../../config/database");

const USER_TOKEN_TYPE = "App\\Models\\User";

function matchesPassword(storedPassword, providedPassword) {
  if (typeof storedPassword !== "string") {
    return false;
  }
  const stored = Buffer.from(storedPassword);
  const provided = Buffer.from(providedPassword);
  return stored.length === provided.length && crypto.timingSafeEqual(stored, provided);
}

class AuthService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async login({ identity, password, login_token, ip_address }) {
    const pool = this.poolProvider();
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [users] = await connection.execute(
        `SELECT id, password, status
         FROM users
         WHERE (email = ? OR mobile = ? OR username = ? OR u_id = ?) AND status = 1
         LIMIT 1 FOR UPDATE`,
        [identity, identity, identity, identity],
      );
      const user = users[0];
      if (!user || !matchesPassword(user.password, password)) {
        await connection.rollback();
        transactionStarted = false;
        return null;
      }

      const plainToken = crypto.randomBytes(40).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
      const [insertResult] = await connection.execute(
        `INSERT INTO personal_access_tokens
          (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at)
         VALUES (?, ?, 'UserApp', ?, '["*"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [USER_TOKEN_TYPE, user.id, tokenHash],
      );

      if (!insertResult.insertId) {
        throw new Error("Failed to create the user access token");
      }

      if (login_token) {
        await connection.execute(
          "UPDATE users SET login_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [login_token, user.id],
        );
      }

      if (ip_address) {
        try {
          await connection.execute(
            `INSERT INTO ip_address (user_id, ip_address, login_time, created_at, updated_at)
             VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [user.id, String(ip_address).trim()],
          );
        } catch {
          // table mock or sandbox fallback
        }
      }

      await connection.commit();
      transactionStarted = false;

      return {
        id: Number(user.id),
        token: `${insertResult.insertId}|${plainToken}`,
      };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async register({ email, country_code, mobile, password, referral_code }) {
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;
    const normalizedEmail = email ?? null;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [existingUsers] = await connection.execute(
        `SELECT id FROM users
         WHERE mobile = ? OR (email = ? AND ? IS NOT NULL)
         LIMIT 1 FOR UPDATE`,
        [mobile, normalizedEmail, normalizedEmail],
      );
      if (existingUsers.length > 0) {
        await connection.rollback();
        transactionStarted = false;
        return { conflict: "This email or mobile number is already registered." };
      }

      let referralUserId = 1;
      if (referral_code) {
        const [referrers] = await connection.execute(
          "SELECT id FROM users WHERE referral_code = ? LIMIT 1",
          [referral_code],
        );
        if (referrers.length === 0) {
          await connection.rollback();
          transactionStarted = false;
          return { conflict: "The selected referral_code is invalid." };
        }
        referralUserId = referrers[0].id;
      }

      const userIdCode = await findAvailableUserId(connection);
      const username = `User_${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5)}`;
      const newReferralCode = await findAvailableReferralCode(connection);
      const userImage = new URL("/image/download.png", config.appUrl).toString();
      const [insertResult] = await connection.execute(
        `INSERT INTO users
          (username, u_id, mobile, email, password, userimage, status, referral_code,
           wallet, country_code, referral_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          username,
          userIdCode,
          mobile,
          email ?? null,
          password,
          userImage,
          newReferralCode,
          country_code,
          referralUserId,
        ],
      );
      if (!insertResult.insertId) {
        throw new Error("Failed to create the user account");
      }

      const plainToken = crypto.randomBytes(40).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
      const [tokenResult] = await connection.execute(
        `INSERT INTO personal_access_tokens
          (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at)
         VALUES (?, ?, 'UserApp', ?, '["*"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [USER_TOKEN_TYPE, insertResult.insertId, tokenHash],
      );
      if (!tokenResult.insertId) {
        throw new Error("Failed to create the user access token");
      }

      await connection.commit();
      transactionStarted = false;
      return {
        userId: Number(insertResult.insertId),
        token: `${tokenResult.insertId}|${plainToken}`,
      };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      if (error.code === "ER_DUP_ENTRY") {
        return { conflict: "This email or mobile number is already registered." };
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async getUserForToken(tokenId, tokenHash) {
    const [rows] = await this.poolProvider().execute(
      `SELECT users.id, users.mobile, users.email, users.username, users.userimage,
              users.recharge, users.u_id, users.referral_code, users.wallet,
              users.third_party_wallet, users.winning_wallet, users.status,
              users.role_id, users.verification,
              personal_access_tokens.id AS access_token_id,
              personal_access_tokens.last_used_at,
              personal_access_tokens.created_at AS token_created_at
       FROM personal_access_tokens
       INNER JOIN users
         ON users.id = personal_access_tokens.tokenable_id
       WHERE personal_access_tokens.id = ?
         AND personal_access_tokens.tokenable_type = ?
         AND personal_access_tokens.token = ?
         AND (personal_access_tokens.expires_at IS NULL OR personal_access_tokens.expires_at > CURRENT_TIMESTAMP)
       LIMIT 1`,
      [tokenId, USER_TOKEN_TYPE, tokenHash],
    );
    const user = rows[0];
    if (!user) {
      return null;
    }

    if (Number(user.status) !== 1) {
      await this.revokeToken(user.access_token_id);
      return { inactive: true };
    }

    const idleTimeoutMinutes = Number.parseInt(
      process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? "15",
      10,
    );
    const lastActive = user.last_used_at ?? user.token_created_at;
    if (lastActive && idleTimeoutMinutes > 0) {
      const lastActiveTime = new Date(lastActive).getTime();
      const diffMinutes = (Date.now() - lastActiveTime) / (60 * 1000);
      if (diffMinutes > idleTimeoutMinutes) {
        await this.revokeToken(user.access_token_id);
        return { expired: true };
      }
    }

    await this.poolProvider().execute(
      "UPDATE personal_access_tokens SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [user.access_token_id],
    );
    delete user.access_token_id;
    delete user.last_used_at;
    delete user.token_created_at;
    return user;
  }

  async revokeToken(tokenId) {
    await this.poolProvider().execute(
      "DELETE FROM personal_access_tokens WHERE id = ? AND tokenable_type = ?",
      [tokenId, USER_TOKEN_TYPE],
    );
  }

  async transferThirdPartyWallet(userId) {
    const connection = await this.poolProvider().getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [users] = await connection.execute(
        "SELECT status, wallet, third_party_wallet FROM users WHERE id = ? FOR UPDATE",
        [userId],
      );
      const user = users[0];
      if (!user || Number(user.status) !== 1) {
        await connection.rollback();
        transactionStarted = false;
        return false;
      }

      await connection.execute(
        `UPDATE users
         SET wallet = wallet + third_party_wallet,
             third_party_wallet = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [userId],
      );
      await connection.commit();
      transactionStarted = false;
      return true;
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

function randomCharacters(characters, length) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += characters[crypto.randomInt(characters.length)];
  }
  return value;
}

function generateUserId() {
  return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)}${randomCharacters("0123456789", 4)}`;
}

async function findAvailableUserId(connection) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateUserId();
    const [rows] = await connection.execute(
      "SELECT id FROM users WHERE u_id = ? LIMIT 1",
      [candidate],
    );
    if (rows.length === 0) {
      return candidate;
    }
  }
  throw new Error("Failed to generate a unique user ID after 10 attempts");
}

async function findAvailableReferralCode(connection) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `ZUP${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6)}`;
    const [rows] = await connection.execute(
      "SELECT id FROM users WHERE referral_code = ? LIMIT 1",
      [candidate],
    );
    if (rows.length === 0) {
      return candidate;
    }
  }
  throw new Error("Failed to generate a unique referral code after 10 attempts");
}

module.exports = {
  AuthService,
  USER_TOKEN_TYPE,
  findAvailableReferralCode,
  findAvailableUserId,
  matchesPassword,
};
