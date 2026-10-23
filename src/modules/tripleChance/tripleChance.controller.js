"use strict";

const AppError = require("../../shared/errors/AppError");
const { TripleChanceService } = require("./tripleChance.service");

const service = new TripleChanceService();

function fail(error, res) {
  if (!(error instanceof AppError)) throw error;
  return res.status(error.statusCode).json({ status: error.statusCode, message: error.message, success: false });
}

async function bet(req, res) {
  try { return res.status(200).json(await service.placeBets(req.body ?? {})); }
  catch (error) { return fail(error, res); }
}
async function history(req, res) {
  try { return res.status(200).json(await service.getHistory(req.query)); }
  catch (error) { return fail(error, res); }
}
async function results(req, res) {
  try { return res.status(200).json(await service.getResults(req.query.user_id)); }
  catch (error) { return fail(error, res); }
}
async function settle(req, res) {
  try { return res.status(200).json(await service.settleRound()); }
  catch (error) { return fail(error, res); }
}
async function winAmount(req, res) {
  try { return res.status(200).json(await service.getWinAmount(req.query.user_id)); }
  catch (error) { return fail(error, res); }
}

module.exports = { bet, history, results, service, settle, winAmount };
