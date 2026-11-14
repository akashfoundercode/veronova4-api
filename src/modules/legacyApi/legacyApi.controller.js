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
  giftRedeemList: (req, res) => run(res, () => {
    const userId = req.user?.id ?? req.query?.userid ?? req.query?.user_id ?? req.body?.userid ?? req.body?.user_id;
    return service.giftRedeemList(userId);
  }),
  applyGift: (req, res) => run(res, () => {
    const payload = {
      ...req.query,
      ...req.body,
      userid: req.user?.id ?? req.body?.userid ?? req.body?.user_id ?? req.query?.userid ?? req.query?.user_id,
      code: req.body?.code ?? req.body?.gift_code ?? req.query?.code ?? req.query?.gift_code,
    };
    return service.applyGift(payload);
  }),
  totalBetDetails: (req, res) => run(res, () => service.totalBetDetails(req.query)),
  beginnerGuide: (req, res) => run(res, () => {
    let host = null;
    try {
      host = typeof req.get === "function" ? req.get("host") : req.headers?.host;
    } catch (_) {}
    let proto = "https";
    try {
      proto = req.protocol || "https";
    } catch (_) {}
    const baseUrl = host ? `${proto}://${host}` : "https://root.veronova.co.in";
    return service.beginnerGuide({ baseUrl });
  }),
  aboutUs: (req, res) => run(res, () => service.aboutUs(req.query.type)),
  announcements: (_req, res) => run(res, () => service.announcements()),
  feedback: (req, res) => run(res, () => {
    const userId = req.user?.id ?? req.body?.userid ?? req.body?.user_id ?? req.query?.userid ?? req.query?.user_id;
    const description = req.body?.description ?? req.body?.feedback ?? req.body?.message ?? req.query?.description;
    return service.addFeedback({ userid: userId, description });
  }),
  getFeedback: (req, res) => run(res, () => {
    const userId = req.user?.id ?? req.query?.userid ?? req.query?.user_id ?? req.body?.userid ?? req.body?.user_id;
    return service.getFeedback({ userid: userId });
  }),
  service,
};
