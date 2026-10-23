"use strict";

const AppError = require("../../shared/errors/AppError");
const { TrxService, assertTrxGameId } = require("./trx.service");
const { TRX_GAME_IDS } = require("./trx.service");

const service = new TrxService();

function legacyError(res, error) {
  if (error instanceof AppError && error.statusCode === 400) {
    return res.status(200).json({ status: 400, message: error.message });
  }
  throw error;
}

function optionalInteger(value, fallback, name, maximum = 10000) {
  if (value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > maximum) {
    throw new AppError(400, "VALIDATION_ERROR", `The ${name} must be an integer between 0 and ${maximum}.`);
  }
  return number;
}

async function bet(req, res) {
  try {
    const body = req.body ?? {};
    const rawUserId = body.userid !== undefined && body.userid !== "" ? body.userid : req.user?.id;
    const userid = Number(rawUserId);
    const isAdmin = req.user && Number(req.user.id) === 1;
    if (req.user && !isAdmin && userid !== Number(req.user.id)) {
      return res.status(403).json({
        status: 403,
        message: "The userid does not match the authenticated account.",
      });
    }
    if (!Number.isInteger(userid) || userid < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid field is required.");
    }
    const result = await service.placeBet({
      userid,
      game_id: body.game_id,
      number: body.number,
      amount: Number(body.amount),
    });
    return res.status(200).json(result);
  } catch (error) {
    return legacyError(res, error);
  }
}

async function betHistory(req, res) {
  try {
    const body = req.body ?? {};
    const rawUserId = body.userid !== undefined && body.userid !== "" ? body.userid : req.user?.id;
    const userid = Number(rawUserId);
    const game_id = assertTrxGameId(body.game_id);
    const isAdmin = req.user && Number(req.user.id) === 1;
    if (req.user && !isAdmin && userid !== Number(req.user.id)) {
      return res.status(403).json({
        status: 403,
        message: "The userid does not match the authenticated account.",
      });
    }
    if (!Number.isInteger(userid) || userid < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "The userid field is required.");
    }
    const limit = optionalInteger(body.limit, 10000, "limit");
    const offset = optionalInteger(body.offset, 0, "offset");
    for (const field of ["from_date", "to_date"]) {
      if (body[field] !== undefined &&
          (typeof body[field] !== "string" || Number.isNaN(Date.parse(body[field])))) {
        throw new AppError(400, "VALIDATION_ERROR", `The ${field} field must be a valid date.`);
      }
    }
    const { rows, totalBets } = await service.getBetHistory({
      userid,
      game_id,
      limit,
      offset,
      from_date: body.from_date,
      to_date: body.to_date,
    });
    return res.status(200).json({
      status: 200,
      message: rows.length ? "Data found" : "No Data found",
      ...(rows.length ? { total_bets: totalBets } : {}),
      data: rows,
    });
  } catch (error) {
    return legacyError(res, error);
  }
}

async function trxResult(req, res) {
  const timestamp = Number(req.body?.utc_time_mili_sec ?? Date.now());
  if (!Number.isSafeInteger(timestamp) || timestamp < 1) {
    return res.status(400).json({
      status: 400,
      message: "The utc_time_mili_sec field must be a valid millisecond timestamp.",
    });
  }
  try {
    return res.status(200).json(await service.fetchBlockHash(timestamp));
  } catch (error) {
    return legacyError(res, error);
  }
}

async function resultList(req, res) {
  try {
    const result = await service.getResultList({
      game_id: req.query.gameid,
      offset: optionalInteger(req.query.offset, 0, "offset"),
      limit: optionalInteger(req.query.limit, 25, "limit"),
    });
    return res.status(200).json(result);
  } catch (error) {
    return legacyError(res, error);
  }
}

async function getResultByPeriod(req, res) {
  try {
    if (req.query.period_no === undefined || String(req.query.period_no).trim() === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The period_no field is required.");
    }
    const result = await service.getResultByPeriod({
      game_id: req.query.gameid,
      period_no: req.query.period_no,
    });
    return res.status(200).json(result);
  } catch (error) {
    return legacyError(res, error);
  }
}

async function fetchResults(req, res) {
  try {
    const gameId = assertTrxGameId(req.params.game_id);
    return res.status(200).json(await service.fetchBlockRecords(gameId));
  } catch (error) {
    return legacyError(res, error);
  }
}

async function updateResults(req, res) {
  try {
    const gameId = assertTrxGameId(req.query.gameid);
    const result = await service.settlePendingForGame(gameId);
    return res.status(200).json({
      status: 200,
      message: "TRX results updated successfully.",
      ...result,
    });
  } catch (error) {
    return legacyError(res, error);
  }
}

module.exports = {
  bet,
  betHistory,
  fetchResults,
  getResultByPeriod,
  resultList,
  trxResult,
  TRX_GAME_IDS,
  updateResults,
};
