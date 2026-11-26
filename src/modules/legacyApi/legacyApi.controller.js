"use strict";

const { LegacyApiService } = require("./legacyApi.service");
const { AuthService } = require("../auth/auth.service");
const { parseBearerToken } = require("../../middleware/authenticate");
const AppError = require("../../shared/errors/AppError");

const service = new LegacyApiService();
const authService = new AuthService();

async function resolveOptionalUserId(req) {
  const directId =
    req.user?.id ??
    req.body?.userid ??
    req.body?.user_id ??
    req.body?.userId ??
    req.body?.uid ??
    req.query?.userid ??
    req.query?.user_id ??
    req.query?.userId ??
    req.query?.uid;
  if (directId !== undefined && directId !== null && String(directId).trim() !== "") {
    return directId;
  }
  const authHeader =
    (typeof req.get === "function" ? req.get("authorization") : req.headers?.authorization) ||
    req.headers?.token ||
    req.query?.token ||
    req.body?.token;
  const parsed = parseBearerToken(authHeader);
  if (parsed) {
    try {
      const user = await authService.getUserForToken(parsed);
      if (user?.id) return user.id;
    } catch (_) {}
  }
  return undefined;
}

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
  giftRedeemList: (req, res) => run(res, async () => {
    const userId = await resolveOptionalUserId(req);
    return service.giftRedeemList(userId);
  }),
  applyGift: (req, res) => run(res, async () => {
    const userId = await resolveOptionalUserId(req);
    const payload = {
      ...req.query,
      ...req.body,
      userid: userId,
      code:
        req.body?.code ??
        req.body?.gift_code ??
        req.body?.giftCode ??
        req.body?.gift ??
        req.body?.coupon ??
        req.query?.code ??
        req.query?.gift_code ??
        req.query?.giftCode ??
        req.query?.gift ??
        req.query?.coupon,
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
  support: (_req, res) => run(res, () => service.support()),
  contactUs: (_req, res) => run(res, () => service.contactUs()),
  service,
};
