"use strict";

const AppError = require("../../shared/errors/AppError");
const { DragonTigerService, DRAGON_TIGER_GAME_ID } = require("./dragonTiger.service");
const { getDragonTigerSocket } = require("./dragonTiger.socket");

const service = new DragonTigerService();

function responseError(res, status, message) {
  return res.status(200).json({ status, message });
}

function assertAuthenticatedUser(req, res, userid) {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      status: 401,
      message: "Unauthenticated",
    });
    return false;
  }
  if (userid !== undefined && userid !== null && Number(userid) !== Number(req.user.id)) {
    res.status(403).json({
      status: 403,
      message: "The userid does not match the authenticated account.",
    });
    return false;
  }
  return true;
}

/**
 * Clean & minimal Place Bet endpoint:
 * POST /api/dragon/bet
 * Accepts:
 * - { spot: "dragon" | "tiger" | "tie", amount: 100 }
 * - OR { dragon: 100, tiger: 0, tie: 50 }
 * - OR { json: [{ number: 1, amount: 100 }] }
 */
async function placeBet(req, res) {
  const body = req.body ?? {};
  const userid = req.user ? req.user.id : body.userid;
  if (!assertAuthenticatedUser(req, res, userid)) return;

  const socketInstance = getDragonTigerSocket();
  if (socketInstance && socketInstance.state && socketInstance.state.status === "revealing") {
    return res.status(400).json({
      status: 400,
      message: "Betting closed for current round. Please wait for the next round to start.",
    });
  }

  try {
    let betsInput;
    if (body.json) {
      betsInput = typeof body.json === "string" ? JSON.parse(body.json) : body.json;
    } else if (body.bets) {
      betsInput = typeof body.bets === "string" ? JSON.parse(body.bets) : body.bets;
    } else if (body.spot && body.amount) {
      betsInput = { spot: body.spot, amount: body.amount };
    } else if (body.number && body.amount) {
      betsInput = { spot: Number(body.number) === 2 ? "tiger" : Number(body.number) === 3 ? "tie" : "dragon", amount: body.amount };
    } else {
      betsInput = {
        dragon: body.dragon || 0,
        tiger: body.tiger || 0,
        tie: body.tie || 0,
      };
    }

    const result = await service.placeSingleOrMultiBet({
      userid: Number(userid),
      bets: betsInput,
      game_id: DRAGON_TIGER_GAME_ID,
    });

    // Real-time broadcast to Socket 2 (Admin Live Stream) & Socket 1
    if (socketInstance && Array.isArray(result.bets)) {
      for (const b of result.bets) {
        socketInstance.recordLiveBet({
          userid: b.userid,
          username: req.user.username || req.user.mobile,
          spot: b.spot,
          amount: b.amount,
          id: b.id,
        });
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
    }
    throw error;
  }
}

/**
 * Returns last 120 rounds Dragon Tiger results
 * Output format: 'D' for Dragon, 'T' for Tiger, 'Tie' for Tie
 * GET /api/dragon/results
 */
async function getResults(req, res) {
  try {
    const results = await service.getLast120Results(DRAGON_TIGER_GAME_ID);
    return res.status(200).json({
      status: 200,
      message: "Data found",
      total_results: results.length,
      data: results,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
    }
    throw error;
  }
}

/**
 * Returns current round status, period, and timer
 * GET /api/dragon/current-round
 */
async function getCurrentRound(req, res) {
  try {
    const socketInstance = getDragonTigerSocket();
    const period = socketInstance?.state?.period || (await service.getCurrentPeriod(DRAGON_TIGER_GAME_ID));
    const status = socketInstance?.state?.status || "betting";
    const timeRemaining = socketInstance?.state?.time_remaining ?? 15;

    return res.status(200).json({
      status: 200,
      period,
      game_id: DRAGON_TIGER_GAME_ID,
      game_status: status,
      time_remaining: timeRemaining,
      total_bet_time: 15,
      total_reveal_time: 8,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
    }
    throw error;
  }
}

/**
 * Admin API to force winner for current/upcoming round:
 * POST /api/admin/dragon/control
 * Body: { winner: "D" | "T" | "Tie" | "auto" }
 */
async function adminControl(req, res) {
  const body = req.body ?? {};
  const winner = body.winner || body.result || body.card_number;
  if (!winner) {
    return res.status(400).json({
      status: 400,
      message: "Winner parameter is required (D, T, Tie, or auto)",
    });
  }

  try {
    const socketInstance = getDragonTigerSocket();
    const period = body.period || socketInstance?.state?.period;
    const result = await service.setAdminForce({
      winner,
      period,
      gameId: DRAGON_TIGER_GAME_ID,
    });
    return res.status(200).json({
      status: 200,
      message: `Result force configured successfully to ${result.winner}`,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
    }
    throw error;
  }
}

/**
 * Admin API to retrieve current active round bets & stats:
 * GET /api/admin/dragon/bets
 */
async function adminLiveBets(req, res) {
  try {
    const socketInstance = getDragonTigerSocket();
    const period = req.query.period || socketInstance?.state?.period;
    const data = await service.getCurrentRoundBets(period, DRAGON_TIGER_GAME_ID);
    return res.status(200).json({
      status: 200,
      message: "Live round bets retrieved",
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ status: error.statusCode, message: error.message });
    }
    throw error;
  }
}

// ---------------- Legacy Methods for Backward Compatibility ----------------

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
  const body = req.body ?? req.query ?? {};
  const userid = req.user ? req.user.id : body.userid;
  if (!assertAuthenticatedUser(req, res, userid)) return;
  const limit = body.limit === undefined || body.limit === "" ? 10000 : Number(body.limit);
  const offset = body.offset === undefined || body.offset === "" ? 0 : Number(body.offset);
  if (!Number.isInteger(limit) || limit < 0 || !Number.isInteger(offset) || offset < 0) {
    return responseError(res, 400, "The limit and offset must be non-negative integers.");
  }
  try {
    const { rows, totalBets } = await service.getBetHistory({
      userid: Number(userid),
      game_id: DRAGON_TIGER_GAME_ID,
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
  placeBet,
  getResults,
  getCurrentRound,
  adminControl,
  adminLiveBets,
  betHistory,
  placeBatchBet,
  placeSharedBet,
  service,
};
