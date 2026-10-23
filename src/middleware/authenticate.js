"use strict";

const crypto = require("node:crypto");
const { AuthService } = require("../modules/auth/auth.service");

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
  const authHeader = req.get("authorization");
  const queryToken = req.query?.token ?? req.query?.bearer_token;
  const parsed = parseBearerToken(authHeader || queryToken);
  if (!parsed) {
    return unauthorized(res);
  }

  const user = await authService.getUserForToken(parsed.tokenId, parsed.tokenHash);
  if (!user) {
    return unauthorized(res);
  }

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

async function optionalAuthenticate(req, res, next) {
  const authHeader = req.get("authorization");
  const queryToken = req.query?.token ?? req.query?.bearer_token;
  const parsed = parseBearerToken(authHeader || queryToken);
  if (!parsed) {
    return next();
  }

  const user = await authService.getUserForToken(parsed.tokenId, parsed.tokenHash);
  if (!user || user.inactive || user.expired) {
    return next();
  }

  req.user = user;
  req.auth = parsed;
  return next();
}

authenticate.parseBearerToken = parseBearerToken;
authenticate.optional = optionalAuthenticate;

module.exports = authenticate;
module.exports.optionalAuthenticate = optionalAuthenticate;
