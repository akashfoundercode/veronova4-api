"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { CustomerServiceService } = require("../src/modules/customerService/customerService.service");
const { DASHBOARD_ROUTES, CUSTOMER_SERVICE_CONFIG } = require("../src/config/dashboardConfig");

function createMockPool(handler) {
  return {
    async execute(sql, params = []) {
      if (handler) {
        return handler(sql, params);
      }
      return [[], []];
    },
  };
}

test("DASHBOARD_ROUTES exposes all 14 Customer Service endpoints", () => {
  assert.equal(DASHBOARD_ROUTES.customerServices, "/customer_service");
  assert.equal(DASHBOARD_ROUTES.ifscModification, "/ifsc_modification");
  assert.equal(DASHBOARD_ROUTES.deleteAccount, "/delete_account");
  assert.equal(DASHBOARD_ROUTES.bankNameModification, "/bank_name_modification");
  assert.equal(DASHBOARD_ROUTES.gameIssueReport, "/game_issue_report");
  assert.equal(DASHBOARD_ROUTES.changeLoginPassword, "/change_login_password");
  assert.equal(DASHBOARD_ROUTES.usdtUserVerification, "/usdt-user-verification");
  assert.equal(DASHBOARD_ROUTES.submitOldUsdtAddress, "/submit-old-usdt-address");
  assert.equal(DASHBOARD_ROUTES.aviatorLuckyBonus, "/aviator-lucky-bonus");
  assert.equal(DASHBOARD_ROUTES.fetchByTypeId, "/fetch-by-typeid");
  assert.equal(DASHBOARD_ROUTES.depositProblem, "/deposit_Problem");
  assert.equal(DASHBOARD_ROUTES.depositPendingList, "/deposit_pending_list");
  assert.equal(DASHBOARD_ROUTES.withdrawPendingList, "/withdraw_pending_list");
  assert.equal(DASHBOARD_ROUTES.withdrawProblem, "/withdraw_Problem");
  assert.equal(CUSTOMER_SERVICE_CONFIG.typeMap[1], "IFSC Modification");
});

test("CustomerServiceService.getCustomerServices returns active services", async () => {
  const pool = createMockPool((sql) => {
    if (sql.includes("FROM customer_services")) {
      return [[{ id: 1, name: "Live Chat", link: "https://chat.example.com" }], []];
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);
  const result = await service.getCustomerServices();
  assert.equal(result.status, 200);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].name, "Live Chat");
});

test("CustomerServiceService.ifscModification inserts ifsc modification request", async () => {
  let executedSql = "";
  let passedParams = [];
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("INSERT INTO ifsc_modifications")) {
      executedSql = sql;
      passedParams = params;
      return [{ insertId: 1 }, []];
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);
  const result = await service.ifscModification({
    user_id: 123,
    account_no: "1234567890",
    ifsc_code: "SBIN0001234",
  });
  assert.equal(result.status, 200);
  assert.ok(executedSql.includes("INSERT INTO ifsc_modifications"));
  assert.equal(passedParams[0], 123);
  assert.equal(passedParams[1], "1234567890");
  assert.equal(passedParams[2], "SBIN0001234");
});

test("CustomerServiceService.deleteAccount inserts account delete request with proofs", async () => {
  let executedSql = "";
  let passedParams = [];
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("INSERT INTO delete_accounts")) {
      executedSql = sql;
      passedParams = params;
      return [{ insertId: 1 }, []];
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);
  const result = await service.deleteAccount({
    user_id: 123,
    account_no: "987654321",
    ifsc_code: "HDFC0001234",
    passbook_photo: "/uploads/customer_service/passbook.png",
    identity_card_photo: "/uploads/customer_service/id.png",
    last_deposit_proof: "/uploads/customer_service/deposit.png",
  });
  assert.equal(result.status, 200);
  assert.ok(executedSql.includes("INSERT INTO delete_accounts"));
  assert.equal(passedParams[3], "/uploads/customer_service/passbook.png");
});

test("CustomerServiceService.bankNameModification inserts bank name change request", async () => {
  let passedParams = [];
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("INSERT INTO bank_name_modifications")) {
      passedParams = params;
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);
  const result = await service.bankNameModification({
    user_id: 123,
    account_no: "123456789",
    bank_name: "State Bank of India",
  });
  assert.equal(result.status, 200);
  assert.equal(passedParams[2], "State Bank of India");
});

test("CustomerServiceService.gameIssueReport inserts complaint with description and image", async () => {
  let passedParams = [];
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("INSERT INTO game_issue_complaints")) {
      passedParams = params;
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);
  const result = await service.gameIssueReport({
    user_id: 123,
    description: "Spin game bet deducted but result not credited",
    image: "data:image/png;base64,iVBORw0KGgo...",
  });
  assert.equal(result.status, 200);
  assert.equal(passedParams[1], "Spin game bet deducted but result not credited");
});

test("CustomerServiceService.changeLoginPassword inserts password change request", async () => {
  let passedParams = [];
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("INSERT INTO change_login_passwords")) {
      passedParams = params;
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);
  const result = await service.changeLoginPassword({
    user_id: 123,
    password: "newSecretPassword123",
    bdg_win_id: "BDG12345",
  });
  assert.equal(result.status, 200);
  assert.equal(passedParams[1], "newSecretPassword123");
  assert.equal(passedParams[2], "BDG12345");
});

test("CustomerServiceService.usdtUserVerification enforces adhaar for region 1 and inserts", async () => {
  const pool = createMockPool((sql) => {
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);

  // Region 1 without adhaar should fail
  await assert.rejects(
    () =>
      service.usdtUserVerification({
        user_id: 123,
        region_status: 1,
        wallet_type: "TRC20",
        exchange_name: "Binance",
      }),
    (err) => {
      assert.equal(err.code, "VALIDATION_ERROR");
      return true;
    },
  );

  // Region 1 with adhaar should succeed
  const result = await service.usdtUserVerification({
    user_id: 123,
    region_status: 1,
    wallet_type: "TRC20",
    exchange_name: "Binance",
    photo_adhaar_card: "/uploads/customer_service/adhaar.png",
  });
  assert.equal(result.status, 200);
});

test("CustomerServiceService.submitOldUsdtAddress inserts address change request", async () => {
  let passedParams = [];
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("INSERT INTO submit_old_usdt_addresses")) {
      passedParams = params;
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);
  const result = await service.submitOldUsdtAddress({
    user_id: 123,
    depositProof: "/uploads/cs/dep.png",
    selfieId: "/uploads/cs/selfie.png",
  });
  assert.equal(result.status, 200);
  assert.equal(passedParams[1], "/uploads/cs/dep.png");
});

test("CustomerServiceService.aviatorLuckyBonus inserts bonus request", async () => {
  let passedParams = [];
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("INSERT INTO aviator_lucky_bonuses")) {
      passedParams = params;
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);
  const result = await service.aviatorLuckyBonus({
    user_id: 123,
    bdg_u_id: "BDG888",
  });
  assert.equal(result.status, 200);
  assert.equal(passedParams[1], "BDG888");
});

test("CustomerServiceService.fetchByTypeId queries correct table according to typeid 1-7", async () => {
  let queriedSql = "";
  const pool = createMockPool((sql) => {
    queriedSql = sql;
    return [[{ id: 1, status: 0 }], []];
  });
  const service = new CustomerServiceService(() => pool);

  const res1 = await service.fetchByTypeId({ typeid: 1, userid: 123 });
  assert.ok(queriedSql.includes("ifsc_modifications"));
  assert.equal(res1.status, 200);

  await service.fetchByTypeId({ typeid: 4, userid: 123 });
  assert.ok(queriedSql.includes("game_issue_complaints"));

  await service.fetchByTypeId({ typeid: 6, userid: 123 });
  assert.ok(queriedSql.includes("usdt_user_verifications"));

  await assert.rejects(
    () => service.fetchByTypeId({ typeid: 99, userid: 123 }),
    (err) => {
      assert.equal(err.code, "INVALID_TYPE_ID");
      return true;
    },
  );
});

test("CustomerServiceService.depositProblem & withdrawProblem insert transaction issues", async () => {
  let depositParams = [];
  let withdrawParams = [];
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("INSERT INTO deposit_problems")) {
      depositParams = params;
    }
    if (sql.startsWith("INSERT INTO withdraw_problems")) {
      withdrawParams = params;
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);

  const depRes = await service.depositProblem({
    user_id: 123,
    order_number: "DEP2026101601",
    order_amount: 500,
    upi_id: "user@upi",
    utr_number: "123456789012",
  });
  assert.equal(depRes.status, 200);
  assert.equal(depositParams[1], "DEP2026101601");
  assert.equal(depositParams[2], 500);

  const withRes = await service.withdrawProblem({
    user_id: 123,
    order_number: "WIT2026101601",
    order_amount: 1000,
    upi_id: "user@upi",
  });
  assert.equal(withRes.status, 200);
  assert.equal(withdrawParams[1], "WIT2026101601");
  assert.equal(withdrawParams[2], 1000);
});

test("CustomerServiceService.depositPendingList and withdrawPendingList return pending user items", async () => {
  const pool = createMockPool((sql) => {
    if (sql.includes("FROM payins") || sql.includes("FROM deposit_problems")) {
      return [[{ id: 1, order_id: "ORD123", amount: 100, status: 0 }], []];
    }
    if (sql.includes("FROM withdrawals") || sql.includes("FROM withdraw_problems")) {
      return [[{ id: 2, order_id: "WIT123", amount: 50, status: 0 }], []];
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);

  const depPending = await service.depositPendingList({ user_id: 123 });
  assert.equal(depPending.status, 200);
  assert.equal(depPending.data.length, 1);

  const withPending = await service.withdrawPendingList({ user_id: 123 });
  assert.equal(withPending.status, 200);
  assert.equal(withPending.data.length, 1);
});

test("CustomerServiceService admin endpoints list and update approval status", async () => {
  let updateParams = [];
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("UPDATE")) {
      updateParams = params;
    }
    if (sql.startsWith("SELECT")) {
      return [[{ id: 1, status: 0 }], []];
    }
    return [[], []];
  });
  const service = new CustomerServiceService(() => pool);

  const ifscList = await service.adminIfscList();
  assert.equal(ifscList.data.length, 1);

  const ifscApprove = await service.adminIfscApprove(1, { status: 1, remarks: "Approved by Admin" });
  assert.equal(ifscApprove.status, 200);
  assert.equal(updateParams[0], 1);
  assert.equal(updateParams[1], "Approved by Admin");
  assert.equal(updateParams[2], 1);
});

