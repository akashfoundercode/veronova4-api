"use strict";

const { MineService } = require("./mine.service");
const AppError = require("../../shared/errors/AppError");

const service = new MineService();

function sendError(error, res) {
  if (!(error instanceof AppError)) throw error;
  return res.status(error.statusCode).json({
    status: error.statusCode,
    message: error.message,
  });
}

async function bet(req, res) {
  try {
    return res.status(200).json(await service.placeBet(req.body ?? {}));
  } catch (error) {
    return sendError(error, res);
  }
}

async function betOld(req, res) {
  try {
    return res.status(200).json(
      await service.placeBet(req.body ?? {}, { legacyWalletMode: true }),
    );
  } catch (error) {
    return sendError(error, res);
  }
}

async function cashout(req, res) {
  try {
    return res.status(200).json(await service.cashout(req.body ?? {}));
  } catch (error) {
    return sendError(error, res);
  }
}

async function result(req, res) {
  try {
    return res.status(200).json(await service.getResults({
      userid: req.body?.userid ?? req.query.userid,
      limit: req.body?.limit ?? req.query.limit ?? 0,
      offset: req.body?.offset ?? req.query.offset ?? 0,
    }));
  } catch (error) {
    return sendError(error, res);
  }
}

async function multipliers(req, res) {
  try {
    const resultData = await service.getMultipliers();
    return res.status(resultData.status === 200 ? 200 : 400).json(resultData);
  } catch (error) {
    return sendError(error, res);
  }
}

module.exports = { bet, betOld, cashout, result, multipliers, service };
