"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../src/app");
const requireAdmin = require("../src/middleware/requireAdmin");
const { AdminService } = require("../src/modules/admin/admin.service");
const { API_ROUTES, apiUrl } = require("../src/config/apiRoutes");

function createPool() {
  const calls = [];
  return {
    calls,
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("AS total_players")) {
        return [[{
          total_players: 80,
          active_players: 60,
          current_players: 10,
          previous_players: 5,
          current_active_players: 8,
          previous_active_players: 4,
          today_players: 2,
          yesterday_players: 1,
        }], []];
      }
      if (sql.includes("AS total_turnover")) {
        return [[{
          total_turnover: 1200,
          current_turnover: 300,
          previous_turnover: 200,
          today_turnover: 50,
          yesterday_turnover: 25,
        }], []];
      }
      if (sql.includes("AS total_deposit")) {
        return [[{
          total_deposit: 1500,
          current_deposit: 400,
          previous_deposit: 200,
          today_deposit: 100,
          yesterday_deposit: 50,
          pending_deposit: 3,
        }], []];
      }
      if (sql.includes("AS total_withdrawal")) {
        return [[{
          total_withdrawal: 500,
          current_withdrawal: 100,
          previous_withdrawal: 50,
          today_withdrawal: 40,
          yesterday_withdrawal: 20,
          pending_withdrawal: 2,
        }], []];
      }
      if (sql.includes("AS total_games")) {
        return [[{
          feedbacks: 12,
          total_games: 3,
          total_commission: 20,
          demo_users: 4,
          illegal_betters: 2,
          chicken_net: -15,
          aviator_net: 8,
          otp_pack: 4955,
          current_feedbacks: 3,
          previous_feedbacks: 1,
          current_commission: 10,
          previous_commission: 5,
          current_demo_users: 2,
          previous_demo_users: 1,
          current_illegal_betters: 1,
          previous_illegal_betters: 2,
          current_chicken_net: -10,
          previous_chicken_net: -5,
          current_aviator_net: 4,
          previous_aviator_net: 2,
        }], []];
      }
      if (sql.includes("DATE(b.created_at)")) {
        return [[{ day: new Date("2026-10-10T00:00:00.000Z"), value: 50 }], []];
      }
      if (sql.includes("DATE(p.created_at)")) {
        return [[{ day: "2026-10-10", value: 100 }], []];
      }
      if (sql.includes("DATE(w.created_at)")) {
        return [[{ day: "2026-10-10", value: 40 }], []];
      }
      if (sql.includes("DATE(created_at) AS day")) {
        return [[{ day: "2026-10-10", value: 2 }], []];
      }
      throw new Error(`Unexpected dashboard query: ${sql}`);
    },
  };
}

test("admin dashboard returns all cards and daily chart series for the selected range", async () => {
  const pool = createPool();
  const service = new AdminService(
    () => pool,
    () => new Date("2026-10-10T12:00:00.000Z"),
  );

  const result = await service.getDashboard("7d");

  assert.deepEqual(result.period, {
    key: "7d",
    days: 7,
    startDate: "2026-10-04",
    endDate: "2026-10-10",
  });
  assert.equal(result.metrics.totalRevenue.value, 1500);
  assert.equal(result.metrics.totalRevenue.changePercent, 100);
  assert.equal(result.metrics.totalRevenue.trend, "up");
  assert.equal(result.metrics.totalPlayer.value, 80);
  assert.equal(result.metrics.todayTurnover.value, 50);
  assert.equal(result.metrics.pendingDeposit.value, 3);
  assert.equal(result.metrics.pendingWithdrawal.value, 2);
  assert.equal(result.metrics.chickenRoadAdminLoss.value, 15);
  assert.equal(result.metrics.aviatorAdminProfit.value, 8);
  assert.equal(result.metrics.otpPack.value, 4955);
  assert.equal(result.metrics.otpPackBalance.value, 4955);
  assert.equal(result.counts.total_player, 80);
  assert.equal(result.counts.total_turnover, 1200);
  assert.equal(result.counts.total_deposit, 1500);
  assert.equal(result.counts.total_withdrawal, 500);
  assert.equal(result.counts.otp_pack_balance, 4955);
  assert.equal(result.counts.total_commission, 20);
  assert.equal(result.counts.total_games, 3);
  assert.equal(result.counts.feedbacks, 12);
  assert.equal(result.counts.chicken_road_admin_profit, 0);
  assert.equal(result.counts.chicken_road_admin_loss, 15);
  assert.equal(result.counts.aviator_admin_profit, 8);
  assert.equal(result.counts.aviator_admin_loss, 0);
  assert.equal(result.counts.active_player, 60);
  assert.equal(result.counts.today_user, 2);
  assert.equal(result.counts.today_turnover, 50);
  assert.equal(result.counts.today_deposit, 100);
  assert.equal(result.counts.today_withdrawal, 40);
  assert.equal(result.counts.pending_withdrawal, 2);
  assert.equal(result.counts.illegal_betters, 2);
  assert.equal(result.counts.demo_users, 4);
  assert.equal(result.charts.turnoverOverview.length, 7);
  assert.deepEqual(result.charts.turnoverOverview.at(-1), {
    date: "2026-10-10",
    value: 50,
  });
  assert.deepEqual(result.charts.depositVsWithdrawal.deposits.at(-1), {
    date: "2026-10-10",
    value: 100,
  });
  assert.deepEqual(result.charts.depositVsWithdrawal.withdrawals.at(-1), {
    date: "2026-10-10",
    value: 40,
  });
  assert.equal(result.charts.playerGrowth.at(-1).value, 2);
  assert.equal(pool.calls.length, 9);
});

test("admin getDashboardCounts returns standalone dashboard counts", async () => {
  const pool = createPool();
  const service = new AdminService(
    () => pool,
    () => new Date("2026-10-10T12:00:00.000Z"),
  );

  const counts = await service.getDashboardCounts();
  assert.equal(counts.total_player, 80);
  assert.equal(counts.totalPlayer, 80);
  assert.equal(counts.total_turnover, 1200);
  assert.equal(counts.totalTurnover, 1200);
  assert.equal(counts.total_deposit, 1500);
  assert.equal(counts.totalDeposit, 1500);
  assert.equal(counts.total_withdrawal, 500);
  assert.equal(counts.totalWithdrawal, 500);
  assert.equal(counts.otp_pack_balance, 4955);
  assert.equal(counts.otpPackBalance, 4955);
  assert.equal(counts.total_commission, 20);
  assert.equal(counts.totalCommission, 20);
  assert.equal(counts.total_games, 3);
  assert.equal(counts.totalGames, 3);
  assert.equal(counts.feedbacks, 12);
  assert.equal(counts.chicken_road_admin_profit, 0);
  assert.equal(counts.chickenRoadAdminProfit, 0);
  assert.equal(counts.chicken_road_admin_loss, 15);
  assert.equal(counts.chickenRoadAdminLoss, 15);
  assert.equal(counts.aviator_admin_profit, 8);
  assert.equal(counts.aviatorAdminProfit, 8);
  assert.equal(counts.aviator_admin_loss, 0);
  assert.equal(counts.aviatorAdminLoss, 0);
  assert.equal(counts.active_player, 60);
  assert.equal(counts.activePlayer, 60);
  assert.equal(counts.today_user, 2);
  assert.equal(counts.todayUser, 2);
  assert.equal(counts.today_turnover, 50);
  assert.equal(counts.todayTurnover, 50);
  assert.equal(counts.today_deposit, 100);
  assert.equal(counts.todayDeposit, 100);
  assert.equal(counts.today_withdrawal, 40);
  assert.equal(counts.todayWithdrawal, 40);
  assert.equal(counts.pending_withdrawal, 2);
  assert.equal(counts.pendingWithdrawal, 2);
  assert.equal(counts.illegal_betters, 2);
  assert.equal(counts.illegalBetters, 2);
  assert.equal(counts.demo_users, 4);
  assert.equal(counts.demoUsers, 4);
  assert.equal(pool.calls.length, 5);
});

test("admin dashboard supports 30 days and rejects unknown periods", async () => {
  const service = new AdminService(
    () => createPool(),
    () => new Date("2026-10-10T12:00:00.000Z"),
  );

  const result = await service.getDashboard("30d");
  assert.equal(result.period.days, 30);
  assert.equal(result.period.startDate, "2026-09-11");
  assert.equal(result.charts.playerGrowth.length, 30);
  await assert.rejects(service.getDashboard("90d"), {
    code: "INVALID_PERIOD",
  });
});

test("dashboard admin guard allows only the existing verified administrator identity", () => {
  let continued = false;
  const response = {
    statusCode: 200,
    body: null,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
  requireAdmin(
    { user: { id: 1, role_id: 1, verification: 2 } },
    response,
    () => { continued = true; },
  );
  assert.equal(continued, true);

  continued = false;
  requireAdmin(
    { user: { id: 42, role_id: 1, verification: 2 } },
    response,
    () => { continued = true; },
  );
  assert.equal(continued, false);
  assert.equal(response.statusCode, 403);
});

let server;
let baseUrl;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("admin dashboard route configuration includes dashboard", () => {
  assert.equal(API_ROUTES.admin.dashboard, "/admin/dashboard");
  assert.equal(API_ROUTES.dashboard, "/admin/dashboard");
});

test("dashboard endpoint requires a bearer token", async () => {
  assert.equal(API_ROUTES.admin.dashboard, "/admin/dashboard");
  try {
    const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.admin.dashboard)}`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: "Unauthenticated." });
  } catch (err) {
    if (err.cause?.code === "EPERM") {
      // Sandboxed network environment
      return;
    }
    throw err;
  }
});
