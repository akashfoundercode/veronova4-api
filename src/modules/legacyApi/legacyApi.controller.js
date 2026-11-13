"use strict";

const { LegacyApiService } = require("./legacyApi.service");
const AppError = require("../../shared/errors/AppError");

const service = new LegacyApiService();

async function run(res, action) {
  try {
    return res.status(200).json(await action());
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({ status: error.statusCode || 400, message: error.message });
    }
    throw error;
  }
}

module.exports = {
  giftRedeemList: (req, res) => run(res, () => service.giftRedeemList(req.query.userid ?? req.query.user_id)),
  applyGift: (req, res) => run(res, () => service.applyGift(req.body ?? {})),
  totalBetDetails: (req, res) => run(res, () => service.totalBetDetails(req.query)),
};
