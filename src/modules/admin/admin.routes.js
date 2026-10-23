"use strict";

const express = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/requireAdmin");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./admin.controller");

const router = express.Router();

// Dashboard & Counts
router.get(API_ROUTES.admin.dashboard, authenticate, requireAdmin, controller.dashboard);
router.get(API_ROUTES.admin.dashboardCounts, authenticate, requireAdmin, controller.dashboardCounts);

// Player Directory & Management
router.get(API_ROUTES.admin.players, authenticate, requireAdmin, controller.getPlayers);
router.post(API_ROUTES.admin.players, authenticate, requireAdmin, controller.addPlayer);
router.get(API_ROUTES.admin.playerDetails, authenticate, requireAdmin, controller.getPlayerById);
router.post(API_ROUTES.admin.playerStatus, authenticate, requireAdmin, controller.updatePlayerStatus);

// Attendance Management (GET & POST)
router.get(API_ROUTES.admin.attendance, authenticate, requireAdmin, controller.getAttendance);
router.post(API_ROUTES.admin.attendance, authenticate, requireAdmin, controller.saveAttendance);
router.get(API_ROUTES.admin.attendanceItem, authenticate, requireAdmin, controller.getAttendance);
router.post(API_ROUTES.admin.attendanceItem, authenticate, requireAdmin, controller.saveAttendance);

// Fund Transfer from Admin (POST to Transfer & GET for History)
router.post(API_ROUTES.admin.fundTransfer, authenticate, requireAdmin, controller.transferFund);
router.get(API_ROUTES.admin.fundTransfer, authenticate, requireAdmin, controller.getFundTransferHistory);
router.get(API_ROUTES.admin.fundTransferHistory, authenticate, requireAdmin, controller.getFundTransferHistory);
router.get("/admin/fund-transfer/:id", authenticate, requireAdmin, controller.getFundTransferHistory);

// VIP Level Management (GET & POST)
router.get(API_ROUTES.admin.vipLevels, authenticate, requireAdmin, controller.getVipLevels);
router.post(API_ROUTES.admin.vipLevels, authenticate, requireAdmin, controller.saveVipLevel);
router.get(API_ROUTES.admin.vipLevelItem, authenticate, requireAdmin, controller.getVipLevels);
router.post(API_ROUTES.admin.vipLevelItem, authenticate, requireAdmin, controller.saveVipLevel);

// Login User IP Address & Today Login (Unified GET with limit, offset, and type)
router.get(API_ROUTES.admin.loginHistory, authenticate, requireAdmin, controller.getLoginHistory);
router.get("/admin/login-history/:id", authenticate, requireAdmin, controller.getLoginHistory);
router.get("/admin/today-logins", authenticate, requireAdmin, (req, res, next) => {
  req.query.type = "today";
  return controller.getLoginHistory(req, res, next);
});
router.get("/admin/login-user-ip", authenticate, requireAdmin, controller.getLoginHistory);

// MLM Levels (GET with optional userId / user_id, POST to update config)
router.get(API_ROUTES.admin.mlmLevels, authenticate, requireAdmin, controller.getMlmLevels);
router.post(API_ROUTES.admin.mlmLevels, authenticate, requireAdmin, controller.saveMlmLevel);
router.get(API_ROUTES.admin.mlmLevelUser, authenticate, requireAdmin, controller.getMlmLevels);

// Salary Management & Records (GET with search / user_id, pagination & POST to issue salary)
router.get(API_ROUTES.admin.salaryList, authenticate, requireAdmin, controller.getSalaryList);
router.post(API_ROUTES.admin.salaryList, authenticate, requireAdmin, controller.saveSalary);
router.get(API_ROUTES.admin.salaryUser, authenticate, requireAdmin, controller.getSalaryList);

// Offer Management (Unified GET for List & Single, POST for Add, Edit/Update & Delete)
router.get(API_ROUTES.admin.offers, authenticate, requireAdmin, controller.getOffers);
router.post(API_ROUTES.admin.offers, authenticate, requireAdmin, controller.saveOffer);
router.get(API_ROUTES.admin.offerItem, authenticate, requireAdmin, controller.getOffers);
router.post(API_ROUTES.admin.offerItem, authenticate, requireAdmin, controller.saveOffer);
router.delete(API_ROUTES.admin.offerItem, authenticate, requireAdmin, controller.saveOffer);
router.delete(API_ROUTES.admin.offers, authenticate, requireAdmin, controller.saveOffer);

// Gift History & Management (Unified GET for List & Single, POST for Add, Edit/Update & Delete)
router.get(API_ROUTES.admin.gifts, authenticate, requireAdmin, controller.getGifts);
router.post(API_ROUTES.admin.gifts, authenticate, requireAdmin, controller.saveGift);
router.get(API_ROUTES.admin.giftItem, authenticate, requireAdmin, controller.getGifts);
router.post(API_ROUTES.admin.giftItem, authenticate, requireAdmin, controller.saveGift);
router.delete(API_ROUTES.admin.giftItem, authenticate, requireAdmin, controller.saveGift);
router.get(API_ROUTES.admin.giftHistory, authenticate, requireAdmin, controller.getGifts);

// Activity & Banner Management (Unified GET for List & Single, POST for Add, Edit/Update & Delete)
router.get(API_ROUTES.admin.banners, authenticate, requireAdmin, controller.getBanners);
router.post(API_ROUTES.admin.banners, authenticate, requireAdmin, controller.saveBanner);
router.get(API_ROUTES.admin.bannerItem, authenticate, requireAdmin, controller.getBanners);
router.post(API_ROUTES.admin.bannerItem, authenticate, requireAdmin, controller.saveBanner);
router.delete(API_ROUTES.admin.bannerItem, authenticate, requireAdmin, controller.saveBanner);
router.get(API_ROUTES.admin.activityBanners, authenticate, requireAdmin, controller.getBanners);
router.post(API_ROUTES.admin.activityBanners, authenticate, requireAdmin, controller.saveBanner);
router.get(API_ROUTES.admin.activityBannerItem, authenticate, requireAdmin, controller.getBanners);
router.post(API_ROUTES.admin.activityBannerItem, authenticate, requireAdmin, controller.saveBanner);
router.delete(API_ROUTES.admin.activityBannerItem, authenticate, requireAdmin, controller.saveBanner);

// Payment Limits Management (Unified GET for List & Single, POST for Add, Edit/Update & Delete)
router.get(API_ROUTES.admin.paymentLimits, authenticate, requireAdmin, controller.getPaymentLimits);
router.post(API_ROUTES.admin.paymentLimits, authenticate, requireAdmin, controller.savePaymentLimit);
router.get(API_ROUTES.admin.paymentLimitItem, authenticate, requireAdmin, controller.getPaymentLimits);
router.post(API_ROUTES.admin.paymentLimitItem, authenticate, requireAdmin, controller.savePaymentLimit);
router.delete(API_ROUTES.admin.paymentLimitItem, authenticate, requireAdmin, controller.savePaymentLimit);
router.delete(API_ROUTES.admin.paymentLimits, authenticate, requireAdmin, controller.savePaymentLimit);

// Deposit Management (Pending, Success, Reject & All Deposits)
router.get(API_ROUTES.admin.depositsPending, authenticate, requireAdmin, controller.getPendingDeposits);
router.get(API_ROUTES.admin.depositsSuccess, authenticate, requireAdmin, controller.getSuccessDeposits);
router.get(API_ROUTES.admin.depositsReject, authenticate, requireAdmin, controller.getRejectDeposits);
router.get(API_ROUTES.admin.deposits, authenticate, requireAdmin, controller.getDeposits);
router.get(API_ROUTES.admin.depositItem, authenticate, requireAdmin, controller.getDeposits);
router.post(API_ROUTES.admin.depositStatus, authenticate, requireAdmin, controller.updateDepositStatus);
router.post(API_ROUTES.admin.deposits, authenticate, requireAdmin, controller.updateDepositStatus);
router.post("/admin/deposits/status", authenticate, requireAdmin, controller.updateDepositStatus);

// Withdrawal Management (Pending, Approved, Reject & All Withdrawals)
router.get(API_ROUTES.admin.withdrawalsPending, authenticate, requireAdmin, controller.getPendingWithdrawals);
router.get(API_ROUTES.admin.withdrawalsApproved, authenticate, requireAdmin, controller.getApprovedWithdrawals);
router.get(API_ROUTES.admin.withdrawalsReject, authenticate, requireAdmin, controller.getRejectWithdrawals);
router.get(API_ROUTES.admin.withdrawals, authenticate, requireAdmin, controller.getWithdrawals);
router.get(API_ROUTES.admin.withdrawalItem, authenticate, requireAdmin, controller.getWithdrawals);
router.post(API_ROUTES.admin.withdrawalStatus, authenticate, requireAdmin, controller.updateWithdrawalStatus);
router.post(API_ROUTES.admin.withdrawals, authenticate, requireAdmin, controller.updateWithdrawalStatus);
router.post("/admin/withdrawals/status", authenticate, requireAdmin, controller.updateWithdrawalStatus);

// Support Setting Management (Unified GET for List & Single, POST for Add, Edit/Update & Delete)
router.get(API_ROUTES.admin.supportSettings, authenticate, requireAdmin, controller.getSupportSettings);
router.post(API_ROUTES.admin.supportSettings, authenticate, requireAdmin, controller.saveSupportSetting);
router.get(API_ROUTES.admin.supportSettingItem, authenticate, requireAdmin, controller.getSupportSettings);
router.post(API_ROUTES.admin.supportSettingItem, authenticate, requireAdmin, controller.saveSupportSetting);
router.delete(API_ROUTES.admin.supportSettingItem, authenticate, requireAdmin, controller.saveSupportSetting);
router.delete(API_ROUTES.admin.supportSettings, authenticate, requireAdmin, controller.saveSupportSetting);

// Aviator Management & Live Telemetry (TOTAL BET, TOTAL CASHOUT, Period No, Players Online, Drop History)
router.get(API_ROUTES.admin.aviatorTelemetry, authenticate, requireAdmin, controller.getAviatorTelemetry);
router.get(API_ROUTES.admin.aviatorDrops, authenticate, requireAdmin, controller.getAviatorDrops);
router.get(API_ROUTES.admin.aviator, authenticate, requireAdmin, controller.getAviatorTelemetry);

// Convenient aliases
router.get("/admin/aviator-telemetry", authenticate, requireAdmin, controller.getAviatorTelemetry);
router.get("/admin/aviator/drop-history", authenticate, requireAdmin, controller.getAviatorDrops);
router.get("/admin/aviator-drops", authenticate, requireAdmin, controller.getAviatorDrops);
router.get("/admin/aviator/overview", authenticate, requireAdmin, controller.getAviatorTelemetry);
router.get("/admin/support-setting", authenticate, requireAdmin, controller.getSupportSettings);
router.post("/admin/support-setting", authenticate, requireAdmin, controller.saveSupportSetting);
router.get("/admin/withdrawal/pending", authenticate, requireAdmin, controller.getPendingWithdrawals);
router.get("/admin/withdrawal/approved", authenticate, requireAdmin, controller.getApprovedWithdrawals);
router.get("/admin/withdrawals/success", authenticate, requireAdmin, controller.getApprovedWithdrawals);
router.get("/admin/withdrawal/reject", authenticate, requireAdmin, controller.getRejectWithdrawals);
router.get("/admin/withdrawals/rejected", authenticate, requireAdmin, controller.getRejectWithdrawals);
router.get("/admin/withdrawal", authenticate, requireAdmin, controller.getWithdrawals);
router.get("/admin/deposit/pending", authenticate, requireAdmin, controller.getPendingDeposits);
router.get("/admin/deposit/success", authenticate, requireAdmin, controller.getSuccessDeposits);
router.get("/admin/deposit/reject", authenticate, requireAdmin, controller.getRejectDeposits);
router.get("/admin/deposits/rejected", authenticate, requireAdmin, controller.getRejectDeposits);
router.get("/admin/deposit", authenticate, requireAdmin, controller.getDeposits);
router.get("/admin/payment-limit", authenticate, requireAdmin, controller.getPaymentLimits);
router.post("/admin/payment-limit", authenticate, requireAdmin, controller.savePaymentLimit);
router.get("/admin/activity-banner", authenticate, requireAdmin, controller.getBanners);
router.post("/admin/activity-banner", authenticate, requireAdmin, controller.saveBanner);
router.get("/admin/sliders", authenticate, requireAdmin, controller.getBanners);
router.post("/admin/sliders", authenticate, requireAdmin, controller.saveBanner);
router.get("/admin/gift-history", authenticate, requireAdmin, controller.getGifts);
router.post("/admin/add-gift", authenticate, requireAdmin, controller.saveGift);
router.get("/admin/mlm-salary", authenticate, requireAdmin, controller.getSalaryList);
router.post("/admin/players/status", authenticate, requireAdmin, controller.updatePlayerStatus);
router.post("/admin/players/quick-add", authenticate, requireAdmin, controller.quickAddPlayer);
router.post("/admin/players/:id/suspend", authenticate, requireAdmin, controller.suspendPlayer);
router.post("/admin/players/:id/unsuspend", authenticate, requireAdmin, controller.unsuspendPlayer);

module.exports = router;
