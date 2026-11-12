"use strict";

const express = require("express");
const controller = require("./otp.controller");

const router = express.Router();

// 1. Send OTP Routes (Supports both POST & GET, kebab-case & snake_case)
router.post("/otp/send", controller.sendOtp);
router.get("/otp/send", controller.sendOtp);
router.post("/send-otp", controller.sendOtp);
router.get("/send-otp", controller.sendOtp);
router.post("/send_otp", controller.sendOtp);
router.get("/send_otp", controller.sendOtp);
router.post("/newsend_otp", controller.sendOtp);
router.get("/newsend_otp", controller.sendOtp);
router.post("/newsend_otp.php", controller.sendOtp);
router.get("/newsend_otp.php", controller.sendOtp);

// 2. Verify OTP Routes (Supports both POST & GET)
router.post("/otp/verify", controller.verifyOtp);
router.get("/otp/verify", controller.verifyOtp);
router.post("/verify-otp", controller.verifyOtp);
router.get("/verify-otp", controller.verifyOtp);
router.post("/verify_otp", controller.verifyOtp);
router.get("/verify_otp", controller.verifyOtp);

// 3. Resend OTP Routes
router.post("/otp/resend", controller.resendOtp);
router.get("/otp/resend", controller.resendOtp);
router.post("/resend-otp", controller.resendOtp);

module.exports = router;

