"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { AdminService, formatLoginRecord } = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockLogins = [
    {
      id: 96,
      user_id: 1,
      ip_address: "152.58.154.177",
      login_time: new Date("2026-10-14T08:00:00.000Z"),
      created_at: new Date("2026-10-14T08:00:00.000Z"),
      u_id: "ADMIN_123",
      username: "Admin",
      mobile: "1234567890",
      email: "admin@example.com",
      account_type: 1,
    },
    {
      id: 95,
      user_id: 2,
      ip_address: "49.43.119.33",
      login_time: new Date("2026-10-13T07:30:00.000Z"),
      created_at: new Date("2026-10-13T07:30:00.000Z"),
      u_id: "USER_456",
      username: "UserTwo",
      mobile: "9876543210",
      email: null,
      account_type: 0,
    },
  ];

  return {
    calls,
    mockLogins,
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("CREATE TABLE IF NOT EXISTS ip_address")) {
        return [{ affectedRows: 0 }, []];
      }
      if (sql.includes("COUNT(*) AS total_logins")) {
        return [[{
          total_logins: 2,
          total_users: 2,
          unique_ips: 2,
          today_logins: 1,
          today_users: 1,
        }], []];
      }
      if (sql.includes("COUNT(*) AS total") && sql.includes("FROM ip_address i")) {
        const isTodayFilter = params && params.length >= 4;
        return [[{ total: isTodayFilter ? 1 : mockLogins.length }], []];
      }
      if (sql.includes("FROM ip_address i") && sql.includes("ORDER BY i.id DESC")) {
        const isTodayFilter = params && params.includes("2026-10-14");
        const list = isTodayFilter ? mockLogins.filter((m) => m.id === 96) : mockLogins;
        return [list, []];
      }
      if (sql.includes("WHERE i.id = ?")) {
        const found = mockLogins.find((m) => m.id === params[0]);
        return [found ? [found] : [], []];
      }
      throw new Error(`Unhandled mock execute in loginHistory: ${sql}`);
    },
  };
}

test("dashboardConfig and API_ROUTES include loginHistory route", () => {
  assert.equal(DASHBOARD_ROUTES.loginHistory, "/admin/login-history");
  assert.equal(API_ROUTES.admin.loginHistory, "/admin/login-history");
});

test("formatLoginRecord formats user login IP records accurately", () => {
  const row = {
    id: 96,
    user_id: 1,
    u_id: "ADMIN_123",
    username: "Admin",
    mobile: "1234567890",
    email: "admin@example.com",
    account_type: 1,
    ip_address: "152.58.154.177",
    login_time: new Date("2026-10-14T08:00:00.000Z"),
    created_at: new Date("2026-10-14T08:00:00.000Z"),
  };

  const formatted = formatLoginRecord(row, "2026-10-14");
  assert.equal(formatted["#"], 96);
  assert.equal(formatted.id, 96);
  assert.equal(formatted.user_id, 1);
  assert.equal(formatted.u_id, "ADMIN_123");
  assert.equal(formatted.username, "Admin");
  assert.equal(formatted.mobile, "1234567890");
  assert.equal(formatted.ip_address, "152.58.154.177");
  assert.equal(formatted.date, "2026-10-14");
  assert.equal(formatted.is_today, true);
});

test("AdminService.getLoginHistory retrieves all logins with type=all and pagination", async () => {
  const mockPool = createMockPool();
  const service = new AdminService({
    poolProvider: () => mockPool,
    clock: () => new Date("2026-10-14T10:00:00.000Z"),
  });

  const res = await service.getLoginHistory({ type: "all", limit: 10, offset: 0 });
  assert.equal(res.summary.total_logins, 2);
  assert.equal(res.summary.today_logins, 1);
  assert.equal(res.summary.today_users, 1);
  assert.equal(res.summary.active_type, "all");
  assert.deepEqual(res.types, ["all", "today"]);
  assert.equal(res.pagination.total, 2);
  assert.equal(res.pagination.limit, 10);
  assert.equal(res.pagination.offset, 0);
  assert.equal(res.list.length, 2);
  assert.equal(res.history.length, 2);
  assert.equal(res.list[0].ip_address, "152.58.154.177");
});

test("AdminService.getLoginHistory filters today logins with type=today", async () => {
  const mockPool = createMockPool();
  const service = new AdminService({
    poolProvider: () => mockPool,
    clock: () => new Date("2026-10-14T10:00:00.000Z"),
  });

  const res = await service.getLoginHistory({ type: "today", limit: 10, offset: 0 });
  assert.equal(res.summary.today_logins, 1);
  assert.equal(res.summary.active_type, "today");
  assert.equal(res.pagination.total, 1);
  assert.equal(res.list.length, 1);
  assert.equal(res.list[0].id, 96);
  assert.equal(res.list[0].is_today, true);
});

test("admin.controller getLoginHistory returns standard envelope", async () => {
  const mockPool = createMockPool();
  controller.service.poolProvider = () => mockPool;
  controller.service.clock = () => new Date("2026-10-14T10:00:00.000Z");

  let resStatus = 0;
  let resJson = null;
  const mockRes = {
    status(s) {
      resStatus = s;
      return this;
    },
    json(j) {
      resJson = j;
      return this;
    },
  };

  await controller.getLoginHistory({ query: { type: "all", limit: 10, offset: 0 } }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Login history fetched successfully");
  assert.equal(resJson.data.summary.total_logins, 2);
  assert.equal(resJson.data.summary.today_logins, 1);
  assert.ok(Array.isArray(resJson.data.list));
});
