"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  AdminService,
  formatPaymentLimit,
} = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockLimits = [
    {
      id: 1,
      name: "INR_minimum_deposit",
      amount: 100,
      status: 1,
      created_at: new Date("2025-01-10T10:00:00.000Z"),
      updated_at: new Date("2025-02-15T12:30:00.000Z"),
    },
    {
      id: 2,
      name: "INR_maximum_deposit",
      amount: 100000,
      status: 1,
      created_at: new Date("2025-01-10T10:00:00.000Z"),
      updated_at: new Date("2025-02-15T12:30:00.000Z"),
    },
    {
      id: 3,
      name: "INR_minimum_withdraw",
      amount: 110,
      status: 1,
      created_at: new Date("2025-01-10T10:00:00.000Z"),
      updated_at: new Date("2025-02-15T12:30:00.000Z"),
    },
    {
      id: 4,
      name: "INR_maximum_withdraw",
      amount: 50000,
      status: 0,
      created_at: new Date("2025-01-10T10:00:00.000Z"),
      updated_at: new Date("2025-02-15T12:30:00.000Z"),
    },
  ];

  return {
    calls,
    mockLimits,
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.includes("CREATE TABLE IF NOT EXISTS payment_limits")) {
        return [{ affectedRows: 0 }, []];
      }

      if (sql.includes("COUNT(*) AS total_limits")) {
        const nonDeleted = mockLimits.filter((l) => l.status !== -1);
        return [[{
          total_limits: nonDeleted.length,
          active_limits: nonDeleted.filter((l) => l.status === 1).length,
          inactive_limits: nonDeleted.filter((l) => l.status === 0).length,
        }], []];
      }

      if (sql.includes("COUNT(*) AS total FROM payment_limits")) {
        let items = mockLimits.filter((l) => l.status !== -1);
        if (sql.includes("name LIKE ?")) {
          const s = String(params[0]).replace(/%/g, "").toLowerCase();
          items = items.filter((l) => l.name.toLowerCase().includes(s));
        }
        return [[{ total: items.length }], []];
      }

      if (sql.includes("SELECT * FROM payment_limits WHERE id = ? LIMIT 1")) {
        const targetId = Number(params[0]);
        const found = mockLimits.find((l) => l.id === targetId);
        return found ? [[found], []] : [[], []];
      }

      if (sql.includes("SELECT * FROM payment_limits WHERE") && sql.includes("ORDER BY id ASC")) {
        let items = mockLimits.filter((l) => l.status !== -1);
        if (sql.includes("name LIKE ?")) {
          const s = String(params[0]).replace(/%/g, "").toLowerCase();
          items = items.filter((l) => l.name.toLowerCase().includes(s));
        }
        return [items, []];
      }

      if (sql.includes("UPDATE payment_limits SET status = -1")) {
        const targetId = Number(params[0]);
        const target = mockLimits.find((l) => l.id === targetId);
        if (target) {
          target.status = -1;
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE payment_limits")) {
        const targetId = Number(params[params.length - 1]);
        const target = mockLimits.find((l) => l.id === targetId);
        if (target) {
          target.name = params[0];
          target.amount = params[1];
          target.status = params[2];
          target.updated_at = new Date();
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("INSERT INTO payment_limits")) {
        const newId = mockLimits.length + 10;
        const inserted = {
          id: newId,
          name: params[0],
          amount: params[1],
          status: params[2],
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockLimits.push(inserted);
        return [{ insertId: newId, affectedRows: 1 }, []];
      }

      return [[], []];
    },
  };
}

test("DASHBOARD_ROUTES and API_ROUTES expose paymentLimits and paymentLimitItem routes", () => {
  assert.equal(DASHBOARD_ROUTES.paymentLimits, "/admin/payment-limits");
  assert.equal(DASHBOARD_ROUTES.paymentLimitItem, "/admin/payment-limits/:id");
  assert.equal(API_ROUTES.admin.paymentLimits, "/admin/payment-limits");
  assert.equal(API_ROUTES.admin.paymentLimitItem, "/admin/payment-limits/:id");
});

test("formatPaymentLimit accurately formats all requested columns: ID, Name, Amount, Status, Updated At, Action", () => {
  const row = {
    id: 1,
    name: "INR_minimum_deposit",
    amount: 100,
    status: 1,
    created_at: new Date("2025-01-10T10:00:00.000Z"),
    updated_at: new Date("2025-02-15T12:30:00.000Z"),
  };

  const formatted = formatPaymentLimit(row);
  assert.equal(formatted.ID, 1);
  assert.equal(formatted.id, 1);
  assert.equal(formatted.Name, "INR_minimum_deposit");
  assert.equal(formatted.name, "INR_minimum_deposit");
  assert.equal(formatted.Amount, 100);
  assert.equal(formatted.amount, 100);
  assert.equal(formatted.Status, 1);
  assert.equal(formatted.status, 1);
  assert.equal(formatted.status_label, "Active");
  assert.ok(formatted["Updated At"]);
  assert.ok(Array.isArray(formatted.Action));
  assert.ok(formatted.Action.includes("edit"));
  assert.ok(formatted.Action.includes("delete"));
});

test("AdminService.getPaymentLimits retrieves paginated payment limits and summary", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getPaymentLimits({ limit: 10, offset: 0 });
  assert.ok(res.summary);
  assert.equal(res.summary.total_limits, 4);
  assert.equal(res.summary.active_limits, 3);
  assert.equal(res.summary.inactive_limits, 1);
  assert.equal(res.pagination.total, 4);
  assert.equal(res.payment_limits.length, 4);

  const first = res.payment_limits[0];
  assert.equal(first.ID, 1);
  assert.equal(first.Name, "INR_minimum_deposit");
  assert.equal(first.Amount, 100);
  assert.equal(first.Status, 1);
});

test("AdminService.getPaymentLimits retrieves single limit when id is provided", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getPaymentLimits({ id: 2 });
  assert.ok(res.payment_limit);
  assert.equal(res.payment_limit.ID, 2);
  assert.equal(res.payment_limit.Name, "INR_maximum_deposit");
  assert.equal(res.payment_limit.Amount, 100000);
});

test("AdminService.savePaymentLimit adds a new payment limit validating Name and Amount", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  await assert.rejects(
    () => service.savePaymentLimit({ amount: 500 }),
    { message: "Payment limit Name is required." }
  );

  const res = await service.savePaymentLimit({
    Name: "USDT_minimum_deposit",
    Amount: 10,
    Status: 1,
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Payment limit added successfully");
  assert.equal(res.data.Name, "USDT_minimum_deposit");
  assert.equal(res.data.Amount, 10);
  assert.equal(res.data.Status, 1);
});

test("AdminService.savePaymentLimit edits an existing payment limit", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.savePaymentLimit({
    id: 1,
    Name: "INR_minimum_deposit_updated",
    Amount: 200,
    Status: 1,
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Payment limit updated successfully");
  assert.equal(res.data.ID, 1);
  assert.equal(res.data.Name, "INR_minimum_deposit_updated");
  assert.equal(res.data.Amount, 200);
});

test("AdminService.savePaymentLimit deletes a payment limit when action=delete", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.savePaymentLimit({
    id: 3,
    action: "delete",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Payment limit deleted successfully");
  assert.equal(res.data.id, 3);
  assert.equal(res.data.status, -1);
});

test("Controller getPaymentLimits and savePaymentLimit handle requests with standard envelopes", async () => {
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

    // 1. GET list
    await controller.getPaymentLimits({ query: { limit: "10", offset: "0" } }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Payment limits fetched successfully");
    assert.ok(Array.isArray(jsonResponse.data.payment_limits));

    // 2. GET single
    await controller.getPaymentLimits({ params: { id: "1" }, query: {} }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Payment limit fetched successfully");
    assert.equal(jsonResponse.data.payment_limit.ID, 1);

    // 3. POST save / add
    await controller.savePaymentLimit(
      {
        body: { Name: "CRYPTO_min_withdraw", Amount: 20, Status: 1 },
      },
      res
    );
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Payment limit added successfully");
    assert.equal(jsonResponse.data.Name, "CRYPTO_min_withdraw");
  } finally {
    controller.service.poolProvider = originalProvider;
  }
});

