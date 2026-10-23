"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ChickenService } = require("../src/modules/chicken/chicken.service");
const { DASHBOARD_ROUTES, CHICKEN_CONFIG } = require("../src/config/dashboardConfig");

function createMockConnection(respond) {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  let released = false;

  return {
    calls,
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
    get released() {
      return released;
    },
    async beginTransaction() {},
    async execute(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      return [respond(sql.replace(/\s+/g, " ").trim(), params), []];
    },
    async commit() {
      committed = true;
    },
    async rollback() {
      rolledBack = true;
    },
    release() {
      released = true;
    },
  };
}

test("DASHBOARD_ROUTES and CHICKEN_CONFIG expose all Chicken Road endpoints", () => {
  assert.equal(DASHBOARD_ROUTES.chickenBet, "/bet");
  assert.equal(DASHBOARD_ROUTES.chickenBetValues, "/bet_values");
  assert.equal(DASHBOARD_ROUTES.chickenHistory, "/history");
  assert.equal(DASHBOARD_ROUTES.chickenCashout, "/cashout");
  assert.equal(DASHBOARD_ROUTES.chickenMultiplier, "/multiplier");
  assert.equal(DASHBOARD_ROUTES.chickenRules, "/getGameRules");
  assert.equal(DASHBOARD_ROUTES.chickenUpdateRoastMultiplier, "/updateRoastMultiplier");
  assert.equal(DASHBOARD_ROUTES.chickenAddMultiplier, "/add_multiplier");
  assert.equal(DASHBOARD_ROUTES.chickenMultiplierUpdate, "/multiplier_update");
  assert.equal(DASHBOARD_ROUTES.chickenMultiplierDelete, "/multiplier_delete");

  assert.equal(CHICKEN_CONFIG.difficultyTypes[1], "Easy");
  assert.equal(CHICKEN_CONFIG.difficultyTypes[2], "Medium");
  assert.equal(CHICKEN_CONFIG.difficultyTypes[3], "Hard");
  assert.equal(CHICKEN_CONFIG.difficultyTypes[4], "Hardcore");
});

test("ChickenService.bet places bet in chicken_bets and deducts user wallet", async () => {
  const connection = createMockConnection((sql) => {
    if (sql.startsWith("SELECT id, wallet, account_type FROM users")) {
      return [{ id: 123, wallet: 500, account_type: 0 }];
    }
    return { affectedRows: 1 };
  });

  const service = new ChickenService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.bet({
    user_id: 123,
    game_id: 1,
    amount: 10,
  });

  assert.deepEqual(result, { success: true, message: "Bet Accepted Successfully!" });
  assert.equal(connection.committed, true);
  assert.ok(connection.calls.some(({ sql }) => sql.startsWith("INSERT INTO chicken_bets")));
  assert.ok(connection.calls.some(({ sql }) => sql.startsWith("UPDATE users SET wallet = wallet -")));
});

test("ChickenService.history returns paginated chicken bets with total_count", async () => {
  const pool = {
    async execute(sql, params) {
      if (sql.startsWith("SELECT COUNT(*) AS total_count")) {
        return [[{ total_count: 1 }], []];
      }
      return [
        [
          {
            amount: 10,
            win_amount: 25.0,
            multiplier: 2.5,
            created_at: "2026-10-16 12:00:00",
          },
        ],
        [],
      ];
    },
  };

  const service = new ChickenService(() => pool);
  const result = await service.history({ user_id: 123, limit: 10, offset: 0 });

  assert.equal(result.success, true);
  assert.equal(result.total_count, 1);
  assert.equal(result.total_pages, 1);
  assert.equal(result.current_page, 1);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].amount, 10);
});

test("ChickenService.history returns all records when limit=all or all=true", async () => {
  let executedSql = "";
  const pool = {
    async execute(sql) {
      executedSql = sql;
      if (sql.startsWith("SELECT COUNT(*) AS total_count")) {
        return [[{ total_count: 25 }], []];
      }
      return [new Array(25).fill({ amount: 10 }), []];
    },
  };

  const service = new ChickenService(() => pool);
  const result = await service.history({ user_id: 123, limit: "all" });

  assert.equal(result.success, true);
  assert.equal(result.total_count, 25);
  assert.equal(result.count, 25);
  assert.equal(result.limit, "all");
  assert.ok(!executedSql.includes("LIMIT"));
});

test("ChickenService.history supports page parameter and provides next/prev page", async () => {
  let executedSql = "";
  const pool = {
    async execute(sql) {
      if (sql.includes("LIMIT")) {
        executedSql = sql;
      }
      if (sql.startsWith("SELECT COUNT(*) AS total_count")) {
        return [[{ total_count: 50 }], []];
      }
      return [new Array(10).fill({ amount: 10 }), []];
    },
  };

  const service = new ChickenService(() => pool);
  const result = await service.history({ user_id: 123, page: 2, limit: 10 });

  assert.equal(result.page, 2);
  assert.equal(result.current_page, 2);
  assert.equal(result.next_page, 3);
  assert.equal(result.prev_page, 1);
  assert.equal(result.total_pages, 5);
  assert.equal(result.has_next_page, true);
  assert.equal(result.has_prev_page, true);
  assert.ok(executedSql.includes("LIMIT 10 OFFSET 10")); // page 2: (2 - 1) * 10 = 10
});

test("ChickenService.cashout processes cashout, updates chicken_bets, and credits user wallet", async () => {
  const connection = createMockConnection((sql) => {
    if (sql.startsWith("SELECT multiplier FROM multiplier WHERE multiplier = ?")) {
      return [{ multiplier: 2.5 }];
    }
    if (sql.startsWith("SELECT * FROM chicken_bets")) {
      return [
        {
          id: 55,
          user_id: 123,
          game_id: 1,
          amount: 20,
          cashout_status: 0,
        },
      ];
    }
    return { affectedRows: 1 };
  });

  const service = new ChickenService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.cashout({
    userid: 123,
    game_id: 1,
    multiplier_id: 2.5,
  });

  assert.equal(result.status, true);
  assert.equal(result.message, "Cashout processed successfully.");
  assert.equal(result.win_amount, 50.0);
  assert.equal(connection.committed, true);
  assert.ok(connection.calls.some(({ sql }) => sql.startsWith("UPDATE chicken_bets SET win_amount = ?")));
  assert.ok(connection.calls.some(({ sql }) => sql.startsWith("UPDATE users SET wallet = wallet + ?")));
});

test("ChickenService.betValues returns active bet values", async () => {
  const pool = {
    async execute() {
      return [[{ id: 1, value: 10 }, { id: 2, value: 50 }], []];
    },
  };
  const service = new ChickenService(() => pool);
  const result = await service.betValues();

  assert.equal(result.status, 200);
  assert.equal(result.data.length, 2);
});

test("ChickenService.rules returns game_rules dictionary", async () => {
  const pool = {
    async execute() {
      return [[{ name: "min_bet", value: "1" }, { name: "max_bet", value: "1000" }], []];
    },
  };
  const service = new ChickenService(() => pool);
  const result = await service.rules();

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { min_bet: "1", max_bet: "1000" });
});

test("ChickenService admin actions update roast multiplier and multipliers", async () => {
  const calls = [];
  const pool = {
    async execute(sql, params) {
      calls.push({ sql, params });
      return [{ affectedRows: 1 }, []];
    },
  };
  const service = new ChickenService(() => pool);

  const roastRes = await service.updateRoastMultiplier({ id: 1, roast_multiplier: 2.5 });
  assert.equal(roastRes.message, "Roast Multiplier Updated!");

  const addRes = await service.addMultiplier({ multiplier: "1.5;2.0;3.0", frequency: 1, type: 2 });
  assert.equal(addRes.message, "Multiplier added successfully!");

  const updateRes = await service.updateMultiplier({ id: 5, multiplier: "2.0;3.5", frequency: 2, type: 3 });
  assert.equal(updateRes.message, "Multiplier updated successfully!");

  const deleteRes = await service.deleteMultiplier({ id: 5 });
  assert.equal(deleteRes.message, "Multiplier deleted successfully.");
});

test("ChickenService.adminMultiplierList returns raw multiplier rows and roast_control for admin panel", async () => {
  const pool = {
    async execute(sql) {
      if (sql.includes("FROM multiplier")) {
        return [[{ id: 1, type: 1, multiplier: "1.10;1.20", frequency: 1 }], []];
      }
      if (sql.includes("FROM roast_control")) {
        return [[{ id: 1, types: 1, roast_multiplier: 1.5 }], []];
      }
      return [[], []];
    },
  };
  const service = new ChickenService(() => pool);
  const result = await service.adminMultiplierList();

  assert.equal(result.status, 200);
  assert.equal(result.success, true);
  assert.equal(result.data.multipliers.length, 1);
  assert.equal(result.data.roast_control.length, 1);
});

