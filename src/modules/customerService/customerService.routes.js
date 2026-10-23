"use strict";

const express = require("express");
const controller = require("./customerService.controller");
const authenticate = require("../../middleware/authenticate");
const { uploadCustomerServiceFiles } = require("./upload.middleware");

const router = express.Router();

// 1. GET /api/customer_service
router.get("/customer_service", controller.customerServices);

// 2. POST /api/ifsc_modification
router.post("/ifsc_modification", authenticate.optional, controller.ifscModification);

// 3. POST /api/delete_account
router.post("/delete_account", authenticate.optional, uploadCustomerServiceFiles, controller.deleteAccount);

// 4. POST /api/bank_name_modification
router.post("/bank_name_modification", authenticate.optional, controller.bankNameModification);

// 5. POST /api/game_issue_report
router.post("/game_issue_report", authenticate.optional, uploadCustomerServiceFiles, controller.gameIssueReport);

// 6. POST /api/change_login_password
router.post("/change_login_password", authenticate.optional, uploadCustomerServiceFiles, controller.changeLoginPassword);

// 7. POST /api/usdt-user-verification
router.post("/usdt-user-verification", authenticate.optional, uploadCustomerServiceFiles, controller.usdtUserVerification);

// 8. POST /api/submit-old-usdt-address
router.post("/submit-old-usdt-address", authenticate.optional, uploadCustomerServiceFiles, controller.submitOldUsdtAddress);

// 9. POST /api/aviator-lucky-bonus
router.post("/aviator-lucky-bonus", authenticate.optional, controller.aviatorLuckyBonus);

// 10. GET /api/fetch-by-typeid
router.get("/fetch-by-typeid", authenticate.optional, controller.fetchByTypeId);

// 11. POST /api/deposit_Problem
router.post("/deposit_Problem", authenticate.optional, uploadCustomerServiceFiles, controller.depositProblem);

// 12. GET /api/deposit_pending_list
router.get("/deposit_pending_list", authenticate.optional, controller.depositPendingList);

// 13. GET /api/withdraw_pending_list
router.get("/withdraw_pending_list", authenticate.optional, controller.withdrawPendingList);

// 14. POST /api/withdraw_Problem
router.post("/withdraw_Problem", authenticate.optional, uploadCustomerServiceFiles, controller.withdrawProblem);

// ================= ADMIN ROUTES ================= //

// IFSC Requests
router.get("/ifsc_modifications", controller.adminIfscList);
router.get("/admin/ifsc-modifications", controller.adminIfscList);
router.post("/admin/ifsc-modification-approve/:id", controller.adminIfscApprove);

// Bank Account Delete Requests
router.get("/view-delete-withdraw", controller.adminDeleteAccountList);
router.get("/admin/view-delete-withdraw", controller.adminDeleteAccountList);
router.post("/admin/bank-account-change-status/:id", controller.adminDeleteAccountStatus);

// Bank Name Requests
router.get("/bank_name_modifications", controller.adminBankNameList);
router.get("/admin/bank-name-modifications", controller.adminBankNameList);
router.post("/admin/bank-name-modification-approve/:id", controller.adminBankNameApprove);

// Game Issue Complaints
router.get("/game_issue_complaints", controller.adminGameIssueList);
router.get("/admin/game-issue-complaints", controller.adminGameIssueList);
router.post("/admin/game-issue-complaint-approve/:id", controller.adminGameIssueApprove);

// Password Change Requests
router.get("/request-change-login-password", controller.adminPasswordChangeList);
router.get("/admin/request-change-login-password", controller.adminPasswordChangeList);
router.post("/admin/approve-login-password-request/:id", controller.adminPasswordChangeApprove);

// USDT Document Verification
router.get("/admin/usdt-verification", controller.adminUsdtVerificationList);
router.get("/admin/usdt-verification/:id", controller.adminUsdtVerificationDetail);
router.post("/admin/usdt-approve/:id", controller.adminUsdtApprove);

// USDT Address Verification
router.get("/admin/usdt-address-verification", controller.adminUsdtAddressList);
router.post("/admin/change-usdt-address-status/:id", controller.adminUsdtAddressStatus);

// Deposit Problems Admin
router.get("/admin/deposit-problems", controller.adminDepositProblemList);
router.post("/admin/deposit-problem-status/:id", controller.adminDepositProblemStatus);

// Withdraw Problems Admin
router.get("/admin/withdraw-problems", controller.adminWithdrawProblemList);
router.post("/admin/withdraw-problem-status/:id", controller.adminWithdrawProblemStatus);

module.exports = router;

