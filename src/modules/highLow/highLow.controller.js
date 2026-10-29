"use strict";

const AppError = require("../../shared/errors/AppError");
const { HighLowService } = require("./highLow.service");

const service = new HighLowService();
function fail(error, res) {
  if (!(error instanceof AppError)) throw error;
  return res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
}

async function bet(req, res) {
  try {
    const payload = {
      ...(req.body ?? {}),
      userid: req.user?.id ? Number(req.user.id) : req.body?.userid,
    };
    return res.status(200).json(await service.placeBet(payload));
  } catch (error) { return fail(error, res); }
}
async function settle(req, res) {
  try { return res.status(200).json(await service.settleRound(req.params.game_id)); }
  catch (error) { return fail(error, res); }
}
async function history(req, res) {
  try {
    const query = {
      ...(req.query ?? {}),
      userid: req.user?.id ? Number(req.user.id) : req.query?.userid,
    };
    return res.status(200).json(await service.getBetHistory(query));
  } catch (error) { return fail(error, res); }
}
async function winAmount(req, res) {
  try { return res.status(200).json(await service.getWinAmount(req.query)); }
  catch (error) { return fail(error, res); }
}
async function results(req, res) {
  try { return res.status(200).json(await service.getResults(req.query)); }
  catch (error) { return fail(error, res); }
}

module.exports = { bet, history, results, service, settle, winAmount };
