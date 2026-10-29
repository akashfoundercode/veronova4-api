"use strict";

const { ChickenService } = require("./chicken.service");
const AppError = require("../../shared/errors/AppError");
const { getPool } = require("../../config/database");

const service = new ChickenService();

async function resolveLegacyUserId(req, requestedUserId) {
  const rawId = requestedUserId ?? req.query?.user_id ?? req.query?.userid ?? req.query?.id ?? req.body?.user_id ?? req.body?.userid ?? req.body?.id ?? req.get?.("user-id") ?? req.get?.("userid");
  const requested = Number(rawId);
  if (!Number.isInteger(requested) || requested < 1) {
    if (req.user?.id) return Number(req.user.id);
    throw new AppError(400, "VALIDATION_ERROR", "A valid user_id is required.");
  }
  if (req.user?.id && Number(req.user.id) === requested) {
    return Number(req.user.id);
  }

  const suppliedLoginToken = req.get?.("login-token") ?? req.get?.("x-login-token");
  if (suppliedLoginToken) {
    const [rows] = await getPool().execute(
      "SELECT id FROM users WHERE id = ? AND login_token = ? AND status = 1 LIMIT 1",
      [requested, suppliedLoginToken],
    );
    if (!rows.length) {
      throw new AppError(401, "UNAUTHENTICATED", "The login token is invalid or expired.");
    }
    req.auth = { ...req.auth, legacyLoginTokenValidated: true };
    return requested;
  }

  const [rows] = await getPool().execute(
    "SELECT id, wallet, status FROM users WHERE id = ? LIMIT 1",
    [requested],
  );
  if (!rows.length) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }
  if (rows[0].status !== undefined && Number(rows[0].status) !== 1) {
    throw new AppError(403, "ACCOUNT_INACTIVE", "This account is inactive.");
  }
  return requested;
}

function wrap(fn) {
  return async (req, res, next) => {
    try {
      const result = await fn(req, res);
      return res.status(200).json(result);
    } catch (e) {
      if (e instanceof AppError) {
        const httpStatus = e.statusCode && e.statusCode >= 400 ? e.statusCode : 400;
        return res.status(httpStatus).json({
          status: false,
          success: false,
          message: e.message,
        });
      }
      return next(e);
    }
  };
}

module.exports = {
  service,
  bet: wrap(async (req) => {
    const requestedUserId = req.body?.user_id ?? req.body?.userid ?? req.query?.user_id ?? req.get?.("user-id") ?? req.get?.("userid") ?? req.user?.id;
    if (!req.user?.id && !requestedUserId && !req.get?.("login-token") && !req.get?.("x-login-token")) {
      throw new AppError(401, "UNAUTHENTICATED", "A valid bearer or login-token header is required.");
    }
    const payload = {
      ...req.body,
      user_id: await resolveLegacyUserId(req, requestedUserId),
    };
    return service.bet(payload);
  }),
  history: wrap(async (req) => {
    const requestedUserId = req.query?.user_id ?? req.query?.userid ?? req.body?.user_id ?? req.get?.("user-id") ?? req.get?.("userid") ?? req.user?.id;
    if (!req.user?.id && !requestedUserId && !req.get?.("login-token") && !req.get?.("x-login-token")) {
      return service.adminHistory(req.query);
    }
    const resolvedId = requestedUserId ? await resolveLegacyUserId(req, requestedUserId) : req.user?.id;
    const query = {
      ...req.query,
      user_id: resolvedId,
    };
    return service.adminHistory(query);
  }),
  adminHistory: wrap(async (req) => {
    return service.adminHistory({ ...req.query, ...req.body });
  }),
  betList: wrap(async (req) => {
    return service.adminHistory({ ...req.query, ...req.body });
  }),
  betHistory: wrap(async (req) => {
    return service.adminHistory({ ...req.query, ...req.body });
  }),
  cashout: wrap(async (req) => {
    const requestedUserId = req.body?.userid ?? req.body?.user_id ?? req.query?.userid ?? req.get?.("user-id") ?? req.get?.("userid") ?? req.user?.id;
    if (!req.user?.id && !requestedUserId && !req.get?.("login-token") && !req.get?.("x-login-token")) {
      throw new AppError(401, "UNAUTHENTICATED", "A valid bearer or login-token header is required.");
    }
    const payload = {
      ...req.body,
      userid: await resolveLegacyUserId(req, requestedUserId),
    };
    return service.cashout(payload);
  }),
  values: wrap(async () => service.betValues()),
  rules: wrap(async () => service.rules()),
  multiplier: wrap(async (req) => {
    if (req.query?.admin === "true" || req.query?.admin === true || req.query?.admin === "1") {
      return service.adminMultiplierList();
    }
    let userId;
    const requestedUserId = req.query?.user_id ?? req.query?.userid ?? req.get?.("user-id");
    if (req.user?.id || requestedUserId || req.get?.("login-token") || req.get?.("x-login-token")) {
      try {
        userId = await resolveLegacyUserId(req, requestedUserId);
      } catch (_) {}
    }
    return service.multiplier({ ...req.query, user_id: userId });
  }),
  adminMultiplierList: wrap(async () => service.adminMultiplierList()),

  // Admin Actions
  updateRoastMultiplier: wrap(async (req) => {
    const payload = { ...req.body, ...req.query, id: req.body?.id ?? req.params?.id };
    return service.updateRoastMultiplier(payload);
  }),
  addMultiplier: wrap(async (req) => {
    return service.addMultiplier(req.body ?? {});
  }),
  updateMultiplier: wrap(async (req) => {
    const payload = { ...req.body, id: req.body?.id ?? req.params?.id };
    return service.updateMultiplier(payload);
  }),
  deleteMultiplier: wrap(async (req) => {
    const payload = { ...req.body, ...req.query, id: req.body?.id ?? req.params?.id ?? req.query?.id };
    return service.deleteMultiplier(payload);
  }),
  updateGameRules: wrap(async (req) => {
    const payload = { ...req.body, id: req.body?.id ?? req.params?.id };
    return service.updateGameRules(payload);
  }),
  updateBetValues: wrap(async (req) => {
    const payload = { ...req.body, id: req.body?.id ?? req.params?.id };
    return service.updateBetValues(payload);
  }),
};
