"use strict";

const { JiliService } = require("./jili.service");
const AppError = require("../../shared/errors/AppError");

const service = new JiliService();

function wrap(fn) {
  return async (req, res, next) => {
    try {
      const result = await fn(req, res);
      return res.status(200).json(result);
    } catch (e) {
      if (e instanceof AppError) {
        return res.status(200).json({
          status: e.statusCode || 400,
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
  launch: wrap(async (req) => {
    const payload = {
      ...req.query,
      ...req.body,
      user_id: req.query?.user_id ?? req.query?.userid ?? req.body?.user_id ?? req.body?.userid ?? req.user?.id,
      amount: req.query?.amount ?? req.body?.amount,
      game_id: req.query?.game_id ?? req.query?.gameid ?? req.body?.game_id ?? req.body?.gameid,
    };
    return service.launch(payload);
  }),
  games: wrap(async (req) => {
    return service.games(req.query);
  }),
};
