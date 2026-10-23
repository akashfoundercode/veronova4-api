"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  AdminService,
  formatWithdrawal,
} = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockUsers = [
    { id: 1, username: "Admin", winning_wallet: 100 },
    { id: 2, username: "Ayush", winning_wallet: 50 },
  ];
  const mockAccounts = [
    {
      id: 1,
      user_id: 1,
      name: "veronova testing",
      bank_name: "SBI",
      account_number: "132435465786",
      ifsc_code: "dsafdghg2353458679",
      upi_id: "test@upi",
    },
    {
      id: 2,
      user_id: 2,
      name: "Ayush",
      bank_name: "J&K Grameen Bank",
      account_number: "3063040150000334",
      ifsc_code: "JAKA0GRAMEN",
      upi_id: null,
    },
  ];
  const mockWithdrawals = [
    {
      id: 1,
      user_id: 1,
      amount: 300,
      actual_amount: 0,
      account_id: 1,
      order_id: "2026100634538",
      status: 1, // Pending
      rejectmsg: null,
      remark: null,
      created_at: new Date("2026-10-06T09:53:01.000Z"),
      updated_at: new Date("2026-10-06T09:53:01.000Z"),
    },
    {
      id: 2,
      user_id: 1,
      amount: 312,
      actual_amount: 0,
      account_id: 1,
      order_id: "2026100624809",
      status: 1, // Pending
      rejectmsg: null,
      remark: null,
      created_at: new Date("2026-10-06T09:53:17.000Z"),
      updated_at: new Date("2026-10-06T09:53:17.000Z"),
    },
    {
      id: 3,
      user_id: 2,
      amount: 500,
      actual_amount: 500,
      account_id: 2,
      order_id: "2026100629999",
      status: 2, // Approved
      rejectmsg: null,
      remark: null,
      created_at: new Date("2026-10-06T10:00:00.000Z"),
      updated_at: new Date("2026-10-06T10:05:00.000Z"),
    },
    {
      id: 4,
      user_id: 2,
      amount: 250,
      actual_amount: 250,
      account_id: 2,
      order_id: "2026100630000",
      status: 3, // Rejected
      rejectmsg: "Invalid IFSC Code",
      remark: "Invalid IFSC Code",
      created_at: new Date("2026-10-06T11:00:00.000Z"),
      updated_at: new Date("2026-10-06T11:10:00.000Z"),
    },
  ];

  function enrich(w) {
    const user = mockUsers.find((u) => u.id === w.user_id);
    const acc = mockAccounts.find((a) => a.id === Number(w.account_id));
    return {
      ...w,
      username: user?.username ?? "User",
      bank_holder_name: acc?.name ?? "",
      bank_name: acc?.bank_name ?? "",
      account_number: acc?.account_number ?? "",
      ifsc_code: acc?.ifsc_code ?? "",
      upi_id: acc?.upi_id ?? "",
    };
  }

  return {
    calls,
    mockUsers,
    mockAccounts,
    mockWithdrawals,
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.includes("CREATE TABLE IF NOT EXISTS withdraw_histories")) {
        return [{ affectedRows: 0 }, []];
      }

      if (sql.includes("COUNT(*) AS total_withdrawals")) {
        const pending = mockWithdrawals.filter((w) => w.status === 1);
        const approved = mockWithdrawals.filter((w) => w.status === 2);
        const rejected = mockWithdrawals.filter((w) => w.status === 3 || w.status === 0 || w.rejectmsg);
        return [[{
          total_withdrawals: mockWithdrawals.length,
          total_pending: pending.length,
          total_approved: approved.length,
          total_rejected: rejected.length,
          total_amount_pending: pending.reduce((sum, w) => sum + Number(w.amount), 0),
          total_amount_approved: approved.reduce((sum, w) => sum + Number(w.amount), 0),
        }], []];
      }

      if (sql.includes("COUNT(*) AS total") && sql.includes("FROM withdraw_histories")) {
        let items = [...mockWithdrawals];
        if (sql.includes("w.status = 1")) {
          items = items.filter((w) => w.status === 1);
        } else if (sql.includes("w.status = 2")) {
          items = items.filter((w) => w.status === 2);
        } else if (sql.includes("w.status = 3")) {
          items = items.filter((w) => w.status === 3 || w.status === 0 || w.rejectmsg);
        }
        return [[{ total: items.length }], []];
      }

      if (sql.includes("SELECT") && sql.includes("FROM withdraw_histories w") && sql.includes("WHERE w.id = ? LIMIT 1")) {
        const targetId = Number(params[0]);
        const found = mockWithdrawals.find((w) => w.id === targetId);
        if (!found) return [[], []];
        return [[enrich(found)], []];
      }

      if (sql.includes("SELECT") && sql.includes("FROM withdraw_histories w") && sql.includes("WHERE w.order_id = ? LIMIT 1")) {
        const targetOrder = String(params[0]);
        const found = mockWithdrawals.find((w) => w.order_id === targetOrder);
        if (!found) return [[], []];
        return [[enrich(found)], []];
      }

      if (sql.includes("SELECT") && sql.includes("FROM withdraw_histories w") && sql.includes("ORDER BY w.id DESC")) {
        let items = [...mockWithdrawals];
        if (sql.includes("w.status = 1")) {
          items = items.filter((w) => w.status === 1);
        } else if (sql.includes("w.status = 2")) {
          items = items.filter((w) => w.status === 2);
        } else if (sql.includes("w.status = 3")) {
          items = items.filter((w) => w.status === 3 || w.status === 0 || w.rejectmsg);
        }
        return [items.map(enrich), []];
      }

      if (sql.includes("UPDATE users SET winning_wallet = winning_wallet + ? WHERE id = ?")) {
        const amount = Number(params[0]);
        const userId = Number(params[1]);
        const user = mockUsers.find((u) => u.id === userId);
        if (user) {
          user.winning_wallet += amount;
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE withdraw_histories SET status = 2")) {
        const targetId = Number(params[params.length - 1]);
        const w = mockWithdrawals.find((item) => item.id === targetId);
        if (w) {
          w.status = 2;
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE withdraw_histories SET status = 3")) {
        const rejectMsg = params[0];
        const targetId = Number(params[params.length - 1]);
        const w = mockWithdrawals.find((item) => item.id === targetId);
        if (w) {
          w.status = 3;
          w.rejectmsg = rejectMsg;
          w.remark = rejectMsg;
        }
        return [{ affectedRows: 1 }, []];
      }

      return [[], []];
    },
  };
}

test("DASHBOARD_ROUTES and API_ROUTES expose withdrawalsPending, withdrawalsApproved, and withdrawalsReject routes", () => {
  assert.equal(DASHBOARD_ROUTES.withdrawalsPending, "/admin/withdrawals/pending");
  assert.equal(DASHBOARD_ROUTES.withdrawalsApproved, "/admin/withdrawals/approved");
  assert.equal(DASHBOARD_ROUTES.withdrawalsReject, "/admin/withdrawals/reject");
  assert.equal(DASHBOARD_ROUTES.withdrawals, "/admin/withdrawals");

  assert.equal(API_ROUTES.admin.withdrawalsPending, "/admin/withdrawals/pending");
  assert.equal(API_ROUTES.admin.withdrawalsApproved, "/admin/withdrawals/approved");
  assert.equal(API_ROUTES.admin.withdrawalsReject, "/admin/withdrawals/reject");
  assert.equal(API_ROUTES.admin.withdrawals, "/admin/withdrawals");
});

test("formatWithdrawal accurately formats all 13 requested columns: Id, User name, User Id, Bank Holder name, Bank name, Ac. No., IFSC, UPI ID, Amount, Actual_amount, Status, Msg, Date", () => {
  const row = {
    id: 1,
    username: "Admin",
    user_id: 1,
    bank_holder_name: "veronova testing",
    bank_name: "SBI",
    account_number: "132435465786",
    ifsc_code: "dsafdghg2353458679",
    upi_id: "test@upi",
    amount: 300,
    actual_amount: 0,
    status: 1,
    msg: "",
    created_at: new Date("2026-10-06T09:53:01.000Z"),
  };

  const formatted = formatWithdrawal(row);
  assert.equal(formatted.Id, 1);
  assert.equal(formatted.id, 1);
  assert.equal(formatted["User name"], "Admin");
  assert.equal(formatted["User Id"], 1);
  assert.equal(formatted.user_id, 1);
  assert.equal(formatted["Bank Holder name"], "veronova testing");
  assert.equal(formatted["Bank name"], "SBI");
  assert.equal(formatted["Ac. No."], "132435465786");
  assert.equal(formatted.IFSC, "dsafdghg2353458679");
  assert.equal(formatted["UPI ID"], "test@upi");
  assert.equal(formatted.Amount, 300);
  assert.equal(formatted.Actual_amount, 0);
  assert.equal(formatted.Status, "Pending");
  assert.equal(formatted.status, 1);
  assert.equal(formatted.Msg, "");
  assert.ok(formatted.Date);
  assert.ok(formatted.date);
  assert.ok(Array.isArray(formatted.Actions));
  assert.ok(formatted.Actions.includes("approve"));
  assert.ok(formatted.Actions.includes("reject"));
});

test("AdminService.getPendingWithdrawals retrieves only pending withdrawals (2 records) with summary", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getPendingWithdrawals({ limit: 10, offset: 0 });
  assert.ok(res.summary);
  assert.equal(res.summary.total_withdrawals, 4);
  assert.equal(res.summary.total_pending, 2);
  assert.equal(res.pagination.total, 2);
  assert.equal(res.withdrawals.length, 2);
  assert.equal(res.withdrawals[0].Status, "Pending");
  assert.equal(res.withdrawals[1].Status, "Pending");
});

test("AdminService.getApprovedWithdrawals retrieves approved withdrawals", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getApprovedWithdrawals({ limit: 10, offset: 0 });
  assert.equal(res.pagination.total, 1);
  assert.equal(res.withdrawals.length, 1);
  assert.equal(res.withdrawals[0].Id, 3);
  assert.equal(res.withdrawals[0].Status, "Approved");
  assert.equal(res.withdrawals[0].Amount, 500);
});

test("AdminService.getRejectWithdrawals retrieves rejected withdrawals with reject reason", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getRejectWithdrawals({ limit: 10, offset: 0 });
  assert.equal(res.pagination.total, 1);
  assert.equal(res.withdrawals.length, 1);
  assert.equal(res.withdrawals[0].Id, 4);
  assert.equal(res.withdrawals[0].Status, "Rejected");
  assert.equal(res.withdrawals[0].Msg, "Invalid IFSC Code");
});

test("AdminService.getWithdrawals retrieves single withdrawal by id or order_id", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const resId = await service.getWithdrawals({ id: 1 });
  assert.ok(resId.withdrawal);
  assert.equal(resId.withdrawal.Id, 1);
  assert.equal(resId.withdrawal["Bank name"], "SBI");

  const resOrder = await service.getWithdrawals({ order_id: "2026100634538" });
  assert.ok(resOrder.withdrawal);
  assert.equal(resOrder.withdrawal.Id, 1);
  assert.equal(resOrder.withdrawal.Amount, 300);
});

test("AdminService.updateWithdrawalStatus approves pending withdrawal", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.updateWithdrawalStatus({
    id: 1,
    action: "approve",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Withdrawal approved successfully");
  assert.equal(res.data.Id, 1);
  assert.equal(res.data.Status, "Approved");
});

test("AdminService.updateWithdrawalStatus rejects pending withdrawal and refunds user winning wallet", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.updateWithdrawalStatus({
    id: 1,
    action: "reject",
    msg: "Bank server down",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Withdrawal rejected successfully");
  assert.equal(res.data.Id, 1);
  assert.equal(res.data.Status, "Rejected");
  assert.equal(res.data.Msg, "Bank server down");
  assert.equal(pool.mockUsers[0].winning_wallet, 400); // 100 + 300 refunded
});

test("Controller withdrawal endpoints handle requests and return standard envelopes", async () => {
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

    // 1. GET pending withdrawals
    await controller.getPendingWithdrawals({ query: { limit: "10" } }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Pending withdrawals fetched successfully");
    assert.ok(Array.isArray(jsonResponse.data.withdrawals));

    // 2. GET approved withdrawals
    await controller.getApprovedWithdrawals({ query: { limit: "10" } }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Approved withdrawals fetched successfully");

    // 3. GET reject withdrawals
    await controller.getRejectWithdrawals({ query: { limit: "10" } }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Rejected withdrawals fetched successfully");
  } finally {
    controller.service.poolProvider = originalProvider;
  }
});
