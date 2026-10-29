"use strict";

const express = require("express");
const controller = require("./customerService.controller");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/requireAdmin");
const { uploadCustomerServiceFiles } = require("./upload.middleware");

const router = express.Router();

// 1. GET /api/customer_service (public contact options)
router.get("/customer_service", controller.customerServices);

// User support requests - require authenticated session
// 2. POST /api/ifsc_modification
router.post("/ifsc_modification", authenticate, controller.ifscModification);

// 3. POST /api/delete_account
router.post("/delete_account", authenticate, uploadCustomerServiceFiles, controller.deleteAccount);

// 4. POST /api/bank_name_modification
router.post("/bank_name_modification", authenticate, controller.bankNameModification);

// 5. POST /api/game_issue_report
router.post("/game_issue_report", authenticate, uploadCustomerServiceFiles, controller.gameIssueReport);

// 6. POST /api/change_login_password
router.post("/change_login_password", authenticate, uploadCustomerServiceFiles, controller.changeLoginPassword);

// 7. POST /api/usdt-user-verification
router.post("/usdt-user-verification", authenticate, uploadCustomerServiceFiles, controller.usdtUserVerification);

// 8. POST /api/submit-old-usdt-address
router.post("/submit-old-usdt-address", authenticate, uploadCustomerServiceFiles, controller.submitOldUsdtAddress);

// 9. POST /api/aviator-lucky-bonus
router.post("/aviator-lucky-bonus", authenticate, controller.aviatorLuckyBonus);

// 10. GET /api/fetch-by-typeid
router.get("/fetch-by-typeid", authenticate, controller.fetchByTypeId);

// 11. POST /api/deposit_Problem
router.post("/deposit_Problem", authenticate, uploadCustomerServiceFiles, controller.depositProblem);

// 12. GET /api/deposit_pending_list
router.get("/deposit_pending_list", authenticate, controller.depositPendingList);

// 13. GET /api/withdraw_pending_list
router.get("/withdraw_pending_list", authenticate, controller.withdrawPendingList);

// 14. POST /api/withdraw_Problem
router.post("/withdraw_Problem", authenticate, uploadCustomerServiceFiles, controller.withdrawProblem);

// ================= ADMIN ROUTES (Secured with authenticate + requireAdmin) ================= //

// IFSC Requests
router.get("/ifsc_modifications", authenticate, requireAdmin, controller.adminIfscList);
router.get("/admin/ifsc-modifications", authenticate, requireAdmin, controller.adminIfscList);
router.post("/admin/ifsc-modification-approve/:id", authenticate, requireAdmin, controller.adminIfscApprove);

// Bank Account Delete Requests
router.get("/view-delete-withdraw", authenticate, requireAdmin, controller.adminDeleteAccountList);
router.get("/admin/view-delete-withdraw", authenticate, requireAdmin, controller.adminDeleteAccountList);
router.post("/admin/bank-account-change-status/:id", authenticate, requireAdmin, controller.adminDeleteAccountStatus);

// Bank Name Requests
router.get("/bank_name_modifications", authenticate, requireAdmin, controller.adminBankNameList);
router.get("/admin/bank-name-modifications", authenticate, requireAdmin, controller.adminBankNameList);
router.post("/admin/bank-name-modification-approve/:id", authenticate, requireAdmin, controller.adminBankNameApprove);

// Game Issue Complaints
router.get("/game_issue_complaints", authenticate, requireAdmin, controller.adminGameIssueList);
router.get("/admin/game-issue-complaints", authenticate, requireAdmin, controller.adminGameIssueList);
router.post("/admin/game-issue-complaint-approve/:id", authenticate, requireAdmin, controller.adminGameIssueApprove);

// Password Change Requests
router.get("/request-change-login-password", authenticate, requireAdmin, controller.adminPasswordChangeList);
router.get("/admin/request-change-login-password", authenticate, requireAdmin, controller.adminPasswordChangeList);
router.post("/admin/approve-login-password-request/:id", authenticate, requireAdmin, controller.adminPasswordChangeApprove);

// USDT Document Verification
router.get("/admin/usdt-verification", authenticate, requireAdmin, controller.adminUsdtVerificationList);
router.get("/admin/usdt-verification/:id", authenticate, requireAdmin, controller.adminUsdtVerificationDetail);
router.post("/admin/usdt-approve/:id", authenticate, requireAdmin, controller.adminUsdtApprove);

// USDT Address Verification
router.get("/admin/usdt-address-verification", authenticate, requireAdmin, controller.adminUsdtAddressList);
router.post("/admin/change-usdt-address-status/:id", authenticate, requireAdmin, controller.adminUsdtAddressStatus);

// Deposit Problems Admin
router.get("/admin/deposit-problems", authenticate, requireAdmin, controller.adminDepositProblemList);
router.post("/admin/deposit-problem-status/:id", authenticate, requireAdmin, controller.adminDepositProblemStatus);

// Withdraw Problems Admin
router.get("/admin/withdraw-problems", authenticate, requireAdmin, controller.adminWithdrawProblemList);
router.post("/admin/withdraw-problem-status/:id", authenticate, requireAdmin, controller.adminWithdrawProblemStatus);

module.exports = router;

