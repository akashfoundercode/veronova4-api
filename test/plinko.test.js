"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { PlinkoService } = require("../src/modules/plinko/plinko.service");

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

test("Plinko bet deducts wallet and stores legacy zero-tax bet fields atomically", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, wallet FROM users")) return [{ id: 7, wallet: 20 }];
    if (sql.startsWith("SELECT id FROM plinko_bets")) return [];
    if (sql.startsWith("SELECT * FROM plinko_bets")) return [{ id: 4, amount: 10 }];
    if (sql.startsWith("INSERT INTO plinko_bets")) return { insertId: 4 };
    return [];
  });
  const service = new PlinkoService(() => ({ getConnection: async () => connection }));

  const result = await service.placeBet({
    userid: 7,
    game_id: 11,
    amount: 10,
    type: "medium",
  });

  assert.equal(result.status, 200);
  assert.equal(connection.committed, true);
  const insert = connection.calls.find(({ sql }) => sql.startsWith("INSERT INTO plinko_bets"));
  assert.match(insert.sql, /tax, after_tax, orderid/);
  assert.deepEqual(insert.params.slice(0, 5), [10, 11, "medium", 7, 10]);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE users SET wallet = wallet - ?") &&
    params[0] === 10,
  ));
});

test("legacy Plinko bet mode requires the original ten-rupee minimum", async () => {
  const service = new PlinkoService(() => ({}));

  await assert.rejects(
    service.placeBet(
      { userid: 7, game_id: 11, amount: 5, type: "medium" },
      { legacyWalletMode: true },
    ),
    { code: "INVALID_AMOUNT" },
  );
});

test("Plinko multiplier resolves index and credits the calculated winnings", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, amount, type FROM plinko_bets")) {
      return [{ id: 4, amount: 10, type: "medium" }];
    }
    if (sql.startsWith("SELECT multiplier FROM plinko_index_lists")) {
      return [{ multiplier: 2.5 }];
    }
    return [];
  });
  const service = new PlinkoService(() => ({ getConnection: async () => connection }));

  const result = await service.calculateMultiplier({ userid: 7, index: 3 });

  assert.equal(result.win_amount, 25);
  assert.equal(connection.committed, true);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE users SET wallet = wallet + ?") &&
    params[0] === 25,
  ));
});

test("Plinko out-of-range index marks the bet as lost without wallet credit", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, amount, type FROM plinko_bets")) {
      return [{ id: 4, amount: 10, type: "medium" }];
    }
    if (sql.startsWith("SELECT multiplier FROM plinko_index_lists")) return [];
    return [];
  });
  const service = new PlinkoService(() => ({ getConnection: async () => connection }));

  const result = await service.calculateMultiplier({ userid: 7, index: 99 });

  assert.equal(result.win_amount, "0");
  assert.equal(connection.committed, true);
  assert.ok(connection.calls.some(({ sql }) =>
    sql.includes("SET status = 2, indexs = ?, multipler = 'out', win_amount = 0"),
  ));
  assert.equal(connection.calls.some(({ sql }) => sql.startsWith("UPDATE users")), false);
});

test("Plinko index list and history retain Laravel's success/no-data response shapes", async () => {
  const service = new PlinkoService(() => ({
    execute: async (sql, params) => [
      sql.includes("plinko_index_lists") && params[0] === "medium"
        ? [{ indexs: 1, multiplier: 2 }]
        : [],
      [],
    ],
  }));

  assert.deepEqual(await service.getIndexList("medium"), {
    status: 200,
    message: "Success",
    data: [{ indexs: 1, multiplier: 2 }],
  });
  assert.deepEqual(await service.getResults({ userid: 7 }), {
    status: 400,
    message: "No data found",
  });
});
