"use strict";

const { MinesNewService } = require("./minesNew.service");
const AppError = require("../../shared/errors/AppError");

const service = new MinesNewService();

async function handle(res, action) {
  try {
    return res.status(200).json(await action());
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        status: error.statusCode || 400,
        code: error.code,
        message: error.message,
      });
    }
    throw error;
  }
}

module.exports = {
  service,
  start: (req, res) =>
    handle(res, () =>
      service.startRound({
        userId: req.user?.id,
        betAmount: req.body?.betAmount ?? req.body?.amount,
        minesCount: req.body?.minesCount ?? req.body?.mines_count ?? req.body?.mines,
      }),
    ),
  reveal: (req, res) =>
    handle(res, () =>
      service.revealTile({
        userId: req.user?.id,
        roundId: req.body?.roundId ?? req.body?.round_id,
        tileIndex: req.body?.tileIndex ?? req.body?.tile_index,
      }),
    ),
  cashout: (req, res) =>
    handle(res, () =>
      service.cashout({
        userId: req.user?.id,
        roundId: req.body?.roundId ?? req.body?.round_id,
      }),
    ),
  active: (req, res) => handle(res, () => service.getActiveRound(req.user?.id)),
  history: (req, res) =>
    handle(res, () =>
      service.getHistory({
        userId: req.user?.id,
        limit: req.query?.limit,
      }),
    ),
  walletBalance: (req, res) => handle(res, () => service.getWalletBalance(req.user?.id)),
  addFunds: (req, res) =>
    handle(res, () =>
      service.addFunds({
        userId: req.user?.id,
        amount: req.body?.amount,
      }),
    ),
  leaderboard: (req, res) => handle(res, () => service.getLeaderboard(req.query?.limit)),
};
