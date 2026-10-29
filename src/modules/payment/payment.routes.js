"use strict";

const express = require("express");
const controller = require("./payment.controller");
const authenticate = require("../../middleware/authenticate");
const { optionalAuthenticate } = authenticate;
const { requireAdmin } = require("../horseRace/middleware/auth.middleware");

const router = express.Router();

router.use(optionalAuthenticate);

// 1. Innersoul Cares Payment Gateway
router.post("/innersoulcares", controller.innersoulcares);
router.get("/check-innersoul-payment", controller.checkInnersoulPayment);
router.post("/check-innersoul-payment", controller.checkInnersoulPayment);
router.get("/checkInnersoulPayment", controller.checkInnersoulPayment);

// 2. Payzaaar Gateway
router.post("/payzaaar", controller.innersoulcares);
router.post("/payzaaar-callback", controller.payzaaarCallback);
router.get("/check-payzaar-payment", controller.checkPayzaaarPayment);
router.post("/decode_data", (req, res) => res.json({ status: 200, message: "Decoded successfully" }));

// 3. Standard Payin (Type 2)
router.post("/payin", controller.payin);
router.get("/checkPayment", controller.checkPayment);
router.get("/finixpay", controller.checkPayment);

// 4. LG Pay Gateway
router.post("/lg-pay-payin", controller.lgPayPayin);
router.get("/lg-pay-checkPayment", controller.lgPayCallback);
router.post("/lg-pay-checkPayment", controller.lgPayCallback);

// 5. USDT Payin & Account
router.get("/get_usdt", controller.getUsdt);
router.post("/usdt_payin", controller.usdtPayin);
router.post("/usdt", controller.usdt);
router.post("/usdt_callback", controller.usdtCallback);
router.post("/usdt_withdraw", controller.usdtWithdraw);
router.get("/usdt_account_view", controller.usdtAccountView);
router.post("/usdt_account_view", controller.usdtAccountView);
router.post("/add_usdt_address", controller.addUsdtAddress);

// 6. User Withdrawal & Account Details
router.post("/withdraw", controller.withdraw);
router.get("/deposit_history", controller.depositHistory);
router.post("/deposit_history", controller.depositHistory);
router.get("/withdraw_history", controller.withdrawHistory);
router.post("/withdraw_history", controller.withdrawHistory);
router.get("/Account_view", controller.accountView);
router.post("/Account_view", controller.accountView);
router.post("/add_account", controller.addAccount);

// 7. Payment Modes & Limits
router.get("/pay_modes", controller.payModes);
router.post("/pay_modes", controller.payModes);
router.get("/payment-limits", controller.getPaymentLimits);
router.get("/getPaymentLimits", controller.getPaymentLimits);
router.post("/update-wallet", requireAdmin, controller.deductAmount);

// 8. SkillPay & Other Gateway Aliases
router.post("/Skillpay", controller.payin);
router.post("/skillpaycallback", controller.payzaaarCallback);
router.post("/skillpay_payin", controller.payin);
router.get("/checkSkillPayOrderId", controller.checkPayment);
router.post("/userpayin", controller.payin);
router.post("/callbackfunc", controller.payzaaarCallback);
router.post("/callbackfunc_payout", (req, res) => res.json({ status: 200, message: "Payout callback processed" }));
router.post("/payin_call_back", controller.payzaaarCallback);
router.get("/payin-successfully", (req, res) => res.redirect("https://root.veronova.co.in/uploads/payment_success.php"));
router.get("/camlenio", controller.checkPayment);
router.post("/camleniopaycallback", controller.payzaaarCallback);

module.exports = router;
