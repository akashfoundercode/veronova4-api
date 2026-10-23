"use strict";

const AppError = require("../../shared/errors/AppError");
const { DragonTigerService } = require("./dragonTiger.service");

const service = new DragonTigerService();

function responseError(res, status, message) {
  return res.status(200).json({ status, message });
}

function assertAuthenticatedUser(req, res, userid) {
  if (Number(userid) !== Number(req.user.id)) {
    res.status(403).json({
      status: 403,
      message: "The userid does not match the authenticated account.",
    });
    return false;
  }
  return true;
}

async function placeBatchBet(req, res) {
  const body = req.body ?? {};
  if (!assertAuthenticatedUser(req, res, body.userid)) return;
  try {
    const result = await service.placeBets({
      userid: body.userid,
      game_id: body.game_id,
      bets: body.json,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError) return responseError(res, error.statusCode, error.message);
    throw error;
  }
}

async function placeSharedBet(req, res) {
  const body = req.body ?? {};
  if (!assertAuthenticatedUser(req, res, body.userid)) return;
  try {
    const result = await service.placeBets({
      userid: body.userid,
      game_id: body.game_id,
      bets: [{ number: body.number, amount: body.amount }],
      chargeCommission: true,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError) return responseError(res, error.statusCode, error.message);
    throw error;
  }
}

async function betHistory(req, res) {
  const body = req.body ?? {};
  if (!assertAuthenticatedUser(req, res, body.userid)) return;
  const limit = body.limit === undefined || body.limit === "" ? 10000 : Number(body.limit);
  const offset = body.offset === undefined || body.offset === "" ? 0 : Number(body.offset);
  if (!Number.isInteger(limit) || limit < 0 || !Number.isInteger(offset) || offset < 0) {
    return responseError(res, 400, "The limit and offset must be non-negative integers.");
  }
  try {
    const { rows, totalBets } = await service.getBetHistory({
      userid: Number(body.userid),
      game_id: body.game_id,
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
    if (error instanceof AppError) return responseError(res, error.statusCode, error.message);
    throw error;
  }
}

module.exports = {
  betHistory,
  placeBatchBet,
  placeSharedBet,
  service,
};
