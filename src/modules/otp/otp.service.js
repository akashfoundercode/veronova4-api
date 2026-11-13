"use strict";

const config = require("../../config");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

// In-memory store for fallback / sandboxed tests
const inMemoryOtps = new Map();

function cleanMobile(input) {
  if (!input) return "";
  const str = String(input).trim();
  const digits = str.replace(/\D/g, "");
  // Take the last 10 digits if country code (e.g. 91) was prefixed
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function generateRandomOtp(digits = 6) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

class OtpService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async getDbConnection() {
    try {
      const pool = this.poolProvider();
      return await pool.getConnection();
    } catch (_) {
      return null;
    }
  }

  /**
   * Send OTP via IndoPay Provider
   */
  async sendOtp({ mobile, mobile_no, phone, digit, type = "verification" }) {
    const rawMobile = mobile || mobile_no || phone;
    const normalizedMobile = cleanMobile(rawMobile);

    if (!normalizedMobile || !/^\d{10}$/.test(normalizedMobile)) {
      throw new AppError(400, "VALIDATION_ERROR", "Please provide a valid 10-digit mobile number.");
    }

    const otpType = String(type || "verification").trim().toLowerCase();
    if (otpType === "login") {
      const conn = await this.getDbConnection();
      if (!conn) {
        throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to verify the account right now. Please try again.");
      }
      try {
        const [users] = await conn.execute(
          "SELECT id FROM users WHERE (mobile = ? OR mobile = ?) AND status = 1 LIMIT 1",
          [normalizedMobile, `+91${normalizedMobile}`],
        );
        if (!users || users.length === 0) {
          throw new AppError(404, "ACCOUNT_NOT_FOUND", "This mobile number is not registered. Please register first.");
        }
      } finally {
        conn.release();
      }
    }

    const otpDigits = Number(digit) === 4 ? 4 : (Number(digit) === 6 ? 6 : (config.otp.digits || 6));
    const merchantKey = config.otp.merchantKey;
    const baseUrl = config.otp.baseUrl;
    const expiryMinutes = config.otp.expiryMinutes || 5;
    const configuredMode = (config.otp.mode || "live").trim().toLowerCase();
    const isLive = configuredMode === "live";

    if (!merchantKey) {
      throw new AppError(500, "CONFIG_ERROR", "OTP merchant key is not configured in .env");
    }

    const providerUrl = `${baseUrl}/newsend_otp.php?merchant_key=${encodeURIComponent(merchantKey)}&mobile_no=${encodeURIComponent(normalizedMobile)}&digit=${otpDigits}`;

    let providerResponse = null;
    let providerError = null;

    try {
      const res = await fetch(providerUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      providerResponse = await res.json();
    } catch (err) {
      providerError = err;
      console.warn("[OtpService] ⚠️ Provider request warning:", err.message);
    }

    let generatedOtp = null;
    let remainingSms = null;

    // 1. Process response from IndoPay
    if (providerResponse) {
      if (providerResponse.status === "success" || String(providerResponse.error) === "200") {
        remainingSms = providerResponse.remaining !== undefined ? providerResponse.remaining : null;
        const providerOtp = providerResponse.otp ? String(providerResponse.otp).trim() : null;
        const isDummyStatic = providerOtp === "1111" || providerOtp === "111111" || providerResponse.mode === "test";

        if (isLive) {
          // LIVE MODE:
          // If provider returns a real live random OTP (and not dummy 1111), use it!
          // If provider returned dummy static 1111 (due to test flag on IndoPay server),
          // generate a real dynamic random OTP so database NEVER stores static 1111!
          if (providerOtp && !isDummyStatic && providerResponse.mode === "live") {
            generatedOtp = providerOtp;
          } else {
            generatedOtp = generateRandomOtp(otpDigits);
          }
        } else {
          // TEST MODE: allow static test OTP
          generatedOtp = providerOtp || (otpDigits === 4 ? "1111" : "111111");
        }
      } else {
        const errorMsg = providerResponse.msg || providerResponse.message || "Failed to send OTP.";
        const errorCode = Number(providerResponse.error) || 400;
        throw new AppError(errorCode >= 400 && errorCode < 600 ? errorCode : 400, "PROVIDER_ERROR", errorMsg);
      }
    }

    // 2. Fallback if provider could not be reached (offline/sandbox/network issue)
    if (!generatedOtp) {
      if (isLive || providerError) {
        throw new AppError(503, "OTP_PROVIDER_UNAVAILABLE", "Could not send OTP. Please try again later.");
      } else {
        generatedOtp = otpDigits === 4 ? "1111" : "111111";
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

    // Save OTP to DB
    const conn = await this.getDbConnection();
    if (conn) {
      try {
        // Invalidate earlier active OTPs for this number
        await conn.execute(
          "UPDATE otps SET status = 2 WHERE mobile = ? AND status = 0",
          [normalizedMobile]
        );

        // Insert new OTP record
        await conn.execute(
          `INSERT INTO otps 
           (mobile, otp, digit, type, status, response_meta, expires_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, ?, ?, NOW(), NOW())`,
          [
            normalizedMobile,
            generatedOtp,
            otpDigits,
            otpType,
            providerResponse ? JSON.stringify(providerResponse) : null,
            expiresAt,
          ]
        );

        // Also update users table if user exists (legacy compatibility)
        try {
          await conn.execute(
            `UPDATE users 
             SET otp = ?, otp_expire_at = ?, is_otp_verified = 0 
             WHERE mobile = ? OR mobile = ?`,
            [generatedOtp, expiresAt, normalizedMobile, `+91${normalizedMobile}`]
          );
        } catch (_) {}
      } catch (dbErr) {
        console.warn("[OtpService] DB save warning, falling back to memory:", dbErr.message);
      } finally {
        conn.release();
      }
    }

    // Always maintain in-memory record for resilience
    inMemoryOtps.set(normalizedMobile, {
      mobile: normalizedMobile,
      otp: generatedOtp,
      digit: otpDigits,
      type: otpType,
      status: 0,
      expiresAt: expiresAt.getTime(),
      createdAt: now.getTime(),
    });

    return {
      status: 200,
      success: true,
      message: "OTP sent successfully",
      data: {
        mobile: normalizedMobile,
        digit: otpDigits,
        mode: configuredMode,
        expires_in_seconds: expiryMinutes * 60,
        ...(process.env.NODE_ENV === "test" ? { debug_otp: generatedOtp } : {}),
      },
    };
  }

  /**
   * Verify OTP
   */
  async verifyOtp({ mobile, mobile_no, phone, otp, code, type }) {
    const rawMobile = mobile || mobile_no || phone;
    const normalizedMobile = cleanMobile(rawMobile);
    const candidateOtp = String(otp || code || "").trim();

    if (!normalizedMobile || !/^\d{10}$/.test(normalizedMobile)) {
      throw new AppError(400, "VALIDATION_ERROR", "Please provide a valid 10-digit mobile number.");
    }
    if (!candidateOtp) {
      throw new AppError(400, "VALIDATION_ERROR", "Please enter the OTP.");
    }

    if (String(type || "").trim().toLowerCase() === "login") {
      const accountConn = await this.getDbConnection();
      if (!accountConn) {
        throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to verify the account right now. Please try again.");
      }
      try {
        const [users] = await accountConn.execute(
          "SELECT id FROM users WHERE (mobile = ? OR mobile = ?) AND status = 1 LIMIT 1",
          [normalizedMobile, `+91${normalizedMobile}`],
        );
        if (!users || users.length === 0) {
          throw new AppError(404, "ACCOUNT_NOT_FOUND", "This mobile number is not registered. Please register first.");
        }
      } finally {
        accountConn.release();
      }
    }

    const conn = await this.getDbConnection();
    let otpRecord = null;

    if (conn) {
      try {
        const [rows] = await conn.execute(
          `SELECT id, mobile, otp, status, expires_at 
           FROM otps 
           WHERE mobile = ? AND status = 0 
           ORDER BY id DESC LIMIT 1`,
          [normalizedMobile]
        );
        if (rows && rows[0]) {
          otpRecord = rows[0];
        }
      } catch (dbErr) {
        console.warn("[OtpService] DB verify error, falling back to memory:", dbErr.message);
      }
    }

    // Fallback to in-memory if DB row not found
    if (!otpRecord) {
      const memRecord = inMemoryOtps.get(normalizedMobile);
      if (memRecord && memRecord.status === 0) {
        otpRecord = {
          id: null,
          mobile: memRecord.mobile,
          otp: memRecord.otp,
          status: memRecord.status,
          expires_at: new Date(memRecord.expiresAt),
        };
      }
    }

    if (!otpRecord) {
      throw new AppError(400, "OTP_NOT_FOUND", "No active OTP found for this mobile number. Please request a new OTP.");
    }

    const now = Date.now();
    const expiryTime = new Date(otpRecord.expires_at).getTime();

    if (now > expiryTime) {
      // Mark expired in DB
      if (conn && otpRecord.id) {
        try {
          await conn.execute("UPDATE otps SET status = 2 WHERE id = ?", [otpRecord.id]);
        } catch (_) {}
      }
      inMemoryOtps.delete(normalizedMobile);
      throw new AppError(400, "OTP_EXPIRED", "OTP has expired. Please request a new OTP.");
    }

    if (String(otpRecord.otp).trim() !== candidateOtp) {
      throw new AppError(400, "INVALID_OTP", "Incorrect OTP. Please enter the valid code.");
    }

    // Mark as verified (status = 1)
    if (conn && otpRecord.id) {
      try {
        await conn.execute("UPDATE otps SET status = 1, updated_at = NOW() WHERE id = ?", [otpRecord.id]);
        // Also update users table verification flag if account exists
        await conn.execute(
          "UPDATE users SET verification = 1 WHERE mobile = ? OR mobile = ?",
          [normalizedMobile, `+91${normalizedMobile}`]
        );
      } catch (uErr) {
        console.warn("[OtpService] Verification status sync warning:", uErr.message);
      } finally {
        conn.release();
      }
    }

    inMemoryOtps.delete(normalizedMobile);

    return {
      status: 200,
      success: true,
      message: "OTP verified successfully",
      data: {
        mobile: normalizedMobile,
        verified: true,
        verified_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Resend OTP (Wraps sendOtp)
   */
  async resendOtp(params) {
    return this.sendOtp({ ...params, type: params.type || "resend" });
  }
}

module.exports = { OtpService, cleanMobile };

