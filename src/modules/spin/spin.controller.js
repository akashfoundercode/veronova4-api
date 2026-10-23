"use strict";

const AppError = require("../../shared/errors/AppError");
const { SpinService } = require("./spin.service");

const service = new SpinService();

function fail(error, res) {
  if (!(error instanceof AppError)) throw error;
  return res.status(error.statusCode).json({ status: error.statusCode, message: error.message, success: false });
}

async function bet(req, res) {
  try { return res.status(200).json(await service.placeBets(req.body ?? {})); }
  catch (error) { return fail(error, res); }
}

async function history(req, res) {
  try {
    const result = await service.getHistory({ user_id: req.query.user_id, limit: req.query.limit, offset: req.query.offset ?? 0 });
    return res.status(200).json(result);
  } catch (error) { return fail(error, res); }
}

async function results(req, res) {
  try { return res.status(200).json(await service.getResults(req.query.user_id)); }
  catch (error) { return fail(error, res); }
}

async function settle(req, res) {
  try { return res.status(200).json(await service.settleRound()); }
  catch (error) { return fail(error, res); }
}

async function latestLogs(req, res) {
  try { return res.status(200).json(await service.getLatestBetLogs()); }
  catch (error) { return fail(error, res); }
}

async function latestAmounts(req, res) {
  try { return res.status(200).json(await service.getLatestBetLogsAmount()); }
  catch (error) { return fail(error, res); }
}

async function addAdminResult(req, res) {
  try { return res.status(200).json(await service.addAdminResult(req.body ?? {})); }
  catch (error) { return fail(error, res); }
}

module.exports = { addAdminResult, bet, history, latestAmounts, latestLogs, results, service, settle };
