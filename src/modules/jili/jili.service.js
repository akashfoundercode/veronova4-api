"use strict";

const crypto = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

class JiliService {
  constructor(poolProvider = getPool, fetchProvider = globalThis.fetch) {
    this.poolProvider = poolProvider;
    this.fetchProvider = fetchProvider;
  }

  async games(query = {}) {
    const brand = query.brand || "JILI";
    const category = query.category ? String(query.category).toUpperCase() : null;
    const url = `https://nuxapi.space/get_games.php?brand=${encodeURIComponent(brand)}`;

    let response;
    try {
      response = await this.fetchProvider(url, {
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new AppError(502, "JILI_PROVIDER_ERROR", "Unable to contact Jili provider.");
    }

    if (!response.ok) {
      throw new AppError(502, "JILI_PROVIDER_ERROR", `Jili provider returned status ${response.status}.`);
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw new AppError(502, "JILI_PROVIDER_ERROR", "Invalid JSON response from Jili provider.");
    }

    let list = Array.isArray(body) ? body : [];
    if (category) {
      list = list.filter((g) => String(g.category).toUpperCase() === category);
    }

    const data = list.map((g) => ({
      gameNameEn: g.gameNameEn ?? null,
      gameId: g.gameCode ?? g.gameId ?? null,
      imgUrl: g.imgUrl ?? null,
      category: g.category ?? null,
    }));

    return {
      status: 200,
      message: "Success",
      count: data.length,
      data,
    };
  }

  async launch(query = {}) {
    const rawUserId = query.user_id ?? query.userid;
    if (rawUserId === undefined || rawUserId === null || rawUserId === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The user_id field is required.");
    }
    const uid = Number(rawUserId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "The user_id field must be a valid positive integer.");
    }

    const rawGameId = query.game_id ?? query.gameid;
    if (rawGameId === undefined || rawGameId === null || String(rawGameId).trim() === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The game_id field is required.");
    }
    const gameId = String(rawGameId).trim();

    let amount = query.amount;
    if (amount !== undefined && amount !== null && amount !== "") {
      amount = Number(amount);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new AppError(400, "VALIDATION_ERROR", "The amount field must be a valid non-negative number.");
      }
    } else {
      amount = null;
    }

    const pool = this.poolProvider();
    const [[user]] = await pool.execute(
      "SELECT id, mobile, wallet, account_type FROM users WHERE id = ?",
      [uid],
    );

    if (!user) {
      throw new AppError(400, "USER_NOT_FOUND", "User not found");
    }

    if (Number(user.account_type) !== 0) {
      throw new AppError(400, "DEMO_ACCOUNT_UNAVAILABLE", "Game is not available for demo accounts.");
    }

    const availableWallet = Math.max(0, Math.trunc(Number(user.wallet ?? 0)));
    if (amount !== null && amount > availableWallet) {
      throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient wallet balance.");
    }
    const balance = amount !== null ? Math.trunc(amount) : availableWallet;

    const secretId = process.env.JILI_SECRET_ID;
    const secretKey = process.env.JILI_SECRET_KEY;
    const token = process.env.JILI_TOKEN;

    if (!secretId || !secretKey || !token) {
      throw new AppError(
        503,
        "JILI_NOT_CONFIGURED",
        "Jili provider credentials are not configured. Please set JILI_SECRET_ID, JILI_SECRET_KEY, and JILI_TOKEN in .env.",
      );
    }

    let keyBuffer = Buffer.from(secretKey, "utf8");
    if (keyBuffer.length !== 32) {
      const buf = Buffer.alloc(32);
      buf.write(secretKey, "utf8");
      keyBuffer = buf;
    }

    const payload = {
      user_id: user.mobile,
      balance,
      game_uid: gameId,
      token,
      timestamp: Date.now(),
    };

    const cipher = crypto.createCipheriv("aes-256-ecb", keyBuffer, null);
    cipher.setAutoPadding(true);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
    ]).toString("base64");

    const url = `https://nuxapi.space/client.php?payload=${encodeURIComponent(encrypted)}&secret_id=${encodeURIComponent(secretId)}`;

    return {
      status: 200,
      message: "Game URL generated successfully",
      gameid: gameId,
      game_id: gameId,
      userPhone: user.mobile,
      balance,
      gameUrl: url,
      url,
    };
  }
}

module.exports = { JiliService };
