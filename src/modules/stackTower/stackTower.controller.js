"use strict";

const { StackTowerService } = require("./stackTower.service");
const AppError = require("../../shared/errors/AppError");

const service = new StackTowerService();

function resolveUserId(req) {
  if (req.user?.id) return Number(req.user.id);
  if (req.body?.userid) return Number(req.body.userid);
  if (req.body?.uid) return Number(req.body.uid);
  if (req.body?.user_id) return Number(req.body.user_id);
  if (req.query?.userid) return Number(req.query.userid);
  if (req.query?.uid) return Number(req.query.uid);
  if (req.query?.user_id) return Number(req.query.user_id);
  return 1; // Default fallback for local testing
}

async function handleRequest(res, action) {
  try {
    const result = await action();
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        status: error.statusCode || 400,
        success: false,
        message: error.message,
      });
    }
    console.error("[StackTowerController] Unexpected error:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: error.message || "Internal server error",
    });
  }
}

class StackTowerController {
  static async bet(req, res) {
    return handleRequest(res, () => {
      const payload = {
        ...(req.body || {}),
        userid: resolveUserId(req),
      };
      return service.placeBet(payload);
    });
  }

  static async cashout(req, res) {
    return handleRequest(res, () => {
      const payload = {
        ...(req.body || {}),
        userid: resolveUserId(req),
      };
      return service.cashout(payload);
    });
  }

  static async gameOver(req, res) {
    return handleRequest(res, () => {
      const payload = {
        ...(req.body || {}),
        userid: resolveUserId(req),
      };
      return service.gameOver(payload);
    });
  }

  static async history(req, res) {
    return handleRequest(res, () => {
      const payload = {
        ...(req.query || {}),
        ...(req.body || {}),
        userid: resolveUserId(req),
      };
      return service.getHistory(payload);
    });
  }

  static async config(req, res) {
    return handleRequest(res, () => service.getConfig());
  }

  static async userStats(req, res) {
    return handleRequest(res, () => {
      const payload = {
        ...(req.query || {}),
        ...(req.body || {}),
        userid: resolveUserId(req),
      };
      return service.getUserStats(payload);
    });
  }

  static async adminStats(req, res) {
    return handleRequest(res, () => {
      const q = req.query || {};
      const b = req.body || {};
      const filterUid = q.userid || q.uid || q.user_id || b.userid || b.uid || b.user_id;
      const payload = {
        ...q,
        ...b,
        userid: filterUid ? Number(filterUid) : null,
      };
      return service.getAdminStats(payload);
    });
  }

  static async dropObstacle(req, res) {
    return handleRequest(res, () => {
      const q = req.query || {};
      const b = req.body || {};
      const filterUid = b.userid || b.uid || b.user_id || q.userid || q.uid || q.user_id;
      const payload = {
        ...q,
        ...b,
        userid: filterUid ? Number(filterUid) : null,
      };
      return service.dropObstacle(payload);
    });
  }

  static async activeBets(req, res) {
    return handleRequest(res, () => {
      const q = req.query || {};
      const b = req.body || {};
      const payload = {
        ...q,
        ...b,
      };
      return service.getActiveBets(payload);
    });
  }

  static async roundStatus(req, res) {
    return handleRequest(res, () => {
      const payload = {
        ...(req.query || {}),
        ...(req.body || {}),
        userid: resolveUserId(req),
      };
      return service.getRoundStatus(payload);
    });
  }
}

module.exports = StackTowerController;

