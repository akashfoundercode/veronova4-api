"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { AdminService, formatAviatorDrop } = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const adminController = require("../src/modules/admin/admin.controller");
const aviatorController = require("../src/modules/aviator/aviator.controller");

function createMockPool(handler) {
  return () => ({
    async execute(sql, params = []) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      return handler(normalizedSql, params);
    },
  });
}

test("DASHBOARD_ROUTES and API_ROUTES expose aviator telemetry and drops endpoints", () => {
  assert.equal(DASHBOARD_ROUTES.aviatorTelemetry, "/admin/aviator/telemetry");
  assert.equal(DASHBOARD_ROUTES.aviatorDrops, "/admin/aviator/drops");
  assert.equal(DASHBOARD_ROUTES.aviator, "/admin/aviator");
  assert.equal(API_ROUTES.admin.aviatorTelemetry, "/admin/aviator/telemetry");
  assert.equal(API_ROUTES.aviator.telemetry, "/aviator/telemetry");
  assert.equal(API_ROUTES.aviator.drops, "/aviator/drops");
});

test("formatAviatorDrop correctly formats round, crash multiplier, pool, hash and at date", () => {
  const row = {
    id: 101,
    round: 1157361,
    n: 3.42,
    at: "2026-10-15T10:30:00.000Z",
    bet_pool: 48500,
  };

  const formatted = formatAviatorDrop(row);
  assert.equal(formatted.id, 101);
  assert.equal(formatted.round, 1157361);
  assert.equal(formatted.crash, "3.42x");
  assert.equal(formatted.n, 3.42);
  assert.equal(formatted.pool, 48500);
  assert.equal(typeof formatted.hash, "string");
  assert.equal(formatted.hash.length, 64); // SHA-256 hex length
  assert.equal(formatted.at, "2026-10-15 10:30:00");
});

test("AdminService.getAviatorTelemetry returns TOTAL BET, TOTAL CASHOUT, Period No, Players Online and Drop History", async () => {
  const mockPool = createMockPool((sql) => {
    if (sql.includes("FROM aviator_bet") && sql.includes("SUM(amount)")) {
      return [
        [
          {
            total_bet: 125000,
            total_bet_count: 85,
            total_cashout: 72000,
            total_cashout_count: 42,
          },
        ],
        [],
      ];
    }
    if (sql.includes("FROM aviator_result") && sql.includes("ORDER BY id DESC LIMIT 1")) {
      return [
        [
          {
            id: 200,
            game_sr_num: 1157360,
            price: 2.48,
            datetime: "2026-10-15T11:00:00.000Z",
          },
        ],
        [],
      ];
    }
    if (sql.includes("active_bettors") && sql.includes("total_active_users")) {
      return [
        [
          {
            active_bettors: 36,
            total_active_users: 120,
          },
        ],
        [],
      ];
    }
    if (sql.includes("SELECT COUNT(*) AS total FROM aviator_result")) {
      return [[{ total: 500 }], []];
    }
    if (sql.includes("FROM aviator_result ar") && sql.includes("ORDER BY ar.id DESC LIMIT")) {
      return [
        [
          {
            id: 200,
            round: 1157360,
            n: 2.48,
            at: "2026-10-15T11:00:00.000Z",
            bet_pool: 61200,
          },
          {
            id: 199,
            round: 1157359,
            n: 1.15,
            at: "2026-10-15T10:58:00.000Z",
            bet_pool: 38900,
          },
        ],
        [],
      ];
    }
    return [[], []];
  });

  const service = new AdminService(mockPool);
  const data = await service.getAviatorTelemetry({ limit: 10, page: 1 });

  // 1. TOTAL BET
  assert.equal(data.total_bet, 125000);
  assert.equal(data.totalBet, 125000);
  assert.equal(data.total_bet_formatted, "₹1,25,000.00");
  assert.equal(data.total_bet_count, 85);

  // 2. TOTAL CASHOUT
  assert.equal(data.total_cashout, 72000);
  assert.equal(data.totalCashout, 72000);
  assert.equal(data.total_cashout_formatted, "₹72,000.00");
  assert.equal(data.total_cashout_count, 42);

  // 3. Period No
  assert.equal(data.period_no, 1157361);
  assert.equal(data.periodNo, 1157361);
  assert.equal(data.period_label, "#1157361");

  // 4. Players Online
  assert.equal(data.players_online, 36);
  assert.equal(data.playersOnline, 36);
  assert.equal(data.users_playing, 36);
  assert.equal(data.total_players, 36);

  // 5. Drop History
  assert.equal(Array.isArray(data.drop_history), true);
  assert.equal(data.drop_history.length, 2);
  assert.equal(data.drop_history[0].round, 1157360);
  assert.equal(data.drop_history[0].crash, "2.48x");
  assert.equal(data.drop_history[0].pool, 61200);
  assert.equal(data.pagination.total, 500);
});

test("Controllers getAviatorTelemetry and getAviatorDrops return standard success responses", async () => {
  const dummyData = {
    total_bet: 5000,
    total_cashout: 2000,
    period_no: 1157361,
    players_online: 25,
    drop_history: [
      { id: 1, round: 1157360, crash: "1.50x", n: 1.5, pool: 20000, hash: "abc", at: "Just now" },
    ],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  const req = { query: {} };
  let statusCaptured = null;
  let jsonCaptured = null;
  const res = {
    status(code) {
      statusCaptured = code;
      return this;
    },
    json(payload) {
      jsonCaptured = payload;
      return this;
    },
  };

  const originalServiceMethod = adminController.service.getAviatorTelemetry;
  const originalAviatorMethod = aviatorController.adminService.getAviatorTelemetry;
  adminController.service.getAviatorTelemetry = async () => dummyData;
  aviatorController.adminService.getAviatorTelemetry = async () => dummyData;

  try {
    // Admin controller getAviatorTelemetry
    await adminController.getAviatorTelemetry(req, res);
    assert.equal(statusCaptured, 200);
    assert.equal(jsonCaptured.status, 200);
    assert.equal(jsonCaptured.data.period_no, 1157361);
    assert.equal(jsonCaptured.data.total_bet, 5000);
    assert.equal(jsonCaptured.data.total_cashout, 2000);
    assert.equal(jsonCaptured.data.players_online, 25);
    assert.equal(jsonCaptured.data.drop_history.length, 1);

    // Admin controller getAviatorDrops
    await adminController.getAviatorDrops(req, res);
    assert.equal(statusCaptured, 200);
    assert.equal(jsonCaptured.data.length, 1);
    assert.equal(jsonCaptured.data[0].crash, "1.50x");

    // Aviator controller telemetry
    await aviatorController.telemetry(req, res);
    assert.equal(statusCaptured, 200);
    assert.equal(jsonCaptured.data.period_no, 1157361);
  } finally {
    adminController.service.getAviatorTelemetry = originalServiceMethod;
    aviatorController.adminService.getAviatorTelemetry = originalAviatorMethod;
  }
});
