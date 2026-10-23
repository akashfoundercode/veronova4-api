"use strict";

const { CustomerServiceService } = require("./customerService.service");
const AppError = require("../../shared/errors/AppError");

const service = new CustomerServiceService();

function extractFile(req, fieldName) {
  if (req.files && Array.isArray(req.files)) {
    const f = req.files.find((file) => file.fieldname === fieldName);
    if (f) {
      return `/uploads/customer_service/${f.filename}`;
    }
  }
  return req.body?.[fieldName] ?? null;
}

function wrap(fn) {
  return async (req, res, next) => {
    try {
      const result = await fn(req, res);
      return res.status(200).json(result);
    } catch (e) {
      if (e instanceof AppError) {
        return res.status(200).json({
          status: false,
          code: e.code || "ERROR",
          message: e.message,
        });
      }
      return next(e);
    }
  };
}

module.exports = {
  service,

  // 1. GET /api/customer_service
  customerServices: wrap(async () => service.getCustomerServices()),

  // 2. POST /api/ifsc_modification
  ifscModification: wrap(async (req) => {
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
    };
    return service.ifscModification(payload);
  }),

  // 3. POST /api/delete_account
  deleteAccount: wrap(async (req) => {
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
      passbook_photo: extractFile(req, "passbook_photo"),
      identity_card_photo: extractFile(req, "identity_card_photo"),
      last_deposit_proof: extractFile(req, "last_deposit_proof"),
    };
    return service.deleteAccount(payload);
  }),

  // 4. POST /api/bank_name_modification
  bankNameModification: wrap(async (req) => {
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
    };
    return service.bankNameModification(payload);
  }),

  // 5. POST /api/game_issue_report
  gameIssueReport: wrap(async (req) => {
    const image = extractFile(req, "image") ?? req.body?.image;
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
      image,
    };
    return service.gameIssueReport(payload);
  }),

  // 6. POST /api/change_login_password
  changeLoginPassword: wrap(async (req) => {
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
      latest_deposit_receipt: extractFile(req, "latest_deposit_receipt"),
      photo_selfie_hold_passbook: extractFile(req, "photo_selfie_hold_passbook"),
      photo_selfie_hold_identity_card: extractFile(req, "photo_selfie_hold_identity_card"),
    };
    return service.changeLoginPassword(payload);
  }),

  // 7. POST /api/usdt-user-verification
  usdtUserVerification: wrap(async (req) => {
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
      screenshot_bdgwin_id: extractFile(req, "screenshot_bdgwin_id"),
      photo_government_card: extractFile(req, "photo_government_card"),
      photo_deposit_proof1: extractFile(req, "photo_deposit_proof1"),
      photo_deposit_proof2: extractFile(req, "photo_deposit_proof2"),
      photo_usdt_bind_bdgwin: extractFile(req, "photo_usdt_bind_bdgwin"),
      photo_new_usdt_address: extractFile(req, "photo_new_usdt_address"),
      photo_adhaar_card: extractFile(req, "photo_adhaar_card"),
    };
    return service.usdtUserVerification(payload);
  }),

  // 8. POST /api/submit-old-usdt-address
  submitOldUsdtAddress: wrap(async (req) => {
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
      depositProof: extractFile(req, "depositProof") ?? extractFile(req, "deposit_proof"),
      selfieId: extractFile(req, "selfieId") ?? extractFile(req, "selfie_id"),
      selfieUsdt: extractFile(req, "selfieUsdt") ?? extractFile(req, "selfie_usdt"),
    };
    return service.submitOldUsdtAddress(payload);
  }),

  // 9. POST /api/aviator-lucky-bonus
  aviatorLuckyBonus: wrap(async (req) => {
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
    };
    return service.aviatorLuckyBonus(payload);
  }),

  // 10. GET /api/fetch-by-typeid
  fetchByTypeId: wrap(async (req) => {
    const query = {
      ...req.query,
      userid: req.query?.userid ?? req.query?.user_id ?? req.user?.id,
    };
    return service.fetchByTypeId(query);
  }),

  // 11. POST /api/deposit_Problem
  depositProblem: wrap(async (req) => {
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
      deposit_proof_recipt: extractFile(req, "deposit_proof_recipt"),
      bank_transaction_video: extractFile(req, "bank_transaction_video"),
      pdf_bank_statement: extractFile(req, "pdf_bank_statement"),
    };
    return service.depositProblem(payload);
  }),

  // 12. GET /api/deposit_pending_list
  depositPendingList: wrap(async (req) => {
    const query = {
      ...req.query,
      user_id: req.query?.user_id ?? req.query?.userid ?? req.user?.id,
    };
    return service.depositPendingList(query);
  }),

  // 13. GET /api/withdraw_pending_list
  withdrawPendingList: wrap(async (req) => {
    const query = {
      ...req.query,
      user_id: req.query?.user_id ?? req.query?.userid ?? req.user?.id,
    };
    return service.withdrawPendingList(query);
  }),

  // 14. POST /api/withdraw_Problem
  withdrawProblem: wrap(async (req) => {
    const payload = {
      ...req.body,
      user_id: req.body?.user_id ?? req.body?.userid ?? req.user?.id,
      deposit_proof_recipt: extractFile(req, "deposit_proof_recipt"),
      bank_transaction_video: extractFile(req, "bank_transaction_video"),
      pdf_bank_statement: extractFile(req, "pdf_bank_statement"),
    };
    return service.withdrawProblem(payload);
  }),

  // ================= ADMIN ACTIONS ================= //

  adminIfscList: wrap(async () => service.adminIfscList()),
  adminIfscApprove: wrap(async (req) => service.adminIfscApprove(req.params.id, req.body)),

  adminDeleteAccountList: wrap(async () => service.adminDeleteAccountList()),
  adminDeleteAccountStatus: wrap(async (req) => service.adminDeleteAccountStatus(req.params.id, req.body)),

  adminBankNameList: wrap(async () => service.adminBankNameList()),
  adminBankNameApprove: wrap(async (req) => service.adminBankNameApprove(req.params.id, req.body)),

  adminGameIssueList: wrap(async () => service.adminGameIssueList()),
  adminGameIssueApprove: wrap(async (req) => service.adminGameIssueApprove(req.params.id, req.body)),

  adminPasswordChangeList: wrap(async () => service.adminPasswordChangeList()),
  adminPasswordChangeApprove: wrap(async (req) => service.adminPasswordChangeApprove(req.params.id, req.body)),

  adminUsdtVerificationList: wrap(async () => service.adminUsdtVerificationList()),
  adminUsdtVerificationDetail: wrap(async (req) => service.adminUsdtVerificationDetail(req.params.id)),
  adminUsdtApprove: wrap(async (req) => service.adminUsdtApprove(req.params.id, req.body)),

  adminUsdtAddressList: wrap(async () => service.adminUsdtAddressList()),
  adminUsdtAddressStatus: wrap(async (req) => service.adminUsdtAddressStatus(req.params.id, req.body)),

  adminDepositProblemList: wrap(async () => service.adminDepositProblemList()),
  adminDepositProblemStatus: wrap(async (req) => service.adminDepositProblemStatus(req.params.id, req.body)),

  adminWithdrawProblemList: wrap(async () => service.adminWithdrawProblemList()),
  adminWithdrawProblemStatus: wrap(async (req) => service.adminWithdrawProblemStatus(req.params.id, req.body)),
};

