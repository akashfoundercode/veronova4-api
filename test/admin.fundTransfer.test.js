"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  AdminService,
  VALID_FUND_TRANSFER_TYPES,
  normalizeTransferType,
  formatFundTransfer,
} = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockUsers = [
    {
      id: 10,
      username: "PlayerOne",
      u_id: "WXYZ1234",
      mobile: "9876543210",
      wallet: "500.00",
    },
  ];

  const mockTransfers = [
    {
      id: 1,
      user_id: 10,
      amount: "200.00",
      type: "ADD FUND",
      remark: "Welcome gift",
      description: "ADD FUND of ₹200.00 credited by Admin (Welcome gift)",
      previous_balance: "300.00",
      current_balance: "500.00",
      created_at: new Date("2026-10-14T10:00:00.000Z"),
      username: "PlayerOne",
      u_id: "WXYZ1234",
      mobile: "9876543210",
    },
  ];

  const mockSubtypes = [
    { id: 1, name: "DAILY SALARY", status: 1 },
    { id: 2, name: "MONTHLY SALARY", status: 1 },
    { id: 3, name: "FIRST RECHARGE SELF BONUS", status: 1 },
    { id: 4, name: "SECOND RECHARGE SELF BONUS", status: 1 },
    { id: 5, name: "FIRST RECHARGE AGENT BONUS", status: 1 },
    { id: 6, name: "ADVERTISEMENT SUPPORT", status: 1 },
    { id: 7, name: "ADVANCE SALARY", status: 1 },
  ];

  return {
    calls,
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("FROM fundtransfer_subtype")) {
        return [mockSubtypes, []];
      }
      if (sql.includes("COUNT(*) AS total") && sql.includes("total_transfer_amount")) {
        return [[{ total: mockTransfers.length, total_transfer_amount: 200 }], []];
      }
      if (sql.includes("FROM fund_user_details f") && sql.includes("ORDER BY f.id DESC")) {
        return [mockTransfers, []];
      }
      if (sql.includes("FROM fund_user_details f") && sql.includes("WHERE f.id = ?")) {
        const found = mockTransfers.find((t) => t.id === params[0]);
        return [found ? [found] : [], []];
      }
      throw new Error(`Unhandled mock pool execute: ${sql}`);
    },
    async getConnection() {
      return {
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
        async execute(sql, params) {
          calls.push({ sql, params });
          if (sql.includes("FROM fundtransfer_subtype")) {
            const raw = params[1] || "";
            const matched = mockSubtypes.find((s) => s.id === params[0] || s.name === raw || raw.includes(s.name));
            return [matched ? [matched] : [mockSubtypes[0]], []];
          }
          if (sql.includes("FROM users") && sql.includes("LIMIT 1 FOR UPDATE")) {
            const found = mockUsers.find(
              (u) =>
                u.id === params[0] ||
                u.u_id === params[1] ||
                u.mobile === params[2] ||
                u.username === params[3],
            );
            return [found ? [found] : [], []];
          }
          if (sql.includes("UPDATE users SET wallet = wallet + ?")) {
            const transferAmount = params[0];
            const targetId = params[1];
            const u = mockUsers.find((user) => user.id === targetId);
            if (u) {
              u.wallet = (Number(u.wallet) + Number(transferAmount)).toFixed(2);
            }
            return [{ affectedRows: 1 }, []];
          }
          if (sql.includes("INSERT INTO fund_user_details")) {
            const newId = mockTransfers.length + 1;
            const record = {
              id: newId,
              user_id: params[0],
              amount: params[1],
              remark: params[2],
              type: params[3],
              description: params[4],
              created_at: new Date(),
              username: "PlayerOne",
              u_id: "WXYZ1234",
              mobile: "9876543210",
              subtype_name: "FIRST RECHARGE SELF BONUS",
            };
            mockTransfers.push(record);
            return [{ insertId: newId }, []];
          }
          throw new Error(`Unhandled transaction execute: ${sql}`);
        },
      };
    },
  };
}

test("fundTransfer route is configured in dashboardConfig and apiRoutes", () => {
  assert.equal(DASHBOARD_ROUTES.fundTransfer, "/admin/fund-transfer");
  assert.equal(DASHBOARD_ROUTES.fundTransferHistory, "/admin/fund-transfer/history");
  assert.equal(API_ROUTES.admin.fundTransfer, "/admin/fund-transfer");
  assert.equal(API_ROUTES.admin.fundTransferHistory, "/admin/fund-transfer/history");
});

test("normalizeTransferType supports all 7 required bonus/transfer types", () => {
  assert.equal(normalizeTransferType("ADD FUND"), "ADD FUND");
  assert.equal(normalizeTransferType("add_fund"), "ADD FUND");
  assert.equal(normalizeTransferType("FUND TRANSFER"), "FUND TRANSFER");
  assert.equal(normalizeTransferType("first_recharge_self_bonus"), "FIRST RECHARGE SELF BONUS");
  assert.equal(normalizeTransferType("SECOND RECHARGE SELF BONUS"), "SECOND RECHARGE SELF BONUS");
  assert.equal(normalizeTransferType("FIRST RECHARGE AGENT BONUS"), "FIRST RECHARGE AGENT BONUS");
  assert.equal(normalizeTransferType("ADVERTISEMENT SUPPORT"), "ADVERTISEMENT SUPPORT");
  assert.equal(normalizeTransferType("ADVANCE SALLARY"), "ADVANCE SALLARY");
});

test("AdminService.transferFund credits user wallet and stores history", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const result = await service.transferFund({
    user_id: 10,
    amount: 250,
    type: "FIRST RECHARGE SELF BONUS",
    remark: "Test bonus",
  });

  assert.equal(result.user_id, 10);
  assert.equal(result.u_id, "WXYZ1234");
  assert.equal(result.username, "PlayerOne");
  assert.equal(result.type, 3);
  assert.equal(result.type_name, "FIRST RECHARGE SELF BONUS");
  assert.equal(result.remark, "Test bonus");
  assert.equal(result.previous_balance, 500);
  assert.equal(result.current_balance, 750);
  assert.ok(result.description.includes("FIRST RECHARGE SELF BONUS"));
});

test("AdminService.getFundTransferHistory returns history with limit, offset, and single id query", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  // 1. History directory with limit and offset
  const res = await service.getFundTransferHistory({ limit: 10, offset: 0 });
  assert.ok(res.summary);
  assert.equal(res.summary.total_transactions, 1);
  assert.equal(res.summary.total_transfer_amount, 200);
  assert.equal(res.pagination.limit, 10);
  assert.equal(res.pagination.offset, 0);
  assert.equal(res.history.length, 1);

  const item = res.history[0];
  assert.equal(item.id, 1);
  assert.equal(item.user_id, 10);
  assert.equal(item.u_id, "WXYZ1234");
  assert.equal(item.amount, 200);
  assert.equal(item.type, "ADD FUND");
  assert.equal(item.remark, "Welcome gift");
  assert.ok(item.description);
  assert.ok(item.date);

  // 2. Single item lookup on same endpoint
  const single = await service.getFundTransferHistory({ id: 1 });
  assert.equal(single.id, 1);
  assert.equal(single.user_id, 10);
  assert.equal(single.amount, 200);
});

test("admin.controller transferFund and getFundTransferHistory endpoints handle requests", async () => {
  const pool = createMockPool();
  controller.service.poolProvider = () => pool;

  function createMockResponse() {
    return {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
  }

  // 1. POST transferFund
  const res1 = createMockResponse();
  await controller.transferFund(
    {
      body: {
        user_id: "WXYZ1234",
        amount: 100,
        type: "ADVERTISEMENT SUPPORT",
        remark: "Marketing ad support",
      },
      user: { id: 1 },
    },
    res1,
  );
  assert.equal(res1.statusCode, 200);
  assert.equal(res1.body.message, "Fund transferred successfully");
  assert.equal(res1.body.data.amount, 100);
  assert.equal(res1.body.data.type_name, "ADVERTISEMENT SUPPORT");

  // 2. GET getFundTransferHistory
  const res2 = createMockResponse();
  await controller.getFundTransferHistory({ query: { limit: "10", offset: "0" } }, res2);
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body.message, "Fund transfer history fetched successfully");
  assert.ok(res2.body.data.history);
});
