"use strict";

const {
  WingoService,
  STANDARD_GAME_IDS,
  WINGO_GAME_IDS,
} = require("./wingo.service");
const AppError = require("../../shared/errors/AppError");
const { TrxService } = require("../trx/trx.service");
const dragonTigerController = require("../dragonTiger/dragonTiger.controller");
const andarBaharController = require("../andarBahar/andarBahar.controller");
const headTailController = require("../headTail/headTail.controller");
const sevenUpDownController = require("../sevenUpDown/sevenUpDown.controller");
const redBlackController = require("../redBlack/redBlack.controller");
const { DRAGON_TIGER_GAME_ID } = require("../dragonTiger/dragonTiger.service");

const service = new WingoService();
const trxService = new TrxService();

function responseError(res, status, message) {
  return res.status(200).json({ status, message });
}

function serviceForGame(gameId) {
  if (Number(gameId) === DRAGON_TIGER_GAME_ID) return dragonTigerController.service;
  if (Number(gameId) === 13) return andarBaharController.service;
  if (Number(gameId) === 14) return headTailController.service;
  if (Number(gameId) === 15) return sevenUpDownController.service;
  if (Number(gameId) === 16) return redBlackController.service;
  return service;
}

function requiredInteger(value, field, { minimum = 1 } = {}) {
  const number = Number(value);
  if (value === undefined || value === null || value === "" || !Number.isInteger(number) || number < minimum) {
    throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is required and must be an integer.`);
  }
  return number;
}

function validateGameId(value) {
  const gameId = requiredInteger(value, "game_id");
  if (!STANDARD_GAME_IDS.includes(gameId)) {
    throw new AppError(400, "VALIDATION_ERROR", "The selected game_id is invalid.");
  }
  return gameId;
}

function validateWingoGameId(value) {
  const gameId = requiredInteger(value, "game_id");
  if (!WINGO_GAME_IDS.includes(gameId)) {
    throw new AppError(400, "VALIDATION_ERROR", "The selected game_id is invalid.");
  }
  return gameId;
}

function validDate(value) {
  return value === undefined || value === null || value === "" || !Number.isNaN(Date.parse(value));
}

async function gameSerialNo(req, res) {
  await service.getGameSerialNo();
  await trxService.getGameSerialNo();
  return res.status(200).end();
}

async function bet(req, res) {
  const body = req.body ?? {};
  const rawUserId = body.userid !== undefined && body.userid !== "" ? body.userid : req.user?.id;
  const userid = rawUserId !== undefined ? Number(rawUserId) : undefined;
  const { game_id, number, games_no } = body;
  const amount = Number(body.amount);

  const isAdmin = req.user && Number(req.user.id) === 1;
  if (req.user && !isAdmin && userid !== undefined && Number(userid) !== Number(req.user.id)) {
    return res.status(403).json({
      status: 403,
      message: "The userid does not match the authenticated account.",
    });
  }
  if (userid === undefined || !Number.isInteger(userid) || userid < 1) {
    return responseError(res, 400, "The userid field is required.");
  }
  if (game_id === undefined || game_id === "" || !Number.isInteger(Number(game_id))) {
    return responseError(res, 400, "The game_id field is required.");
  }
  if (!STANDARD_GAME_IDS.includes(Number(game_id))) {
    return responseError(res, 400, "The selected game_id is invalid.");
  }
  if (number === undefined || number === null || number === "") {
    return responseError(res, 400, "The number field is required.");
  }
  if (body.amount === undefined || body.amount === "" || !Number.isFinite(amount) || amount < 0.1) {
    return responseError(res, 400, "The amount must be at least 0.1.");
  }

  try {
    const result = await service.placeBet({
      userid: Number(userid),
      game_id: Number(game_id),
      number: String(number),
      amount,
      games_no,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 400) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function winAmount(req, res) {
  try {
    const rawUserId = req.query.userid !== undefined && req.query.userid !== "" ? req.query.userid : req.user?.id;
    const userid = requiredInteger(rawUserId, "userid");
    const isAdmin = req.user && Number(req.user.id) === 1;
    if (req.user && !isAdmin && userid !== Number(req.user.id)) {
      return res.status(403).json({
        status: 403,
        message: "The userid does not match the authenticated account.",
      });
    }
    const game_id = validateGameId(req.query.game_id);
    const games_no = requiredInteger(req.query.games_no, "games_no");
    const result = await serviceForGame(game_id).getWinAmount({ userid, game_id, games_no });
    if (!result) {
      return res.status(200).json({ msg: "No record found", status: 400 });
    }
    return res.status(200).json({
      message: "Successfully",
      status: 200,
      data: {
        win: result.total_amount,
        games_no: result.games_no,
        result: result.result,
        gameid: result.gameid,
        number: result.number,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function results(req, res) {
  try {
    const game_id = validateGameId(req.query.game_id);
    const limit = requiredInteger(req.query.limit, "limit");
    const offset = req.query.offset === undefined ? 0 : requiredInteger(req.query.offset, "offset", { minimum: 0 });
    if (!validDate(req.query.from_date) || !validDate(req.query.to_date)) {
      return responseError(res, 400, "The from_date and to_date must be valid dates.");
    }
    if (req.query.status !== undefined && !Number.isInteger(Number(req.query.status))) {
      return responseError(res, 400, "The status must be an integer.");
    }
    const result = await serviceForGame(game_id).getResults({
      game_id,
      limit,
      offset,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
      status: req.query.status,
    });
    return res.status(200).json({
      status: 200,
      message: result.data.length === 0 ? "No data found" : "Data found",
      total_result: result.total_result,
      count: result.data.length,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function lastFiveResults(req, res) {
  try {
    const game_id = validateGameId(req.query.game_id);
    const limit = requiredInteger(req.query.limit, "limit", { minimum: 0 });
    const offset = req.query.offset === undefined ? 0 : requiredInteger(req.query.offset, "offset", { minimum: 0 });
    if (!validDate(req.query.from_date) || !validDate(req.query.to_date)) {
      return responseError(res, 400, "The from_date and to_date must be valid dates.");
    }
    const data = await serviceForGame(game_id).getResults({
      game_id,
      limit,
      offset,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
      includeAll: true,
    });
    return res.status(200).json({ status: 200, message: "Data found", data });
  } catch (error) {
    if (error instanceof AppError) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function lastResult(req, res) {
  try {
    const game_id = validateGameId(req.query.game_id);
    const data = await serviceForGame(game_id).getLastResult(game_id);
    return res.status(200).json({ status: 200, message: "Data found", data });
  } catch (error) {
    if (error instanceof AppError) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function betHistory(req, res) {
  try {
    const body = req.body ?? {};
    const rawUserId = body.userid !== undefined && body.userid !== "" ? body.userid : req.user?.id;
    const userid = requiredInteger(rawUserId, "userid");
    const isAdmin = req.user && Number(req.user.id) === 1;
    if (req.user && !isAdmin && userid !== Number(req.user.id)) {
      return res.status(403).json({
        status: 403,
        message: "The userid does not match the authenticated account.",
      });
    }
    const game_id = validateGameId(body.game_id);
    const limit = body.limit === undefined || body.limit === "" ? 10000 : requiredInteger(body.limit, "limit", { minimum: 0 });
    const offset = body.offset === undefined || body.offset === "" ? 0 : requiredInteger(body.offset, "offset", { minimum: 0 });
    if (!validDate(body.from_date) || !validDate(body.to_date)) {
      return responseError(res, 400, "The from_date and to_date must be valid dates.");
    }
    const { rows, totalBets } = await serviceForGame(game_id).getBetHistory({
      userid,
      game_id,
      limit,
      offset,
      from_date: body.from_date,
      to_date: body.to_date,
    });
    if (rows.length === 0) {
      return res.status(200).json({ status: 200, message: "No Data found", data: [] });
    }
    return res.status(200).json({
      status: 200,
      message: "Data found",
      total_bets: totalBets,
      data: rows,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function cron(req, res) {
  try {
    const gameId = validateGameId(req.params.game_id);
    const result = await serviceForGame(gameId).settleRound(gameId);
    return res.status(200).type("text/plain").send(result.message);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).type("text/plain").send(error.message);
    }
    throw error;
  }
}

async function getResults(req, res) {
  try {
    const game_id = validateWingoGameId(req.query.game_id);
    const period = await service.getPendingBetPeriod(game_id);
    if (period === null) {
      return res.status(200).type("text/plain").send("No Bet Found");
    }

    const win_number = await service.fetchProviderResult(game_id, period);
    await service.settleRound(game_id, {
      forcedResult: win_number,
      periodOverride: period,
      providerResult: true,
    });
    return res.status(200).json({
      status: 200,
      message: "result updated successfully!",
      games_no: period,
      win_number,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
      });
    }
    throw error;
  }
}

async function autoWingoResultInsert(req, res) {
  const { period_num, card_number, gameid } = req.body ?? {};
  const gameId = Number(gameid);
  const period = String(period_num ?? "");
  const resultNumber = Number(card_number);
  const isDragonTiger = gameId === DRAGON_TIGER_GAME_ID;
  const isSevenUpDown = gameId === 15;
  const isRedBlack = gameId === 16;
  const validStandardGame = STANDARD_GAME_IDS.includes(gameId);
  const validResultNumber =
    Number.isInteger(resultNumber) &&
    resultNumber >= (isDragonTiger || isSevenUpDown || isRedBlack ? 1 : 0) &&
    (isDragonTiger || isSevenUpDown || isRedBlack
      ? resultNumber <= (isRedBlack ? 7 : 3)
      : !WINGO_GAME_IDS.includes(gameId) || resultNumber <= 9);
  if (
    !period ||
    !validStandardGame ||
    !validResultNumber
  ) {
    return responseError(res, 400, "Invalid period_num, card_number, or gameid.");
  }
  const inserted = await serviceForGame(gameId).addAdminResult({
    period_num: period,
    card_number: resultNumber,
    gameid: gameId,
  });
  if (!inserted) {
    return res.status(200).json({
      status: 409,
      message: "Result for this period is already set!",
    });
  }
  return res.status(200).json({
    status: 200,
    message: "Prediction stored successfully.",
  });
}

async function fetchHistory(req, res) {
  try {
    const value = req.params.gameid ?? req.query.gameid;
    const game_id = validateGameId(value);
    return res.status(200).json(await serviceForGame(game_id).getAdminHistory(game_id));
  } catch (error) {
    if (error instanceof AppError) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function fetchAdminSetResults(req, res) {
  try {
    const game_id = validateGameId(req.params.id);
    return res.status(200).json(await serviceForGame(game_id).getAdminSetResults(game_id));
  } catch (error) {
    if (error instanceof AppError) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function fetchData(req, res) {
  try {
    const rawGameId = req.params.gameid ?? req.query.gameid ?? 1;
    const gameId = validateGameId(rawGameId);
    const result = await serviceForGame(gameId).fetchData(gameId);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function livePools(req, res) {
  try {
    const gameId = validateWingoGameId(req.params.gameid ?? req.query.game_id ?? 1);
    const data = await service.getLiveRoundSnapshot(gameId);
    return res.status(200).json({ status: 200, message: "Live Wingo pools fetched", data });
  } catch (error) {
    if (error instanceof AppError) return responseError(res, 400, error.message);
    throw error;
  }
}

async function liveBets(req, res) {
  try {
    const gameId = validateWingoGameId(req.query.game_id ?? 1);
    const data = await service.getLiveRoundSnapshot(gameId);
    return res.status(200).json({
      status: 200,
      message: "Live Wingo bets fetched",
      game_id: data.game_id,
      games_no: data.games_no,
      total_bets: data.active_bets_count,
      data: data.active_bets,
    });
  } catch (error) {
    if (error instanceof AppError) return responseError(res, 400, error.message);
    throw error;
  }
}

async function adminBetHistory(req, res) {
  try {
    const gameId = validateWingoGameId(req.query.game_id ?? 1);
    const limit = req.query.limit === undefined ? 100 : requiredInteger(req.query.limit, "limit", { minimum: 1 });
    const offset = req.query.offset === undefined ? 0 : requiredInteger(req.query.offset, "offset", { minimum: 0 });
    if (limit > 500) return responseError(res, 400, "The limit must not exceed 500.");
    const status = req.query.status === undefined ? undefined : requiredInteger(req.query.status, "status", { minimum: 0 });
    if (status !== undefined && status > 2) return responseError(res, 400, "The status must be 0, 1, or 2.");
    const result = await service.getAdminBetHistory({ gameId, limit, offset, status });
    return res.status(200).json({
      status: 200,
      message: result.data.length ? "Wingo bet history fetched" : "No data found",
      total: result.total,
      count: result.data.length,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof AppError) return responseError(res, 400, error.message);
    throw error;
  }
}

async function colourPredictionStore(req, res) {
  try {
    const body = req.body ?? {};
    const gameId = Number(body.game_id ?? body.gameid);
    const gamesno = String(body.game_no ?? body.gamesno ?? body.period_num ?? "");
    const number = Number(body.number ?? body.card_number);

    if (
      !gamesno ||
      !STANDARD_GAME_IDS.includes(gameId) ||
      !Number.isInteger(number) ||
      number < 0 ||
      (WINGO_GAME_IDS.includes(gameId) && number > 9)
    ) {
      return responseError(res, 400, "Invalid game_id, game_no, or number.");
    }

    const inserted = await serviceForGame(gameId).addAdminResult({
      period_num: gamesno,
      card_number: number,
      gameid: gameId,
    });

    return res.status(200).json({
      status: 200,
      message: inserted ? "Prediction stored successfully." : "Result for this period is already set!",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

module.exports = {
  autoWingoResultInsert,
  bet,
  betHistory,
  colourPredictionStore,
  cron,
  fetchAdminSetResults,
  fetchData,
  fetchHistory,
  gameSerialNo,
  getResults,
  lastFiveResults,
  lastResult,
  liveBets,
  livePools,
  adminBetHistory,
  results,
  winAmount,
};
