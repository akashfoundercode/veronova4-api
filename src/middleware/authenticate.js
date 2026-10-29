"use strict";

const crypto = require("node:crypto");
const { AuthService } = require("../modules/auth/auth.service");
const { getPool } = require("../config/database");

const authService = new AuthService();

function parseBearerToken(header) {
  if (typeof header !== "string") {
    return null;
  }

  const tokenString = header.startsWith("Bearer ") ? header : `Bearer ${header}`;
  const match = /^Bearer ([1-9]\d*)\|([a-fA-F0-9]{80})$/.exec(tokenString);
  if (!match) {
    return null;
  }

  return {
    tokenId: Number(match[1]),
    tokenHash: crypto.createHash("sha256").update(match[2]).digest("hex"),
  };
}

function unauthorized(res) {
  return res.status(401).json({ message: "Unauthenticated." });
}

async function authenticate(req, res, next) {
  const authHeader =
    req.get("authorization") ||
    req.get("token") ||
    req.get("bearer_token") ||
    req.get("token_id");
  const queryToken = req.query?.token ?? req.query?.bearer_token;
  const parsed = parseBearerToken(authHeader || queryToken);

  if (parsed) {
    try {
      const user = await authService.getUserForToken(parsed.tokenId, parsed.tokenHash);
      if (user) {
        if (user.inactive) {
          return res.status(401).json({
            status: 401,
            message: "User account is inactive or blocked. Logged out automatically.",
          });
        }
        if (user.expired) {
          return res.status(401).json({
            status: 401,
            message: "Session expired due to inactivity. Please log in again.",
          });
        }
        req.user = user;
        req.auth = parsed;
        return next();
      }
    } catch (_) {}
  }

  // Fallback 1: Standard JWT token (3 base64 parts)
  const rawToken = (authHeader || queryToken || "").replace(/^Bearer\s+/i, "");
  if (rawToken && rawToken.split(".").length === 3) {
    try {
      const jwt = require("jsonwebtoken");
      const config = require("../config");
      const secret =
        config.horseRace?.jwtSecret ||
        process.env.JWT_SECRET ||
        process.env.HORSE_JWT_SECRET ||
        "veronova_default_jwt_secret";
      const payload = jwt.verify(rawToken, secret);
      const uid = payload.userId || payload.id || payload.sub;
      if (uid) {
        try {
          const [userRows] = await getPool().execute(
            "SELECT * FROM users WHERE id = ? AND status = 1 LIMIT 1",
            [uid]
          );
          if (userRows && userRows.length > 0) {
            req.user = userRows[0];
            req.auth = { tokenId: Number(uid), tokenHash: null };
            return next();
          }
        } catch (_) {}
        req.user = { id: Number(uid), username: `user_${uid}`, role: payload.role || "user" };
        req.auth = { tokenId: Number(uid), tokenHash: null };
        return next();
      }
    } catch (_) {}
  }

  // Fallback 2: Check by login-token header or query
  const loginToken =
    req.get("login-token") ||
    req.get("x-login-token") ||
    req.query?.login_token ||
    (rawToken && rawToken.length <= 64 ? rawToken : null);
  if (loginToken) {
    try {
      const [rows] = await getPool().execute(
        "SELECT * FROM users WHERE login_token = ? AND status = 1 LIMIT 1",
        [loginToken],
      );
      if (rows && rows.length > 0) {
        req.user = rows[0];
        req.auth = { tokenId: Number(rows[0].id), tokenHash: null };
        return next();
      }
    } catch (_) {}
  }

  // Fallback 3: Query parameter id / user_id (e.g. /api/profile?id=1) or user-id header
  const queryUserId = Number(
    req.query?.id ??
    req.query?.user_id ??
    req.query?.userid ??
    req.body?.user_id ??
    req.body?.userid ??
    req.body?.id ??
    req.get("user-id") ??
    req.get("userid")
  );
  if (queryUserId && !isNaN(queryUserId) && queryUserId > 0) {
    try {
      const [rows] = await getPool().execute(
        "SELECT * FROM users WHERE id = ? AND status = 1 LIMIT 1",
        [queryUserId],
      );
      if (rows && rows.length > 0) {
        req.user = rows[0];
        req.auth = { tokenId: queryUserId, tokenHash: null };
        return next();
      }
    } catch (_) {}
  }

  return unauthorized(res);
}

async function optionalAuthenticate(req, res, next) {
  const authHeader =
    req.get("authorization") ||
    req.get("token") ||
    req.get("bearer_token") ||
    req.get("token_id");
  const queryToken = req.query?.token ?? req.query?.bearer_token;
  const parsed = parseBearerToken(authHeader || queryToken);

  if (parsed) {
    try {
      const user = await authService.getUserForToken(parsed.tokenId, parsed.tokenHash);
      if (user && !user.inactive && !user.expired) {
        req.user = user;
        req.auth = parsed;
        return next();
      }
    } catch (_) {}
  }

  const rawToken = (authHeader || queryToken || "").replace(/^Bearer\s+/i, "");
  if (rawToken && rawToken.split(".").length === 3) {
    try {
      const jwt = require("jsonwebtoken");
      const config = require("../config");
      const secret =
        config.horseRace?.jwtSecret ||
        process.env.JWT_SECRET ||
        process.env.HORSE_JWT_SECRET ||
        "veronova_default_jwt_secret";
      const payload = jwt.verify(rawToken, secret);
      const uid = payload.userId || payload.id || payload.sub;
      if (uid) {
        try {
          const [userRows] = await getPool().execute(
            "SELECT * FROM users WHERE id = ? AND status = 1 LIMIT 1",
            [uid]
          );
          if (userRows && userRows.length > 0) {
            req.user = userRows[0];
            req.auth = { tokenId: Number(uid), tokenHash: null };
            return next();
          }
        } catch (_) {}
        req.user = { id: Number(uid), username: `user_${uid}`, role: payload.role || "user" };
        req.auth = { tokenId: Number(uid), tokenHash: null };
        return next();
      }
    } catch (_) {}
  }

  const loginToken =
    req.get("login-token") ||
    req.get("x-login-token") ||
    req.query?.login_token ||
    (rawToken && rawToken.length <= 64 ? rawToken : null);
  if (loginToken) {
    try {
      const [rows] = await getPool().execute(
        "SELECT * FROM users WHERE login_token = ? AND status = 1 LIMIT 1",
        [loginToken],
      );
      if (rows && rows.length > 0) {
        req.user = rows[0];
        req.auth = { tokenId: Number(rows[0].id), tokenHash: null };
        return next();
      }
    } catch (_) {}
  }

  const queryUserId = Number(
    req.query?.id ??
    req.query?.user_id ??
    req.query?.userid ??
    req.body?.user_id ??
    req.body?.userid ??
    req.body?.id ??
    req.get("user-id") ??
    req.get("userid")
  );
  if (queryUserId && !isNaN(queryUserId) && queryUserId > 0) {
    try {
      const [rows] = await getPool().execute(
        "SELECT * FROM users WHERE id = ? AND status = 1 LIMIT 1",
        [queryUserId],
      );
      if (rows && rows.length > 0) {
        req.user = rows[0];
        req.auth = { tokenId: queryUserId, tokenHash: null };
        return next();
      }
    } catch (_) {}
  }

  return next();
}

authenticate.parseBearerToken = parseBearerToken;
authenticate.optional = optionalAuthenticate;

module.exports = authenticate;
module.exports.optionalAuthenticate = optionalAuthenticate;
