"use strict";

const AppError = require("../../shared/errors/AppError");
const { LuckyCardsService } = require("./luckyCards.service");

function createController(size) {
  const service = new LuckyCardsService(size);
  function fail(error, res) {
    if (!(error instanceof AppError)) throw error;
    return res.status(error.statusCode).json({ status: error.statusCode, message: error.message, success: false });
  }
  return {
    service,
    bet: async (req, res) => {
      try {
        const payload = {
          ...(req.body ?? {}),
          userid: req.user?.id ? Number(req.user.id) : req.body?.userid,
        };
        return res.status(200).json(await service.placeBets(payload));
      } catch (error) { return fail(error, res); }
    },
    history: async (req, res) => {
      try {
        const query = {
          ...(req.query ?? {}),
          user_id: req.user?.id ? Number(req.user.id) : req.query?.user_id,
        };
        return res.status(200).json(await service.getHistory(query));
      } catch (error) { return fail(error, res); }
    },
    results: async (req, res) => {
      try { return res.status(200).json(await service.getResults(req.query.user_id)); }
      catch (error) { return fail(error, res); }
    },
    settle: async (req, res) => {
      try { return res.status(200).json(await service.settleRound()); }
      catch (error) { return fail(error, res); }
    },
    latestLogs: async (req, res) => {
      try { return res.status(200).json(await service.getLatestBetLogs()); }
      catch (error) { return fail(error, res); }
    },
    latestAmounts: async (req, res) => {
      try { return res.status(200).json(await service.getLatestBetLogsAmount()); }
      catch (error) { return fail(error, res); }
    },
    adminPanel: async (req, res) => {
      try { return res.status(200).json(await service.getAdminPanel()); }
      catch (error) { return fail(error, res); }
    },
    addAdminResult: async (req, res) => {
      try {
        const body = req.body ?? {};
        return res.status(200).json(await service.addAdminResult({
          period_no: body.period_no ?? body.period_num,
          card_number: body.card_number ?? body.number,
          jackpot: body.jackpot,
        }));
      } catch (error) { return fail(error, res); }
    },
  };
}

module.exports = { createController };
