"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { AviatorService, AVIATOR_GAME_ID } = require("../src/modules/aviator/aviator.service");
const aviatorController = require("../src/modules/aviator/aviator.controller");
const app = require("../src/app");

function createMockPool() {
  const tables = {
    aviator_result: [],
    aviator_bet: [],
    aviator_setting: [{ id: 1, win_per: 50, loss_per: 50, amount: 10 }],
    aviator_admin_result: [],
    users: [{ id: 42, wallet: 500, winning_wallet: 0, recharge: 500, status: 1 }],
    wallet_history: [],
  };

  const mockConnection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, params = []) {
      const lower = sql.toLowerCase();

      if (lower.includes("from aviator_result") && lower.includes("where game_sr_num = ?")) {
        const found = tables.aviator_result.filter((r) => String(r.game_sr_num) === String(params[0]));
        return [found];
      }

      if (lower.startsWith("insert into aviator_result")) {
        const [game_sr_num, game_id, price] = params;
        const row = { id: tables.aviator_result.length + 1, game_sr_num, game_id, price, status: 1 };
        tables.aviator_result.push(row);
        return [{ insertId: row.id, affectedRows: 1 }];
      }

      if (lower.includes("from aviator_bet") && lower.includes("where game_sr_num = ?")) {
        const bets = tables.aviator_bet.filter(
          (b) => String(b.game_sr_num) === String(params[0]) && b.status === 0 && b.result_status === 0
        );
        return [bets];
      }

      if (lower.startsWith("update aviator_bet") && lower.includes("multiplier = ?")) {
        const [mult, win, id] = params;
        const bet = tables.aviator_bet.find((b) => b.id === id);
        if (bet) {
          bet.multiplier = mult;
          bet.win = win;
          bet.status = 1;
          bet.result_status = 1;
        }
        return [{ affectedRows: 1 }];
      }

      if (lower.startsWith("update aviator_bet") && lower.includes("status = 2")) {
        const [id] = params;
        const bet = tables.aviator_bet.find((b) => b.id === id);
        if (bet) {
          bet.status = 2;
          bet.result_status = 1;
        }
        return [{ affectedRows: 1 }];
      }

      if (lower.startsWith("update users") && lower.includes("winning_wallet = winning_wallet + ?")) {
        const [win1, win2, uid] = params;
        const u = tables.users.find((user) => user.id === uid);
        if (u) {
          u.wallet += win1;
          u.winning_wallet += win2;
        }
        return [{ affectedRows: 1 }];
      }

      if (lower.startsWith("insert into wallet_history")) {
        const [userid, amount, subtypeid] = params;
        tables.wallet_history.push({ userid, amount, subtypeid });
        return [{ affectedRows: 1 }];
      }

      return [[]];
    },
  };

  const pool = {
    tables,
    getConnection: async () => mockConnection,
    execute: async (sql, params = []) => {
      const lower = sql.toLowerCase();

      if (lower.includes("max(cast(game_sr_num as unsigned))") && lower.includes("from aviator_result")) {
        const max = tables.aviator_result.reduce((m, r) => Math.max(m, Number(r.game_sr_num) || 0), 0);
        return [[{ latest_period: max }]];
      }

      if (lower.includes("max(cast(game_sr_num as unsigned))") && lower.includes("from aviator_bet")) {
        const max = tables.aviator_bet.reduce((m, b) => Math.max(m, Number(b.game_sr_num) || 0), 0);
        return [[{ latest_bet_period: max }]];
      }

      if (lower.includes("from aviator_bet") && lower.includes("count(uid)")) {
        const [gameId, period] = params;
        const bets = tables.aviator_bet.filter(
          (b) => b.game_id === gameId && String(b.game_sr_num) === String(period)
        );
        const totalamount = bets.reduce((s, b) => s + Number(b.amount || 0), 0);
        const totalusers = bets.length;
        const highestamount = bets.reduce((m, b) => Math.max(m, Number(b.amount || 0)), 0);
        return [[{ totalamount, totalusers, highestamount }]];
      }

      if (lower.includes("from aviator_admin_result")) {
        const [gameId, period] = params;
        const found = tables.aviator_admin_result.find(
          (r) => r.game_id === gameId && String(r.game_sr_num) === String(period)
        );
        return [found ? [found] : []];
      }

      if (lower.includes("from aviator_setting")) {
        return [tables.aviator_setting];
      }

      if (lower.includes("total_win from aviator_bet")) {
        const [gameId, period] = params;
        const bets = tables.aviator_bet.filter(
          (b) => b.game_id === gameId && String(b.game_sr_num) === String(period)
        );
        const total_win = bets.reduce((s, b) => s + Number(b.win || 0), 0);
        return [[{ total_win }]];
      }

      return [[]];
    },
  };

  return pool;
}

test("AviatorService.getNextRoundSettings defaults to 1001 when database is blank", async () => {
  const pool = createMockPool();
  const service = new AviatorService(() => pool);

  const settings = await service.getNextRoundSettings();
  assert.equal(settings.status, 200);
  assert.equal(settings.game_sr, "1001");
  assert.equal(settings.totalamount, 0);
  assert.equal(settings.totalusers, 0);
  assert.equal(settings.adminpercent, 50);
  assert.equal(settings.loss_per, 50);
  assert.equal(settings.min_amount, 10);
});

test("AviatorService.settleRound stores result in local database and declares winning/losing bets", async () => {
  const pool = createMockPool();
  const service = new AviatorService(() => pool);

  // Add 2 active bets: 1 with stop_multiplier 1.50 (wins when crash is 2.00), 1 with stop_multiplier 3.00 (loses)
  pool.tables.aviator_bet.push({
    id: 101,
    uid: 42,
    game_id: AVIATOR_GAME_ID,
    game_sr_num: "1001",
    amount: 100,
    totalamount: 100,
    stop_multiplier: 1.5,
    status: 0,
    result_status: 0,
    win: 0,
  });
  pool.tables.aviator_bet.push({
    id: 102,
    uid: 42,
    game_id: AVIATOR_GAME_ID,
    game_sr_num: "1001",
    amount: 50,
    totalamount: 50,
    stop_multiplier: 3.0,
    status: 0,
    result_status: 0,
    win: 0,
  });

  const settle = await service.settleRound({ game_sr_num: "1001", multiplier: 2.0 });
  assert.equal(settle.status, 200);
  assert.equal(settle.game_sr, "1001");
  assert.equal(settle.price, 2.0);
  assert.equal(settle.settled_bets, 2);

  // Result recorded in aviator_result
  assert.equal(pool.tables.aviator_result.length, 1);
  assert.equal(pool.tables.aviator_result[0].game_sr_num, "1001");
  assert.equal(pool.tables.aviator_result[0].price, 2.0);

  // Bet 1 won (100 * 1.50 = 150)
  assert.equal(pool.tables.aviator_bet[0].status, 1);
  assert.equal(pool.tables.aviator_bet[0].win, 150);
  // Bet 2 lost
  assert.equal(pool.tables.aviator_bet[1].status, 2);
  assert.equal(pool.tables.aviator_bet[1].win, 0);

  // Next round settings now automatically advances to 1002!
  const next = await service.getNextRoundSettings();
  assert.equal(next.game_sr, "1002");
});

function testRoute(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resBody = null;
    const req = {
      method,
      url,
      headers: { host: "root.veronova.co.in", ...headers },
      body: body || {},
    };
    const res = {
      statusCode: 200,
      setHeader() {},
      getHeader() {},
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resBody = data;
        resolve({ statusCode, body: resBody });
      },
      send(data) {
        resBody = data;
        resolve({ statusCode, body: resBody });
      },
      end() {
        resolve({ statusCode, body: resBody });
      },
    };
    app.handle(req, res, (err) => {
      resolve({ statusCode: 500, error: err });
    });
  });
}

test("Aviator legacy PHP routes respond locally", async () => {
  const pool = createMockPool();
  const service = new AviatorService(() => pool);
  aviatorController.setService(service);

  // Test round settings route
  const res1 = await testRoute("GET", "/Aviator/result_half_new.php");
  assert.equal(res1.statusCode, 200);
  assert.ok(res1.body.game_sr);

  // Test insert validation route (missing required body)
  const res2 = await testRoute("POST", "/Aviator/result_insert_new.php", {}, {});
  assert.equal(res2.statusCode, 400);
  assert.equal(res2.body.message, "game_sr is required");

  // Test root-mounted alias
  const res3 = await testRoute("GET", "/result_half_new.php");
  assert.equal(res3.statusCode, 200);
  assert.ok(res3.body.game_sr);

  // Test insert success route
  const res4 = await testRoute("POST", "/Aviator/result_insert_new.php", {}, {
    game_sr: "1001",
    adminmultiply: 2.50,
  });
  assert.equal(res4.statusCode, 200);
  assert.equal(res4.body.game_sr, "1001");
  assert.equal(res4.body.price, 2.50);
});

test("AviatorService.placeBet recovers from ER_DUP_ENTRY on PRIMARY key and handles duplicate bet gracefully", async () => {
  let primaryCollisionAttempted = false;
  let explicitIdInserted = null;

  const mockConnection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, params = []) {
      const lower = sql.toLowerCase();
      if (lower.startsWith("select id, wallet, winning_wallet")) {
        return [[{ id: 42, wallet: 500, winning_wallet: 100, recharge: 200, status: 1 }]];
      }
      if (lower.startsWith("select id from aviator_bet") && lower.includes("status = 0")) {
        return [[]];
      }
      if (lower.startsWith("select `longtext` from admin_settings")) {
        return [[{ longtext: "0.02" }]];
      }
      if (lower.startsWith("update users")) {
        return [{ affectedRows: 1 }];
      }
      if (lower.includes("coalesce(max(id), 0) + 1")) {
        return [[{ next_id: 15 }]];
      }
      if (lower.startsWith("alter table")) {
        return [{ affectedRows: 0 }];
      }
      if (lower.startsWith("insert into aviator_bet")) {
        if (!primaryCollisionAttempted) {
          primaryCollisionAttempted = true;
          const err = new Error("Duplicate entry '0' for key 'PRIMARY'");
          err.code = "ER_DUP_ENTRY";
          throw err;
        }
        explicitIdInserted = params[0];
        return [{ insertId: 15, affectedRows: 1 }];
      }
      return [[]];
    },
  };

  const pool = {
    getConnection: async () => mockConnection,
    execute: async () => [[]],
  };

  const service = new AviatorService(() => pool);
  const result = await service.placeBet({
    uid: 42,
    amount: 50,
    number: 1,
    game_id: 5,
    game_sr_num: "5001",
  });

  assert.equal(result.status, 200);
  assert.equal(explicitIdInserted, 15, "Explicit id 15 must be inserted after PRIMARY key duplicate collision");

  // Now test non-primary ER_DUP_ENTRY (duplicate bet for the round)
  const duplicateConnection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql) {
      const lower = sql.toLowerCase();
      if (lower.startsWith("select id, wallet")) return [[{ id: 42, wallet: 500, status: 1 }]];
      if (lower.startsWith("select id from aviator_bet")) return [[]];
      if (lower.startsWith("update users")) return [{ affectedRows: 1 }];
      if (lower.startsWith("insert into aviator_bet")) {
        const err = new Error("Duplicate entry '42-5001-1' for key 'idx_unique_bet'");
        err.code = "ER_DUP_ENTRY";
        throw err;
      }
      return [[]];
    },
  };
  const dupService = new AviatorService(() => ({ getConnection: async () => duplicateConnection }));
  const dupResult = await dupService.placeBet({
    uid: 42,
    amount: 50,
    number: 1,
    game_sr_num: "5001",
  });
  assert.equal(dupResult.status, 400);
  assert.equal(dupResult.message, "Already bet created!");
});


