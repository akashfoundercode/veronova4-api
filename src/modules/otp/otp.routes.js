"use strict";

const express = require("express");
const controller = require("./otp.controller");

const router = express.Router();

// 1. Send OTP Routes (Supports both POST & GET, kebab-case & snake_case)
router.post("/send", controller.sendOtp);
router.get("/send", controller.sendOtp);
router.post("/otp/send", controller.sendOtp);
router.get("/otp/send", controller.sendOtp);
router.post("/send-otp", controller.sendOtp);
router.get("/send-otp", controller.sendOtp);
router.post("/send_otp", controller.sendOtp);
router.get("/send_otp", controller.sendOtp);
router.post("/sendOtp", controller.sendOtp);
router.get("/sendOtp", controller.sendOtp);
router.post("/otp", controller.sendOtp);
router.get("/otp", controller.sendOtp);
router.post("/newsend_otp", controller.sendOtp);
router.get("/newsend_otp", controller.sendOtp);
router.post("/newsend_otp.php", controller.sendOtp);
router.get("/newsend_otp.php", controller.sendOtp);

// 2. Verify OTP Routes (Supports /verify, /verify-otp, /verify_otp, /otp/verify)
router.post("/verify", controller.verifyOtp);
router.get("/verify", controller.verifyOtp);
router.post("/otp/verify", controller.verifyOtp);
router.get("/otp/verify", controller.verifyOtp);
router.post("/verify-otp", controller.verifyOtp);
router.get("/verify-otp", controller.verifyOtp);
router.post("/verify_otp", controller.verifyOtp);
router.get("/verify_otp", controller.verifyOtp);
router.post("/verifyOtp", controller.verifyOtp);
router.get("/verifyOtp", controller.verifyOtp);
router.post("/otp-verify", controller.verifyOtp);
router.get("/otp-verify", controller.verifyOtp);
router.post("/otp_verify", controller.verifyOtp);
router.get("/otp_verify", controller.verifyOtp);

// 3. Resend OTP Routes
router.post("/resend", controller.resendOtp);
router.get("/resend", controller.resendOtp);
router.post("/otp/resend", controller.resendOtp);
router.get("/otp/resend", controller.resendOtp);
router.post("/resend-otp", controller.resendOtp);
router.get("/resend-otp", controller.resendOtp);
router.post("/resend_otp", controller.resendOtp);
router.get("/resend_otp", controller.resendOtp);

module.exports = router;

