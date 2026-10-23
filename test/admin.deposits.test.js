"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  AdminService,
  formatDeposit,
} = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockUsers = [
    { id: 1, username: "Admin", wallet: 500 },
    { id: 2, username: "PlayerOne", wallet: 100 },
  ];
  const mockPayins = [
    {
      id: 3,
      user_id: 1,
      cash: "300.00",
      order_id: "ORD17871316923547",
      status: 1, // Pending
      rejectmsg: null,
      created_at: new Date("2026-08-19T09:28:12.000Z"),
      updated_at: new Date("2026-08-19T09:28:12.000Z"),
    },
    {
      id: 4,
      user_id: 2,
      cash: "500.00",
      order_id: "ORD17871317081890",
      status: 2, // Success
      rejectmsg: null,
      created_at: new Date("2026-08-19T10:00:00.000Z"),
      updated_at: new Date("2026-08-19T10:05:00.000Z"),
    },
    {
      id: 5,
      user_id: 2,
      cash: "200.00",
      order_id: "ORD17871318326508",
      status: 3, // Rejected
      rejectmsg: "Invalid UTR",
      created_at: new Date("2026-08-19T11:00:00.000Z"),
      updated_at: new Date("2026-08-19T11:15:00.000Z"),
    },
  ];

  return {
    calls,
    mockUsers,
    mockPayins,
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.includes("CREATE TABLE IF NOT EXISTS payins")) {
        return [{ affectedRows: 0 }, []];
      }

      if (sql.includes("COUNT(*) AS total_deposits")) {
        const pending = mockPayins.filter((p) => p.status === 1);
        const success = mockPayins.filter((p) => p.status === 2);
        const rejected = mockPayins.filter((p) => p.status === 3 || p.status === 0 || p.rejectmsg);
        return [[{
          total_deposits: mockPayins.length,
          total_pending: pending.length,
          total_success: success.length,
          total_rejected: rejected.length,
          total_amount_pending: pending.reduce((sum, p) => sum + Number(p.cash), 0),
          total_amount_success: success.reduce((sum, p) => sum + Number(p.cash), 0),
        }], []];
      }

      if (sql.includes("SELECT COUNT(*) AS total FROM payins")) {
        let items = [...mockPayins];
        if (sql.includes("p.status = 1")) {
          items = items.filter((p) => p.status === 1);
        } else if (sql.includes("p.status = 2")) {
          items = items.filter((p) => p.status === 2);
        } else if (sql.includes("p.status = 3")) {
          items = items.filter((p) => p.status === 3 || p.status === 0 || p.rejectmsg);
        }
        return [[{ total: items.length }], []];
      }

      if (sql.includes("SELECT") && sql.includes("FROM payins p") && sql.includes("WHERE p.id = ? LIMIT 1")) {
        const targetId = Number(params[0]);
        const found = mockPayins.find((p) => p.id === targetId);
        if (!found) return [[], []];
        const user = mockUsers.find((u) => u.id === found.user_id);
        return [[{ ...found, username: user?.username ?? "User" }], []];
      }

      if (sql.includes("SELECT") && sql.includes("FROM payins p") && sql.includes("WHERE p.order_id = ? LIMIT 1")) {
        const targetOrder = String(params[0]);
        const found = mockPayins.find((p) => p.order_id === targetOrder);
        if (!found) return [[], []];
        const user = mockUsers.find((u) => u.id === found.user_id);
        return [[{ ...found, username: user?.username ?? "User" }], []];
      }

      if (sql.includes("SELECT") && sql.includes("FROM payins p") && sql.includes("ORDER BY p.id DESC")) {
        let items = [...mockPayins];
        if (sql.includes("p.status = 1")) {
          items = items.filter((p) => p.status === 1);
        } else if (sql.includes("p.status = 2")) {
          items = items.filter((p) => p.status === 2);
        } else if (sql.includes("p.status = 3")) {
          items = items.filter((p) => p.status === 3 || p.status === 0 || p.rejectmsg);
        }
        const mapped = items.map((p) => {
          const user = mockUsers.find((u) => u.id === p.user_id);
          return { ...p, username: user?.username ?? "User" };
        });
        return [mapped, []];
      }

      if (sql.includes("UPDATE users SET wallet = wallet + ? WHERE id = ?")) {
        const amount = Number(params[0]);
        const userId = Number(params[1]);
        const user = mockUsers.find((u) => u.id === userId);
        if (user) {
          user.wallet += amount;
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE payins SET status = 2")) {
        const targetId = Number(params[params.length - 1]);
        const p = mockPayins.find((item) => item.id === targetId);
        if (p) {
          p.status = 2;
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE payins SET status = 3")) {
        const rejectMsg = params[0];
        const targetId = Number(params[params.length - 1]);
        const p = mockPayins.find((item) => item.id === targetId);
        if (p) {
          p.status = 3;
          p.rejectmsg = rejectMsg;
        }
        return [{ affectedRows: 1 }, []];
      }

      return [[], []];
    },
  };
}

test("DASHBOARD_ROUTES and API_ROUTES expose depositsPending, depositsSuccess, and depositsReject routes", () => {
  assert.equal(DASHBOARD_ROUTES.depositsPending, "/admin/deposits/pending");
  assert.equal(DASHBOARD_ROUTES.depositsSuccess, "/admin/deposits/success");
  assert.equal(DASHBOARD_ROUTES.depositsReject, "/admin/deposits/reject");
  assert.equal(DASHBOARD_ROUTES.deposits, "/admin/deposits");

  assert.equal(API_ROUTES.admin.depositsPending, "/admin/deposits/pending");
  assert.equal(API_ROUTES.admin.depositsSuccess, "/admin/deposits/success");
  assert.equal(API_ROUTES.admin.depositsReject, "/admin/deposits/reject");
  assert.equal(API_ROUTES.admin.deposits, "/admin/deposits");
});

test("formatDeposit accurately formats all requested columns: Id, User Id, User Name, Order Id, Amount, Status, Date", () => {
  const row = {
    id: 3,
    user_id: 1,
    username: "Admin",
    order_id: "ORD17871316923547",
    cash: "300.00",
    status: 1,
    created_at: new Date("2026-08-19T09:28:12.000Z"),
  };

  const formatted = formatDeposit(row);
  assert.equal(formatted.Id, 3);
  assert.equal(formatted.id, 3);
  assert.equal(formatted["User Id"], 1);
  assert.equal(formatted.user_id, 1);
  assert.equal(formatted["User Name"], "Admin");
  assert.equal(formatted.username, "Admin");
  assert.equal(formatted["Order Id"], "ORD17871316923547");
  assert.equal(formatted.order_id, "ORD17871316923547");
  assert.equal(formatted.Amount, 300);
  assert.equal(formatted.amount, 300);
  assert.equal(formatted.Status, "Pending");
  assert.equal(formatted.status, 1);
  assert.equal(formatted.status_label, "Pending");
  assert.ok(formatted.Date);
  assert.ok(Array.isArray(formatted.Actions));
  assert.ok(formatted.Actions.includes("approve"));
  assert.ok(formatted.Actions.includes("reject"));
});

test("AdminService.getPendingDeposits retrieves only pending deposits with summary", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getPendingDeposits({ limit: 10, offset: 0 });
  assert.ok(res.summary);
  assert.equal(res.summary.total_deposits, 3);
  assert.equal(res.summary.total_pending, 1);
  assert.equal(res.pagination.total, 1);
  assert.equal(res.deposits.length, 1);
  assert.equal(res.deposits[0].Id, 3);
  assert.equal(res.deposits[0].Status, "Pending");
});

test("AdminService.getSuccessDeposits retrieves only success deposits", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getSuccessDeposits({ limit: 10, offset: 0 });
  assert.equal(res.pagination.total, 1);
  assert.equal(res.deposits.length, 1);
  assert.equal(res.deposits[0].Id, 4);
  assert.equal(res.deposits[0].Status, "Success");
  assert.equal(res.deposits[0].Amount, 500);
});

test("AdminService.getRejectDeposits retrieves only rejected deposits", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getRejectDeposits({ limit: 10, offset: 0 });
  assert.equal(res.pagination.total, 1);
  assert.equal(res.deposits.length, 1);
  assert.equal(res.deposits[0].Id, 5);
  assert.equal(res.deposits[0].Status, "Rejected");
  assert.equal(res.deposits[0].rejectmsg, "Invalid UTR");
});

test("AdminService.getDeposits retrieves single deposit by id or order_id", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const resId = await service.getDeposits({ id: 3 });
  assert.ok(resId.deposit);
  assert.equal(resId.deposit.Id, 3);
  assert.equal(resId.deposit["Order Id"], "ORD17871316923547");

  const resOrder = await service.getDeposits({ order_id: "ORD17871317081890" });
  assert.ok(resOrder.deposit);
  assert.equal(resOrder.deposit.Id, 4);
  assert.equal(resOrder.deposit.Amount, 500);
});

test("AdminService.updateDepositStatus approves pending deposit and credits user wallet", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.updateDepositStatus({
    id: 3,
    action: "approve",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Deposit approved successfully");
  assert.equal(res.data.Id, 3);
  assert.equal(res.data.Status, "Success");
  assert.equal(pool.mockUsers[0].wallet, 800); // 500 + 300
});

test("AdminService.updateDepositStatus rejects pending deposit with reason", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.updateDepositStatus({
    id: 3,
    action: "reject",
    rejectmsg: "Wrong UTR number",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Deposit rejected successfully");
  assert.equal(res.data.Id, 3);
  assert.equal(res.data.Status, "Rejected");
});

test("Controller deposit endpoints handle requests and return standard envelopes", async () => {
  const pool = createMockPool();
  const originalProvider = controller.service.poolProvider;
  controller.service.poolProvider = () => pool;

  try {
    let statusCode;
    let jsonResponse;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };

    // 1. GET pending deposits
    await controller.getPendingDeposits({ query: { limit: "10" } }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Pending deposits fetched successfully");
    assert.ok(Array.isArray(jsonResponse.data.deposits));

    // 2. GET success deposits
    await controller.getSuccessDeposits({ query: { limit: "10" } }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Success deposits fetched successfully");

    // 3. GET reject deposits
    await controller.getRejectDeposits({ query: { limit: "10" } }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Rejected deposits fetched successfully");
  } finally {
    controller.service.poolProvider = originalProvider;
  }
});

