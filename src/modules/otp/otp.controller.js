"use strict";

const { OtpService } = require("./otp.service");
const AppError = require("../../shared/errors/AppError");

const service = new OtpService();

function extractParams(req) {
  return {
    ...(req.query || {}),
    ...(req.body || {}),
  };
}

async function handleAction(res, fn) {
  try {
    const result = await fn();
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        status: error.statusCode || 400,
        success: false,
        message: error.message,
      });
    }
    console.error("[OtpController] Error:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: error.message || "Internal server error",
    });
  }
}

class OtpController {
  static async sendOtp(req, res) {
    return handleAction(res, () => service.sendOtp(extractParams(req)));
  }

  static async verifyOtp(req, res) {
    return handleAction(res, () => service.verifyOtp(extractParams(req)));
  }

  static async resendOtp(req, res) {
    return handleAction(res, () => service.resendOtp(extractParams(req)));
  }
}

module.exports = OtpController;

