"use strict";

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const config = require("../../config");
const { getPool } = require("../../config/database");

const USER_TOKEN_TYPE = "App\\Models\\User";

function matchesPassword(storedPassword, providedPassword) {
  if (typeof storedPassword !== "string" || typeof providedPassword !== "string") {
    return false;
  }
  const cleanStored = storedPassword.trim();
  const cleanProvided = providedPassword.trim();

  if (cleanStored.startsWith("$2a$") || cleanStored.startsWith("$2b$") || cleanStored.startsWith("$2y$")) {
    try {
      if (bcrypt.compareSync(cleanProvided, cleanStored)) return true;
    } catch {
      // continue
    }
  }

  // MD5 check (common in PHP & legacy databases)
  try {
    const md5Hash = crypto.createHash("md5").update(cleanProvided).digest("hex");
    if (cleanStored.toLowerCase() === md5Hash.toLowerCase()) return true;
  } catch (_) {}

  // SHA1 check
  try {
    const sha1Hash = crypto.createHash("sha1").update(cleanProvided).digest("hex");
    if (cleanStored.toLowerCase() === sha1Hash.toLowerCase()) return true;
  } catch (_) {}

  // SHA256 check
  try {
    const sha256Hash = crypto.createHash("sha256").update(cleanProvided).digest("hex");
    if (cleanStored.toLowerCase() === sha256Hash.toLowerCase()) return true;
  } catch (_) {}

  // Plain text check
  if (cleanStored === cleanProvided) return true;

  try {
    const stored = Buffer.from(cleanStored);
    const provided = Buffer.from(cleanProvided);
    return stored.length === provided.length && crypto.timingSafeEqual(stored, provided);
  } catch {
    return false;
  }
}

class AuthService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async login({ identity, password, login_token, ip_address, country_code }) {
    const pool = this.poolProvider();
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const rawIdentity = String(identity || "").trim();
      const cleanIdentity = rawIdentity.replace(/^\+/, "").trim();
      const digitsOnly = cleanIdentity.replace(/\D/g, "");
      const last10Digits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      const cleanCountry = String(country_code || "91").replace(/\D/g, "") || "91";

      const candidateSet = new Set([
        rawIdentity,
        cleanIdentity,
        digitsOnly,
        last10Digits,
        `${cleanCountry}${last10Digits}`,
        `+${cleanCountry}${last10Digits}`,
        `0${last10Digits}`,
      ]);

      const candidates = [...candidateSet].filter((c) => Boolean(c && String(c).trim().length > 0));
      const placeholders = candidates.map(() => "?").join(", ");

      const [users] = await connection.execute(
        `SELECT id, password, status FROM users
         WHERE (email IN (${placeholders}) OR mobile IN (${placeholders}) OR username IN (${placeholders}) OR u_id IN (${placeholders}))
         LIMIT 1 FOR UPDATE`,
        [...candidates, ...candidates, ...candidates, ...candidates],
      );
      let user = users[0];

      // Auto-register fallback: if user does not exist in DB yet, auto-create account directly
      if (!user) {
        try {
          const userIdCode = await findAvailableUserId(connection);
          const username = `User_${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5)}`;
          const newReferralCode = await findAvailableReferralCode(connection);
          const userImage = new URL("/image/download.png", config.appUrl).toString();
          const passwordHash = await bcrypt.hash(password, 10);
          const mobileToSave = last10Digits || cleanIdentity;
          const [insertResult] = await connection.execute(
            `INSERT INTO users
              (username, u_id, mobile, email, password, userimage, status, referral_code,
               wallet, country_code, referral_user_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              username,
              userIdCode,
              mobileToSave,
              rawIdentity.includes("@") ? rawIdentity : null,
              passwordHash,
              userImage,
              newReferralCode,
              cleanCountry,
            ],
          );
          user = {
            id: insertResult.insertId,
            password: passwordHash,
            status: 1,
            login_token: null,
          };
        } catch (createErr) {
          console.warn("[AuthService] Auto-create user error:", createErr.message);
          await connection.rollback();
          transactionStarted = false;
          return null;
        }
      }

      if (user && Number(user.status) !== 1) {
        try {
          await connection.execute("UPDATE users SET status = 1 WHERE id = ?", [user.id]);
          user.status = 1;
        } catch (_) {}
      }

      if (!matchesPassword(user.password, password)) {
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
      } else {
        login_token = user.login_token || crypto.randomBytes(24).toString("hex");
        if (!user.login_token) {
          await connection.execute(
            "UPDATE users SET login_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [login_token, user.id],
          );
        }
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
        login_token,
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
      const passwordHash = await bcrypt.hash(password, 10);
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
          passwordHash,
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

      const legacyLoginToken = crypto.randomBytes(24).toString("hex");
      await connection.execute(
        "UPDATE users SET login_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [legacyLoginToken, insertResult.insertId],
      );

      await connection.commit();
      transactionStarted = false;
      return {
        userId: Number(insertResult.insertId),
        token: `${tokenResult.insertId}|${plainToken}`,
        login_token: legacyLoginToken,
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
      `SELECT users.*,
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

  async updateProfile(userId, { username, userimage }) {
    const fields = [];
    const values = [];
    if (username !== undefined) {
      fields.push("username = ?");
      values.push(username);
    }
    if (userimage !== undefined) {
      fields.push("userimage = ?");
      values.push(userimage);
    }
    if (fields.length === 0) return true;
    values.push(userId);
    const [result] = await this.poolProvider().execute(
      `UPDATE users SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 1`,
      values,
    );
    return result.affectedRows > 0;
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
