"use strict";

const agencyService = require("./agency.service");

function extractUserId(req) {
  return (
    req.params?.id ||
    req.query?.id ||
    req.query?.user_id ||
    req.query?.userid ||
    req.body?.id ||
    req.body?.user_id ||
    req.body?.userid ||
    req.user?.id ||
    req.auth?.tokenId ||
    req.headers?.["user-id"] ||
    req.headers?.userid
  );
}

async function getPromotionData(req, res, next) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "User ID is required",
      });
    }

    const result = await agencyService.getPromotionData(userId);
    if (result.notFound) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: result.message || "User not found",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getNewSubordinates(req, res, next) {
  try {
    const userId = extractUserId(req);
    const type = req.query?.type || req.body?.type || 1;

    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: "User ID is required",
      });
    }

    const result = await agencyService.getNewSubordinates({ userId, type });
    return res.status(result.status || 200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getTiers(req, res, next) {
  try {
    const result = await agencyService.getTiers();
    return res.status(result.status || 200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getSubordinateData(req, res, next) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: "The id field is required.",
      });
    }

    const tier = req.query?.tier ?? req.body?.tier ?? 0;
    const createdAt = req.query?.created_at ?? req.body?.created_at ?? null;
    const searchUid = req.query?.u_id ?? req.body?.u_id ?? null;

    const result = await agencyService.getSubordinateData({
      userId,
      tier,
      createdAt,
      searchUid,
    });
    return res.status(result.status || 200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function calculateTurnovers(req, res, next) {
  try {
    const result = await agencyService.calculateTurnoverCommissions();
    return res.status(result.status || 200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPromotionData,
  getNewSubordinates,
  getTiers,
  getSubordinateData,
  calculateTurnovers,
};

