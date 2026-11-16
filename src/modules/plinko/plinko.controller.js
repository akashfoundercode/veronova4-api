"use strict";

const { PlinkoService } = require("./plinko.service");
const AppError = require("../../shared/errors/AppError");

const service = new PlinkoService();

function sendError(error, res) {
  if (!(error instanceof AppError)) {
    console.error("Plinko error:", error);
    return res.status(500).json({
      status: 500,
      message: error?.message || "Internal server error",
    });
  }
  return res.status(error.statusCode).json({
    status: error.statusCode,
    message: error.message,
  });
}

function getUserId(req) {
  return req.user?.id ? Number(req.user.id) : Number(req.body?.userid ?? req.query?.userid ?? req.body?.userId ?? req.query?.userId);
}

// ---------------------------------------------------------------------------
// Legacy Controllers
// ---------------------------------------------------------------------------

async function bet(req, res) {
  try {
    const payload = {
      ...(req.body ?? {}),
      userid: getUserId(req),
    };
    const result = await service.placeBet(payload);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(error, res);
  }
}

async function betNew(req, res) {
  try {
    const payload = {
      ...(req.body ?? {}),
      userid: getUserId(req),
    };
    const result = await service.placeBet(payload, { legacyWalletMode: true });
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
    const payload = {
      ...(req.body ?? {}),
      userid: getUserId(req),
    };
    const result = await service.calculateMultiplier(payload);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(error, res);
  }
}

async function result(req, res) {
  try {
    const userId = getUserId(req);
    const resultData = await service.getResults({
      userid: userId,
      limit: req.body?.limit ?? req.query.limit ?? 0,
      offset: req.body?.offset ?? req.query.offset ?? 0,
    });
    return res.status(resultData.status === 200 ? 200 : 400).json(resultData);
  } catch (error) {
    return sendError(error, res);
  }
}

// ---------------------------------------------------------------------------
// Plinko Arcade Player Controllers
// ---------------------------------------------------------------------------

/**
 * GET /api/plinko/config
 */
async function getConfig(req, res) {
  try {
    const data = await service.getConfig();
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * 1. POST /api/plinko/session/init
 */
async function sessionInit(req, res) {
  try {
    const userId = getUserId(req);
    const data = await service.initSession({ userId });
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * 2. POST /api/plinko/bet/drop
 */
async function betDrop(req, res) {
  try {
    const userId = getUserId(req);
    const { amount, bet: betAmt, tier, tierId, is_free, isFree } = req.body ?? {};
    const finalAmount = amount !== undefined ? amount : (betAmt !== undefined ? betAmt : 5);
    const finalTier = tier !== undefined ? tier : (tierId !== undefined ? tierId : 0);
    const free = is_free !== undefined ? is_free : Boolean(isFree);

    const data = await service.dropBall({
      userId,
      amount: finalAmount,
      tier: finalTier,
      isFree: free,
    });
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * 3. POST /api/plinko/bet/settle
 */
async function betSettle(req, res) {
  try {
    const userId = getUserId(req);
    const {
      drop_id,
      dropId,
      id,
      orderid,
      orderId,
      slot,
      mult,
      multiplier: multVal,
      payout,
      win_amount,
      is_out,
      isOut,
      tier,
    } = req.body ?? {};

    const targetDropId = drop_id ?? dropId ?? id;
    const targetOrderId = orderid ?? orderId;
    const targetMult = mult !== undefined ? mult : multVal;
    const targetPayout = payout !== undefined ? payout : win_amount;
    const targetOut = is_out !== undefined ? is_out : isOut;

    const data = await service.settleBet({
      userId,
      dropId: targetDropId,
      orderId: targetOrderId,
      slot,
      mult: targetMult,
      payout: targetPayout,
      isOut: targetOut,
      tier,
    });
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * 4. GET /api/plinko/bets/my-history
 */
async function myHistory(req, res) {
  try {
    const userId = getUserId(req);
    const limit = req.query.limit ?? req.body?.limit ?? 20;
    const offset = req.query.offset ?? req.body?.offset;
    const page = req.query.page ?? req.body?.page ?? 1;

    const data = await service.getMyHistory({
      userId,
      limit,
      offset,
      page,
    });
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * 5. GET /api/plinko/bets/live
 * Supports both standard JSON and Server-Sent Events (SSE) streaming
 */
async function liveBets(req, res) {
  try {
    const isStream = req.query.stream === "true" || req.headers.accept === "text/event-stream";

    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const initial = await service.getLiveBets({ limit: 10 });
      res.write(`data: ${JSON.stringify(initial.data)}\n\n`);

      const interval = setInterval(async () => {
        try {
          const fresh = await service.getLiveBets({ limit: 1 });
          res.write(`data: ${JSON.stringify(fresh.data)}\n\n`);
        } catch (_) {}
      }, 3000);

      req.on("close", () => {
        clearInterval(interval);
      });
      return;
    }

    const limit = req.query.limit ?? 20;
    const data = await service.getLiveBets({ limit });
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * 6. POST /api/plinko/game/action
 */
async function gameAction(req, res) {
  try {
    const userId = getUserId(req);
    const { action, ...payload } = req.body ?? {};
    const data = await service.handleGameAction({
      userId,
      action,
      payload,
    });
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

// ---------------------------------------------------------------------------
// Admin Controllers
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/plinko/settings
 */
async function adminGetSettings(req, res) {
  try {
    const data = await service.getAdminSettings();
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * POST /api/admin/plinko/settings
 */
async function adminUpdateSettings(req, res) {
  try {
    const data = await service.updateAdminSettings(req.body);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * POST /api/admin/plinko/control
 */
async function adminSetControl(req, res) {
  try {
    const data = await service.setAdminControl(req.body);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * GET /api/admin/plinko/bets
 */
async function adminGetBets(req, res) {
  try {
    const data = await service.getAdminBets(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

/**
 * GET /api/admin/plinko/dashboard
 */
async function adminGetDashboard(req, res) {
  try {
    const data = await service.getAdminDashboard();
    return res.status(200).json(data);
  } catch (error) {
    return sendError(error, res);
  }
}

module.exports = {
  // Legacy
  bet,
  betNew,
  indexList,
  multiplier,
  result,
  // Player
  getConfig,
  sessionInit,
  betDrop,
  betSettle,
  myHistory,
  liveBets,
  gameAction,
  // Admin
  adminGetSettings,
  adminUpdateSettings,
  adminSetControl,
  adminGetBets,
  adminGetDashboard,
  service,
};
