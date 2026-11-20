"use strict";

const AppError = require("../../shared/errors/AppError");
const { DragonTigerService, DRAGON_TIGER_GAME_ID } = require("./dragonTiger.service");
const { normalizeWinner, winnerToNumber, dealWinningCards } = require("./dragonTigerDeck");
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
  const currentPhase = socketInstance?.state?.phase;
  if (currentPhase && currentPhase !== "betting" && currentPhase !== "place_bet_popup") {
    return res.status(400).json({
      status: 400,
      message: "Betting closed for current round. Please wait for the betting window to start.",
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
    const phase = socketInstance?.state?.phase || "betting";
    const status = socketInstance?.state?.status || phase;
    const timeRemaining = socketInstance?.state?.time_remaining ?? 15;
    const phaseDuration = socketInstance?.state?.phase_duration ?? 15;
    const isRevealOrWinner = phase === "revealing" || phase === "winner_popup";

    const activeForceObj = socketInstance?.service?.inMemoryForce || service.inMemoryForce || null;
    let activeWinner = activeForceObj?.winner && activeForceObj.winner !== "auto" ? activeForceObj.winner : null;
    let activeCards = activeForceObj?.cards || null;
    let activeWinNumber = activeForceObj?.win_number || (activeWinner ? winnerToNumber(activeWinner) : null);
    let activeMultiplier = activeForceObj?.multiplier || null;

    if (!activeWinner) {
      try {
        const forceFromDb = await service.getAdminForce(period, DRAGON_TIGER_GAME_ID);
        if (forceFromDb && forceFromDb !== "auto") {
          activeWinner = forceFromDb;
          const freshForce = service.inMemoryForce;
          activeCards = freshForce?.cards || null;
          activeWinNumber = freshForce?.win_number || winnerToNumber(forceFromDb);
          activeMultiplier = freshForce?.multiplier || null;
        }
      } catch (_) {}
    }

    const currentCards = (isRevealOrWinner ? socketInstance?.state?.current_cards : null) || activeCards || null;
    const currentWinner = (isRevealOrWinner ? socketInstance?.state?.current_winner : null) || activeWinner || null;
    const winNumber = (isRevealOrWinner ? (socketInstance?.state?.last_settled?.win_number ?? (currentWinner ? winnerToNumber(currentWinner) : null)) : null) || activeWinNumber || null;
    const currentMultiplier = (isRevealOrWinner ? socketInstance?.state?.multiplier : null) || activeMultiplier || null;

    return res.status(200).json({
      status: 200,
      period,
      game_id: DRAGON_TIGER_GAME_ID,
      phase,
      game_status: status,
      time_remaining: timeRemaining,
      phase_duration: phaseDuration,
      admin_force: activeWinner,
      winner: currentWinner,
      win_number: winNumber,
      cards: currentCards,
      multiplier: currentMultiplier,
      last_settled: socketInstance?.state?.last_settled || null,
      timings: {
        versus: 4,
        place_bet_popup: 2,
        betting: 15,
        revealing: 6,
        winner_popup: 5,
      },
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
  const body = { ...(req.query || {}), ...(req.body || {}) };
  const rawWinner = body.winner ?? body.result ?? body.card_number ?? body.number;
  if (rawWinner === undefined || rawWinner === null || rawWinner === "") {
    return res.status(400).json({
      status: 400,
      message: "Winner parameter is required (1/D/Dragon, 2/T/Tiger, 3/Tie, or 0/auto)",
    });
  }
  const normWinner = normalizeWinner(rawWinner);
  if (!normWinner) {
    return res.status(400).json({
      status: 400,
      message: "Invalid winner. Must be 1/D/Dragon, 2/T/Tiger, 3/Tie, or 0/auto",
    });
  }

  try {
    const socketInstance = getDragonTigerSocket();
    const period = body.period ?? body.game_no ?? body.gamesno ?? socketInstance?.state?.period;

    // Use controller's service and sync to socket's service if available
    const activeService = service;
    const result = await activeService.setAdminForce({
      winner: normWinner,
      period,
      gameId: DRAGON_TIGER_GAME_ID,
    });
    if (socketInstance?.service && socketInstance.service !== service) {
      socketInstance.service.inMemoryForce = activeService.inMemoryForce;
    }

    if (socketInstance) {
      if (typeof socketInstance.emitClientState === "function") {
        socketInstance.emitClientState();
      }
      if (typeof socketInstance.emitAdminState === "function") {
        socketInstance.emitAdminState();
      }
      const broadcastPayload = {
        period: result.period,
        winner: result.winner,
        win_number: result.win_number,
        multiplier: result.multiplier,
        cards: result.cards,
        admin_force: result.winner,
      };
      try {
        if (socketInstance.io?.emit) {
          socketInstance.io.emit("dragon_tiger:force_applied", broadcastPayload);
        }
      } catch (_) {}
    }

    return res.status(200).json({
      status: 200,
      message: `Dragon Tiger result forced successfully to ${result.winner} (${result.win_number ?? result.winner})`,
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
