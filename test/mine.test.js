"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { MineService } = require("../src/modules/mine/mine.service");

function createConnection(respond) {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  return {
    calls,
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
    async beginTransaction() {},
    async execute(sql, params) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalizedSql, params });
      return [respond(normalizedSql, params), []];
    },
    async commit() {
      committed = true;
    },
    async rollback() {
      rolledBack = true;
    },
    release() {},
  };
}

test("Mine bet debits wallet and inserts the active legacy record atomically", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, wallet FROM users")) return [{ id: 8, wallet: 50 }];
    return [];
  });
  const service = new MineService(() => ({ getConnection: async () => connection }));

  const result = await service.placeBet({ userid: 8, game_id: 12, amount: 10 });

  assert.deepEqual(result, { status: 200, message: "Bet placed successfully" });
  assert.equal(connection.committed, true);
  const insert = connection.calls.find(({ sql }) => sql.startsWith("INSERT INTO minegame_bet"));
  assert.match(insert.sql, /tax, after_tax, orderid/);
  assert.deepEqual(insert.params.slice(0, 4), [10, 12, 8, 10]);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE users SET wallet = wallet - ?") &&
    params[0] === 10,
  ));
});

test("legacy Mine bet mode uses the ten-rupee minimum and order_id field", async () => {
  const connection = createConnection(() => []);
  const service = new MineService(() => ({ getConnection: async () => connection }));

  await assert.rejects(
    service.placeBet(
      { userid: 8, game_id: 12, amount: 5 },
      { legacyWalletMode: true },
    ),
    { code: "INVALID_AMOUNT" },
  );
  assert.equal(connection.calls.length, 0);
});

test("Mine cashout updates the oldest active bet and credits wallet in one transaction", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id FROM users")) return [{ id: 8 }];
    if (sql.startsWith("SELECT id FROM minegame_bet")) return [{ id: 3 }];
    return [];
  });
  const service = new MineService(() => ({ getConnection: async () => connection }));

  const result = await service.cashout({
    userid: 8,
    win_amount: 24,
    multipler: 2.4,
    status: 1,
  });

  assert.deepEqual(result, {
    status: 200,
    message: "CashOut successfully",
    win_amount: 24,
  });
  assert.equal(connection.committed, true);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE minegame_bet") &&
    params.join(",") === "1,2.4,24,3",
  ));
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE users SET wallet = wallet + ?") &&
    params.join(",") === "24,8",
  ));
});

test("Mine result history includes both won and lost bets and paginates results", async () => {
  const calls = [];
  const service = new MineService(() => ({
    async execute(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      if (sql.includes("COUNT(*)")) return [[{ count: 3 }], []];
      return [[{ id: 2, status: 2 }], []];
    },
  }));

  const result = await service.getResults({ userid: 8, limit: 1, offset: 1 });

  assert.deepEqual(result, {
    status: 200,
    message: "Success",
    count: 3,
    data: [{ id: 2, status: 2 }],
  });
  assert.match(calls[1].sql, /status IN \(1, 2\)/);
  assert.deepEqual(calls[1].params, [8, 1, 1]);
});

test("Mine multiplier endpoint selects the Laravel response fields", async () => {
  const service = new MineService(() => ({
    execute: async () => [[{ id: 1, name: "safe", multiplier: 1.5 }], []],
  }));

  assert.deepEqual(await service.getMultipliers(), {
    status: 200,
    data: [{ id: 1, name: "safe", multiplier: 1.5 }],
  });
});
