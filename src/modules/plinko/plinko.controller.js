"use strict";

const { PlinkoService } = require("./plinko.service");
const AppError = require("../../shared/errors/AppError");

const service = new PlinkoService();

function sendError(error, res) {
  if (!(error instanceof AppError)) throw error;
  return res.status(error.statusCode).json({
    status: error.statusCode,
    message: error.message,
  });
}

async function bet(req, res) {
  try {
    const result = await service.placeBet(req.body ?? {});
    return res.status(200).json(result);
  } catch (error) {
    return sendError(error, res);
  }
}

async function betNew(req, res) {
  try {
    const result = await service.placeBet(req.body ?? {}, { legacyWalletMode: true });
    return res.status(200).json(result);
  } catch (error) {
    return sendError(error, res);
  }
}

async function indexList(req, res) {
  try {
    const result = await service.getIndexList(req.body?.type ?? req.query.type);
    return res.status(result.status === 200 ? 200 : 400).json(result);
  } catch (error) {
    return sendError(error, res);
  }
}

async function multiplier(req, res) {
  try {
    const result = await service.calculateMultiplier(req.body ?? {});
    return res.status(200).json(result);
  } catch (error) {
    return sendError(error, res);
  }
}

async function result(req, res) {
  try {
    const resultData = await service.getResults({
      userid: req.body?.userid ?? req.query.userid,
      limit: req.body?.limit ?? req.query.limit ?? 0,
      offset: req.body?.offset ?? req.query.offset ?? 0,
    });
    return res.status(resultData.status === 200 ? 200 : 400).json(resultData);
  } catch (error) {
    return sendError(error, res);
  }
}

module.exports = { bet, betNew, indexList, multiplier, result, service };
