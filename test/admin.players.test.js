"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { AdminService, calculateVipTier, formatPlayer, formatKycStatus } = require("../src/modules/admin/admin.service");
const { API_ROUTES } = require("../src/config/apiRoutes");

function createMockPool() {
  const calls = [];
  const mockUsers = [
    {
      id: 10,
      username: "PlayerOne",
      u_id: "WXYZ1234",
      mobile: "9876543210",
      email: "player1@example.com",
      country_code: "91",
      userimage: "http://example.com/image/download.png",
      verification: 2,
      wallet: "15000.00",
      winning_wallet: "3500.00",
      turnover: "45000.00",
      today_turnover: "1200.00",
      status: 1,
      referral_code: "ZUP123456",
      referral_user_id: 1,
      account_type: 0,
      illegal_count: 5,
      created_at: new Date("2026-10-10T10:00:00.000Z"),
      sponsor_username: "Admin",
      sponsor_referral_code: "ZUPADMIN",
      sponsor_mobile: "1234567890",
      bets_turnover: "5000.00",
      total_deposit: "12000.00",
    },
    {
      id: 11,
      username: "PlayerTwo",
      u_id: "ABCD5678",
      mobile: "9876543211",
      email: null,
      country_code: "91",
      userimage: "http://example.com/image/download.png",
      verification: 0,
      wallet: "250.00",
      winning_wallet: "0.00",
      turnover: "100.00",
      today_turnover: "0.00",
      status: 0,
      referral_code: "ZUP987654",
      referral_user_id: 1,
      account_type: 0,
      illegal_count: 0,
      created_at: new Date("2026-10-11T10:00:00.000Z"),
      sponsor_username: "Admin",
      sponsor_referral_code: "ZUPADMIN",
      sponsor_mobile: "1234567890",
      bets_turnover: "0.00",
      total_deposit: "250.00",
    },
  ];

  return {
    calls,
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("COALESCE(SUM(wallet), 0) AS total_player_holdings")) {
        return [[{
          total_player_holdings: 15250,
          winning_liability: 3500,
          total_players: 2,
          active_players: 1,
          suspended_players: 1,
          illegal_betters: 1,
        }], []];
      }
      if (sql.includes("SELECT COUNT(*) AS vip_high_rollers")) {
        return [[{ vip_high_rollers: 1 }], []];
      }
      if (sql.includes("SELECT COUNT(*) AS total FROM users u WHERE")) {
        return [[{ total: mockUsers.length }], []];
      }
      if (sql.includes("FROM users u") && sql.includes("ORDER BY u.id DESC")) {
        return [mockUsers, []];
      }
      if (sql.includes("WHERE u.id = ? AND u.account_type = 0")) {
        const found = mockUsers.find((u) => u.id === params[0]);
        return [found ? [found] : [], []];
      }
      throw new Error(`Unhandled mock execute: ${sql}`);
    },
    async getConnection() {
      return {
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
        async execute(sql, params) {
          calls.push({ sql, params });
          if (sql.includes("SELECT id, username, status FROM users WHERE id = ?")) {
            const found = mockUsers.find((u) => u.id === params[0]);
            return [found ? [found] : [], []];
          }
          if (sql.includes("UPDATE users SET status = ?")) {
            return [{ affectedRows: 1 }, []];
          }
          if (sql.includes("DELETE FROM personal_access_tokens WHERE tokenable_id = ?")) {
            return [{ affectedRows: 1 }, []];
          }
          if (sql.includes("UPDATE users SET login_token = NULL")) {
            return [{ affectedRows: 1 }, []];
          }
          if (sql.includes("WHERE mobile = ?")) {
            return [[], []];
          }
          if (sql.includes("SELECT id FROM users WHERE referral_code = ?")) {
            if (params[0] === "ZUPADMIN" || params[0] === "VALID_SPONSOR") {
              return [[{ id: 1 }], []];
            }
            return [[], []];
          }
          if (sql.includes("SELECT id FROM users WHERE u_id = ?")) {
            return [[], []];
          }
          if (sql.includes("INSERT INTO users")) {
            return [{ insertId: 99 }, []];
          }
          throw new Error(`Unhandled transaction execute: ${sql}`);
        },
      };
    },
  };
}

test("admin API routes include player management endpoints in dashboardConfig", () => {
  const { DASHBOARD_ROUTES, DASHBOARD_CONFIG } = require("../src/config/dashboardConfig");
  assert.equal(DASHBOARD_ROUTES.dashboard, "/admin/dashboard");
  assert.equal(DASHBOARD_ROUTES.dashboardCounts, "/admin/dashboard-counts");
  assert.equal(DASHBOARD_ROUTES.players, "/admin/players");
  assert.equal(DASHBOARD_ROUTES.playerDetails, "/admin/players/:id");
  assert.equal(DASHBOARD_ROUTES.playerStatus, "/admin/players/:id/status");
  assert.equal(API_ROUTES.admin.players, "/admin/players");
  assert.equal(API_ROUTES.admin.playerDetails, "/admin/players/:id");
  assert.equal(API_ROUTES.admin.playerStatus, "/admin/players/:id/status");
});

test("calculateVipTier accurately determines tier and high-roller status", () => {
  const vip0 = calculateVipTier(500, 500, 500);
  assert.equal(vip0.level, 0);
  assert.equal(vip0.name, "VIP 0");
  assert.equal(vip0.is_high_roller, false);

  const vip1 = calculateVipTier(3500, 0, 500);
  assert.equal(vip1.level, 1);
  assert.equal(vip1.name, "VIP 1");
  assert.equal(vip1.is_high_roller, false);

  const vipHighTurnover = calculateVipTier(35000, 0, 1000);
  assert.equal(vipHighTurnover.level, 3);
  assert.equal(vipHighTurnover.name, "VIP 3");
  assert.equal(vipHighTurnover.is_high_roller, true);

  const highWallet = calculateVipTier(100, 0, 15000);
  assert.equal(highWallet.is_high_roller, true);
});

test("formatKycStatus maps verification codes correctly", () => {
  assert.equal(formatKycStatus(2), "Verified");
  assert.equal(formatKycStatus(1), "Pending");
  assert.equal(formatKycStatus(0), "Unverified");
  assert.equal(formatKycStatus(null), "Unverified");
});

test("AdminService.getPlayers returns complete player directory with summary, VIP tier, holdings, turnover, sponsor and actions", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const result = await service.getPlayers({ page: 1, limit: 10 });

  // Summary validations
  assert.ok(result.summary);
  assert.equal(result.summary.total_player_holdings, 15250);
  assert.equal(result.summary.winning_liability, 3500);
  assert.equal(result.summary.vip_high_rollers, 1);
  assert.equal(result.summary.total_players, 2);
  assert.equal(result.summary.active_players, 1);
  assert.equal(result.summary.suspended_players, 1);
  assert.equal(result.summary.illegal_betters, 1);
  assert.equal(result.summary.illegal_users, 1);
  assert.equal(result.summary.illegal_count, 1);

  // Pagination validations
  assert.equal(result.pagination.page, 1);
  assert.equal(result.pagination.limit, 10);
  assert.equal(result.pagination.offset, 0);
  assert.equal(result.pagination.total, 2);

  // Directly requesting single player using query.id on same endpoint
  const single = await service.getPlayers({ id: 10 });
  assert.equal(single.id, 10);
  assert.equal(single.username, "PlayerOne");
  assert.equal(single.illegal_count, 5);
  assert.equal(single.is_illegal, true);

  // Testing explicit offset and limit
  const offsetResult = await service.getPlayers({ offset: 10, limit: 5 });
  assert.equal(offsetResult.pagination.offset, 10);
  assert.equal(offsetResult.pagination.limit, 5);
  assert.equal(offsetResult.pagination.page, 3);

  // Players directory list validations
  assert.equal(result.players.length, 2);
  const p1 = result.players[0];

  assert.equal(p1.id, 10);
  assert.equal(p1.player_details.username, "PlayerOne");
  assert.equal(p1.player_details.u_id, "WXYZ1234");
  assert.equal(p1.contact_and_kyc.mobile, "9876543210");
  assert.equal(p1.contact_and_kyc.kyc_status, "Verified");
  assert.equal(p1.vip_tier.is_high_roller, true);
  assert.equal(p1.main_wallet, 15000);
  assert.equal(p1.winning_wallet, 3500);
  assert.equal(p1.turn_over.total_turnover, 50000); // 45000 + 5000 bets
  assert.equal(p1.turn_over.today_turnover, 1200);
  assert.equal(p1.sponsor_info.sponsor_username, "Admin");
  assert.equal(p1.illegal_count, 5);
  assert.equal(p1.is_illegal, true);
  assert.equal(p1.status, 1);
  assert.equal(p1.status_label, "Active");
  assert.deepEqual(p1.actions, ["suspend", "unsuspend"]);
  assert.deepEqual(p1.available_actions, ["suspend"]);

  const p2 = result.players[1];
  assert.equal(p2.id, 11);
  assert.equal(p2.illegal_count, 0);
  assert.equal(p2.is_illegal, false);
  assert.equal(p2.status, 0);
  assert.equal(p2.status_label, "Suspended");
  assert.deepEqual(p2.available_actions, ["unsuspend"]);
});

test("AdminService.getPlayerById returns full details of single player", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const player = await service.getPlayerById(10);
  assert.equal(player.id, 10);
  assert.equal(player.username, "PlayerOne");
  assert.equal(player.main_wallet, 15000);
  assert.equal(player.contact_and_kyc.kyc_status, "Verified");

  await assert.rejects(service.getPlayerById(999), {
    code: "PLAYER_NOT_FOUND",
  });
});

test("AdminService.setPlayerStatus suspends player and revokes tokens", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const result = await service.setPlayerStatus(10, 0);
  assert.equal(result.status, 0);
  assert.equal(result.status_label, "Suspended");

  // Verify deletion of active tokens on suspend
  const deletedTokensCall = pool.calls.find((c) =>
    c.sql.includes("DELETE FROM personal_access_tokens WHERE tokenable_id = ?"),
  );
  assert.ok(deletedTokensCall);
  assert.equal(deletedTokensCall.params[0], 10);

  // Prevent suspending super admin
  await assert.rejects(service.setPlayerStatus(1, 0), {
    code: "FORBIDDEN",
  });
});

test("AdminService.addPlayer creates player with credentials and initial settings", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const result = await service.addPlayer({
    mobile: "9123456780",
    password: "Password123",
    username: "TestHero",
    wallet: 500,
  });

  assert.equal(result.id, 99);
  assert.equal(result.username, "TestHero");
  assert.equal(result.mobile, "9123456780");
  assert.equal(result.wallet, 500);
  assert.equal(result.status, 1);
  assert.equal(result.status_label, "Active");
});

test("AdminService.quickAddPlayer auto-generates player credentials", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const result = await service.quickAddPlayer({ wallet: 250 });

  assert.equal(result.id, 99);
  assert.ok(result.mobile);
  assert.ok(result.plain_password);
  assert.equal(result.wallet, 250);
  assert.equal(result.status, 1);
});

test("admin.controller endpoints return standard envelopes and handle errors", async () => {
  const controller = require("../src/modules/admin/admin.controller");
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

  // 1. getPlayers
  const res1 = createMockResponse();
  await controller.getPlayers({ query: { page: "1", limit: "10" } }, res1);
  assert.equal(res1.statusCode, 200);
  assert.equal(res1.body.message, "Player directory fetched successfully");
  assert.ok(res1.body.data.summary);
  assert.ok(res1.body.data.players);

  // 2. getPlayerById
  const res2 = createMockResponse();
  await controller.getPlayerById({ params: { id: "10" } }, res2);
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body.data.id, 10);

  // 3. suspendPlayer
  const res3 = createMockResponse();
  await controller.suspendPlayer({ params: { id: "10" } }, res3);
  assert.equal(res3.statusCode, 200);
  assert.equal(res3.body.data.status, 0);

  // 4. unsuspendPlayer
  const res4 = createMockResponse();
  await controller.unsuspendPlayer({ params: { id: "10" } }, res4);
  assert.equal(res4.statusCode, 200);
  assert.equal(res4.body.data.status, 1);

  // 5. updatePlayerStatus with action string
  const res5 = createMockResponse();
  await controller.updatePlayerStatus({ params: { id: "10" }, body: { action: "suspend" } }, res5);
  assert.equal(res5.statusCode, 200);
  assert.equal(res5.body.data.status, 0);

  // 6. addPlayer
  const res6 = createMockResponse();
  await controller.addPlayer(
    { body: { mobile: "9876500000", password: "Password123", username: "NewPlayer", wallet: 100 } },
    res6,
  );
  assert.equal(res6.statusCode, 201);
  assert.equal(res6.body.message, "Player created successfully");
  assert.equal(res6.body.data.id, 99);

  // 7. quickAddPlayer
  const res7 = createMockResponse();
  await controller.quickAddPlayer({ body: { wallet: 50 } }, res7);
  assert.equal(res7.statusCode, 201);
  assert.equal(res7.body.message, "Quick player created successfully");
  assert.ok(res7.body.data.plain_password);
});
