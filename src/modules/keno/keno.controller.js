"use strict";

const AppError = require("../../shared/errors/AppError");
const { KenoService } = require("./keno.service");

const service = new KenoService();

function respondError(error, res) {
  if (!(error instanceof AppError)) throw error;
  return res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
}

async function placeBet(req, res) {
  try {
    const payload = {
      ...(req.body ?? {}),
      userid: req.user?.id ? Number(req.user.id) : req.body?.userid,
    };
    return res.status(200).json(await service.placeBet(payload));
  } catch (error) { return respondError(error, res); }
}

async function settleRound(req, res) {
  try {
    return res.status(200).json(await service.settleRound(req.params.game_id));
  } catch (error) { return respondError(error, res); }
}

async function results(req, res) {
  try {
    return res.status(200).json(await service.getResults({
      game_id: req.body?.game_id ?? req.query.game_id,
      limit: req.body?.limit ?? req.query.limit,
      offset: req.body?.offset ?? req.query.offset ?? 0,
      created_at: req.body?.created_at ?? req.query.created_at,
    }));
  } catch (error) { return respondError(error, res); }
}

async function betHistory(req, res) {
  try {
    const result = await service.getBetHistory({
      userid: req.body?.userid,
      game_id: req.body?.game_id,
      limit: req.body?.limit,
      offset: req.body?.offset ?? 0,
      created_at: req.body?.created_at,
    });
    return res.status(result.status === 400 ? 400 : 200).json(result);
  } catch (error) { return respondError(error, res); }
}

async function multipliers(req, res) {
  try {
    return res.status(200).json(await service.getMultipliers({
      risk_level: req.body?.risk_level,
      selections: req.body?.selections,
    }));
  } catch (error) { return respondError(error, res); }
}

async function winAmount(req, res) {
  try {
    return res.status(200).json(await service.getWinAmount(req.body ?? {}));
  } catch (error) { return respondError(error, res); }
}

module.exports = { betHistory, multipliers, placeBet, results, service, settleRound, winAmount };
