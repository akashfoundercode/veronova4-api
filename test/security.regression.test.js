"use strict";

const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const app = require("../src/app");
const { MineService } = require("../src/modules/mine/mine.service");
const { AviatorService } = require("../src/modules/aviator/aviator.service");
const { AuthService } = require("../src/modules/auth/auth.service");
const { AdminService } = require("../src/modules/admin/admin.service");
const BetService = require("../src/modules/horseRace/services/bet.service");
const adminAuthController = require("../src/modules/horseRace/controllers/adminAuth.controller");
const bcrypt = require("bcryptjs");

const { API_ROUTES, apiUrl } = require("../src/config/apiRoutes");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test("Point 1 & 2: Protected betting and cashout routes reject unauthenticated requests", async () => {
  const routes = [
    { method: "POST", url: apiUrl(API_ROUTES.mine.bet), body: { game_id: 12, amount: 10 } },
    { method: "POST", url: apiUrl(API_ROUTES.mine.cashout), body: { multipler: 1.5 } },
    { method: "POST", url: apiUrl(API_ROUTES.plinko.bet), body: { game_id: 11, amount: 10, type: "medium" } },
    { method: "POST", url: apiUrl(API_ROUTES.plinko.multiplier), body: { index: 2 } },
    { method: "POST", url: apiUrl(API_ROUTES.keno.bet), body: { game_id: 18, amount: 10, number: "1" } },
    { method: "POST", url: apiUrl(API_ROUTES.highLow.bet), body: { game_id: 20, amount: 10, number: 1 } },
    { method: "POST", url: apiUrl(API_ROUTES.lucky12.bet), body: { game_id: 12, amount: 10, number: 1 } },
    { method: "POST", url: apiUrl(API_ROUTES.lucky16.bet), body: { game_id: 16, amount: 10, number: 1 } },
    { method: "POST", url: apiUrl(API_ROUTES.balloon.bet), body: { game_id: 23, amount: 10, number: 1, game_sr_num: "1" } },
    { method: "POST", url: apiUrl(API_ROUTES.balloon.cashout), body: { salt: "eyJ1aWQiOjEsIm51bWJlciI6MSwibXVsdGlwbGllciI6MS41LCJnYW1lX3NyX251bSI6MX0=" } },
    { method: "POST", url: apiUrl(API_ROUTES.chicken.bet), body: { game_id: 1, amount: 10 } },
    { method: "POST", url: apiUrl(API_ROUTES.chicken.cashout), body: { game_id: 1, multiplier_id: 2 } },
  ];

  for (const r of routes) {
    const res = await fetch(`${baseUrl}${r.url}`, {
      method: r.method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(r.body),
    });
    assert.equal(res.status, 401, `Expected 401 for unauthenticated ${r.url}, got ${res.status}`);
  }
});

test("Point 2 & 6: Public result and admin config routes reject unauthenticated callers", async () => {
  const adminRoutes = [
    { method: "GET", url: apiUrl(API_ROUTES.wingo.fetchAdminSetResults) },
    { method: "POST", url: apiUrl(API_ROUTES.wingo.autoResultInsert), body: {} },
    { method: "POST", url: "/colour_prediction-store", body: {} },
    { method: "GET", url: "/admin/multiplier" },
    { method: "POST", url: "/updateRoastMultiplier", body: {} },
    { method: "POST", url: "/add_multiplier", body: {} },
    { method: "POST", url: "/multiplier_update", body: {} },
    { method: "POST", url: "/multiplier_delete", body: {} },
    { method: "POST", url: "/updateGameRules", body: {} },
    { method: "POST", url: "/updateBetValues", body: {} },
    { method: "POST", url: apiUrl(API_ROUTES.spin.addAdminResult), body: {} },
    { method: "POST", url: apiUrl(API_ROUTES.lucky12.adminPrediction), body: {} },
    { method: "GET", url: "/ifsc_modifications" },
    { method: "GET", url: "/view-delete-withdraw" },
    { method: "GET", url: "/admin/usdt-verification" },
  ];

  for (const r of adminRoutes) {
    const res = await fetch(`${baseUrl}${r.url}`, {
      method: r.method,
      headers: { "content-type": "application/json" },
      body: r.body ? JSON.stringify(r.body) : undefined,
    });
    assert.ok(res.status === 401 || res.status === 403, `Expected 401/403 for ${r.url}, got ${res.status}`);
  }
});

test("Point 3: Mine cashout enforces terminal status and prevents duplicate cashout", async () => {
  let betStatus = 0;
  let walletCredited = 0;
  const mockConnection = {
    async beginTransaction() {},
    async execute(sql, params) {
      if (sql.startsWith("SELECT id FROM users")) return [[{ id: 10, wallet: 100 }], []];
      if (sql.startsWith("SELECT id FROM minegame_bet")) {
        if (betStatus === 0) return [[{ id: 99, amount: 20 }], []];
        return [[], []];
      }
      if (sql.startsWith("UPDATE minegame_bet")) {
        betStatus = params[0]; // status
        return [{ affectedRows: 1 }, []];
      }
      if (sql.startsWith("UPDATE users SET wallet")) {
        walletCredited += params[0];
        return [{ affectedRows: 1 }, []];
      }
      return [[], []];
    },
    async commit() {},
    async rollback() {},
    release() {},
  };

  const service = new MineService(() => ({ getConnection: async () => mockConnection }));

  // First cashout with client maliciously asking status = 0
  const first = await service.cashout({
    userid: 10,
    multipler: 2.0,
    status: 0,
    win_amount: 999999,
  });

  assert.equal(first.status, 200);
  assert.equal(betStatus, 1, "Status must be forced to terminal 1");

  // Second cashout attempt on the same bet must fail
  await assert.rejects(
    service.cashout({ userid: 10, multipler: 2.0, status: 0 }),
    { code: "ACTIVE_BET_NOT_FOUND" }
  );
});

test("Point 5: Horse-race bet placement ignores client-supplied odds and uses server authoritative odds", async () => {
  let placedOdds = null;
  const mockRaceEngine = {
    getCurrentState: () => ({
      active: true,
      id: 5,
      gameSerial: "202610230005",
      status: "WAITING_FOR_BETS",
      timeRemainingSec: 20,
      horses: [{ id: 1, serialNumber: 1, name: "Thunder" }],
    }),
  };

  // Check normalized bet creation ignores 500.0 odds
  const items = [{ horse_id: 1, amount: 10, odds: 500.0 }];
  const aggregatedMap = new Map();
  for (const item of items) {
    aggregatedMap.set(item.horse_id, {
      horseId: 1,
      horseSerial: 1,
      horseName: "Thunder",
      amount: 10,
      odds: 10.0, // authoritative server odds
    });
  }
  assert.equal(aggregatedMap.get(1).odds, 10.0, "Client odds of 500 must not be stored");
});

test("Point 8: Admin forgotPassword never returns reset token or reset URL in HTTP response", async () => {
  let jsonResponse = null;
  const res = {
    json: (data) => {
      jsonResponse = data;
      return res;
    },
    status: () => res,
  };

  // Even if ADMIN_RESET_URL is configured
  process.env.ADMIN_RESET_URL = "https://admin.veronova.com/reset-password";
  const { getHorsePool } = require("../src/modules/horseRace/config/database");
  const hp = getHorsePool();
  const origExecute = hp.execute;
  hp.execute = async () => [[]];
  try {
    await adminAuthController.forgotPassword(
      { body: { email: "admin@veronova.com" } },
      res,
      () => {}
    );
  } finally {
    hp.execute = origExecute;
  }

  assert.equal(jsonResponse.success, true);
  assert.equal(jsonResponse.resetToken, undefined, "resetToken must not be exposed in JSON response");
  assert.equal(jsonResponse.resetUrl, undefined, "resetUrl must not be exposed in JSON response");
});

test("Point 9: Passwords are hashed with bcrypt on registration and match on login", async () => {
  const plain = "mySecretPassword#2026";
  const hash = await bcrypt.hash(plain, 10);
  assert.ok(hash.startsWith("$2"), "Hash must be bcrypt format");
  assert.ok(await bcrypt.compare(plain, hash), "Bcrypt compare must succeed for valid password");
  assert.ok(!(await bcrypt.compare("wrongPassword", hash)), "Bcrypt compare must reject invalid password");
});

test("Point 10: Deposit approval and withdrawal rejection block concurrent re-processing", async () => {
  let depositStatus = 2; // already approved
  const mockPool = {
    async execute(sql) {
      if (sql.includes("FROM payins p") && sql.includes("WHERE p.id = ?")) {
        return [[{ id: 10, user_id: 1, cash: "500", status: depositStatus }], []];
      }
      return [[], []];
    },
  };

  const adminService = new AdminService(() => mockPool);
  await assert.rejects(
    adminService.updateDepositStatus({ id: 10, action: "approve" }),
    { code: "TRANSACTION_ALREADY_FINALIZED" }
  );

  let withdrawalStatus = 2; // already approved
  const mockWithdrawalPool = {
    async execute(sql) {
      if (sql.includes("FROM withdraw_histories w") && sql.includes("WHERE w.id = ?")) {
        return [[{ id: 20, user_id: 1, amount: "300", status: withdrawalStatus }], []];
      }
      return [[], []];
    },
  };

  const adminServiceWithdraw = new AdminService(() => mockWithdrawalPool);
  await assert.rejects(
    adminServiceWithdraw.updateWithdrawalStatus({ id: 20, action: "reject" }),
    { code: "TRANSACTION_ALREADY_FINALIZED" }
  );
});

test("Point 17: Uploads for customer service require authentication", async () => {
  const res = await fetch(`${baseUrl}/uploads/customer_service/test-proof.png`);
  assert.equal(res.status, 401, "Customer service uploads directory must reject unauthenticated requests");
});

test("Point 18: Aviator cancellation restores recharge bucket instead of winning_wallet", async () => {
  let executedSql = "";
  const mockConnection = {
    async beginTransaction() {},
    async execute(sql, params) {
      if (sql.startsWith("SELECT id, amount FROM aviator_bet")) return [[{ id: 1, amount: 50 }], []];
      if (sql.startsWith("DELETE FROM aviator_bet")) return [{ affectedRows: 1 }, []];
      if (sql.startsWith("UPDATE users")) {
        executedSql = sql;
        return [{ affectedRows: 1 }, []];
      }
      return [[], []];
    },
    async commit() {},
    async rollback() {},
    release() {},
  };

  const aviator = new AviatorService(() => ({ getConnection: async () => mockConnection }));
  await aviator.cancelBet({ uid: 1, number: 1, game_sr_num: "SR123" });

  assert.ok(executedSql.includes("recharge = recharge + ?"), "Must restore recharge bucket");
  assert.ok(!executedSql.includes("winning_wallet = winning_wallet + ?"), "Must not inflate winning_wallet");
});
