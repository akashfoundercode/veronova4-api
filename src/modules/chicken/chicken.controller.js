"use strict";

const { ChickenService } = require("./chicken.service");
const AppError = require("../../shared/errors/AppError");

const service = new ChickenService();

function wrap(fn) {
  return async (req, res, next) => {
    try {
      const result = await fn(req, res);
      return res.status(200).json(result);
    } catch (e) {
      if (e instanceof AppError) {
        return res.status(200).json({
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
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
    };
    return service.bet(payload);
  }),
  history: wrap(async (req) => {
    const query = {
      ...req.query,
      user_id: req.query?.user_id ?? req.query?.userid ?? req.user?.id,
    };
    return service.history(query);
  }),
  cashout: wrap(async (req) => {
    const payload = {
      ...req.body,
      userid: req.body?.userid ?? req.body?.user_id ?? req.user?.id,
    };
    return service.cashout(payload);
  }),
  values: wrap(async () => service.betValues()),
  rules: wrap(async () => service.rules()),
  multiplier: wrap(async (req) => {
    if (req.query?.admin === "true" || req.query?.admin === true || req.query?.admin === "1") {
      return service.adminMultiplierList();
    }
    return service.multiplier(req.query);
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
