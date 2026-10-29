"use strict";

const AppError = require("../../shared/errors/AppError");
const { AviatorService } = require("./aviator.service");

let service = new AviatorService();

function setService(customService) {
  service = customService;
}

function responseError(res, status, message) {
  return res.status(status === 400 ? 200 : status).json({ status, message });
}

function validateBetInput(input, user = null) {
  const uid = Number(input.uid ?? input.userId ?? input.userid ?? input.user_id ?? user?.id);
  const gameId = Number(input.game_id ?? 5);
  const amount = Number(input.amount ?? input.bet_amount ?? input.betAmount);
  const number = input.number !== undefined && input.number !== "" ? Number(input.number) : 1;
  const gameSerial = input.game_sr_num ?? input.games_no ?? input.game_sr ?? input.period ?? "";

  if (!Number.isInteger(uid) || uid < 1) {
    throw new AppError(400, "VALIDATION_ERROR", "The uid field is required.");
  }
  if (!Number.isInteger(number)) {
    throw new AppError(400, "VALIDATION_ERROR", "The number field is required.");
  }
  if (input.amount === undefined || input.amount === "" || !Number.isFinite(amount) || amount < 1) {
    throw new AppError(400, "VALIDATION_ERROR", "The amount must be at least 1.");
  }
  if (gameId !== 5) {
    throw new AppError(400, "VALIDATION_ERROR", "The selected game_id is invalid.");
  }

  const stopMultiplier = input.stop_multiplier === undefined || input.stop_multiplier === ""
    ? 0
    : Number(input.stop_multiplier);
  if (!Number.isFinite(stopMultiplier) || stopMultiplier < 0) {
    throw new AppError(400, "VALIDATION_ERROR", "The stop_multiplier must be a non-negative number.");
  }

  return {
    uid,
    game_id: gameId,
    amount,
    number,
    game_sr_num: String(gameSerial),
    stop_multiplier: stopMultiplier,
  };
}

async function runBet(req, res, legacyWalletMode) {
  try {
    const source = req.method === "GET" ? req.query : req.body;
    const input = validateBetInput(source ?? {}, req.user);
    const result = await service.placeBet(input, { legacyWalletMode });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 400) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function bet(req, res) {
  return runBet(req, res, false);
}

async function betNew(req, res) {
  return runBet(req, res, true);
}

function decodeCashout(salt) {
  if (typeof salt !== "string" || salt.length === 0 || salt.length > 4096) {
    throw new AppError(400, "VALIDATION_ERROR", "The salt field is required.");
  }
  const normalizedSalt = salt.replace(/ /g, "+");
  let decoded;
  try {
    const buffer = Buffer.from(normalizedSalt, "base64");
    if (buffer.toString("base64").replace(/=+$/, "") !== normalizedSalt.replace(/=+$/, "")) {
      throw new Error("Invalid base64");
    }
    decoded = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "The salt must contain valid base64-encoded JSON.");
  }

  const uid = Number(decoded?.uid);
  const number = Number(decoded?.number);
  const multiplier = Number(decoded?.multiplier);
  if (!Number.isInteger(uid) || uid < 1 || !Number.isInteger(number) ||
      !Number.isFinite(multiplier) || multiplier <= 0 ||
      decoded?.game_sr_num === undefined || String(decoded.game_sr_num).trim() === "") {
    throw new AppError(400, "VALIDATION_ERROR", "The salt payload must include valid uid, number, multiplier, and game_sr_num.");
  }

  return {
    uid,
    number,
    multiplier,
    game_sr_num: String(decoded.game_sr_num),
  };
}

async function cashout(req, res) {
  try {
    const rawSalt = Array.isArray(req.body?.salt)
      ? req.body.salt[0]
      : (req.body?.salt ?? (Array.isArray(req.query?.salt) ? req.query.salt[0] : req.query?.salt));
    const result = await service.cashout(decodeCashout(rawSalt));
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 400) {
      return responseError(res, 400, error.message);
    }
    throw error;
  }
}

async function history(req, res) {
  const body = req.body ?? {};
  const uid = Number(body.uid);
  const gameId = Number(body.game_id);
  const limit = body.limit === undefined || body.limit === "" ? 10000 : Number(body.limit);
  const offset = body.offset === undefined || body.offset === "" ? 0 : Number(body.offset);
  if (!Number.isInteger(uid) || uid < 1) {
    return responseError(res, 400, "The uid field is required.");
  }
  if (!Number.isInteger(gameId) || gameId !== 5) {
    return responseError(res, 400, "The game_id field is required.");
  }
  if (!Number.isInteger(limit) || limit < 0 || limit > 10000) {
    return responseError(res, 400, "The limit must be an integer between 0 and 10000.");
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return responseError(res, 400, "The offset must be a non-negative integer.");
  }
  const createdAt = body.created_at;
  if (createdAt !== undefined && (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt)))) {
    return responseError(res, 400, "The created_at field must be a valid date.");
  }

  const data = await service.getHistory({ uid, game_id: gameId, limit, offset, created_at: createdAt });
  if (data.length === 0) {
    return res.status(400).json({ status: 400, message: "No Data found", data });
  }
  return res.status(200).json({ status: 200, message: "Data found", data });
}

async function lastFiveResult(req, res) {
  const data = await service.getLastFiveResults();
  if (data.length === 0) {
    return res.status(400).json({ status: "400", message: "Data Not Found" });
  }
  return res.status(200).json({ status: "200", message: "success", data });
}

async function betCancel(req, res) {
  const uid = Number(req.query.userid);
  const number = Number(req.query.number);
  const gameSerial = req.query.gamesno;
  if (!Number.isInteger(uid) || uid < 1) {
    return responseError(res, 400, "The userid field is required.");
  }
  if (req.query.number === undefined || !Number.isInteger(number)) {
    return responseError(res, 400, "The number field is required.");
  }
  if (gameSerial === undefined || String(gameSerial).trim() === "") {
    return responseError(res, 400, "The gamesno field is required.");
  }
  const result = await service.cancelBet({
    uid,
    number,
    game_sr_num: String(gameSerial),
  });
  return res.status(200).json(result);
}

const { AdminService } = require("../admin/admin.service");
const adminService = new AdminService();

async function telemetry(req, res) {
  try {
    const data = await adminService.getAviatorTelemetry(req.query);
    return res.status(200).json({
      status: 200,
      message: "Aviator telemetry and drop history fetched successfully",
      data,
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

async function drops(req, res) {
  try {
    const data = await adminService.getAviatorTelemetry(req.query);
    return res.status(200).json({
      status: 200,
      message: "Aviator drop history fetched successfully",
      data: data.drop_history,
      pagination: data.pagination,
      total_drops: data.pagination?.total || data.drop_history.length,
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

async function roundSettings(req, res) {
  try {
    const data = await service.getNextRoundSettings();
    return res.status(200).json(data);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
    }
    return res.status(500).json({ status: 500, message: error.message });
  }
}

async function insertResult(req, res) {
  try {
    const payload = { ...(req.query || {}), ...(req.body || {}) };
    const multiplier = Number(payload.adminmultiply ?? payload.multiplier ?? payload.price ?? payload.crash_point ?? 0);
    const gameSrNum = String(payload.game_sr ?? payload.game_sr_num ?? payload.period ?? payload.game_id ?? "");
    if (!gameSrNum) {
      return res.status(400).json({ status: 400, message: "game_sr is required" });
    }
    if (!multiplier || multiplier <= 0) {
      return res.status(400).json({ status: 400, message: "adminmultiply must be greater than 0" });
    }
    const result = await service.settleRound({ game_sr_num: gameSrNum, multiplier });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
    }
    return res.status(500).json({ status: 500, message: error.message });
  }
}

module.exports = {
  adminService,
  bet,
  betCancel,
  betNew,
  cashout,
  decodeCashout,
  drops,
  history,
  insertResult,
  lastFiveResult,
  roundSettings,
  setService,
  telemetry,
  validateBetInput,
};
