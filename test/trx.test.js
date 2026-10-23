"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../src/app");
const { API_ROUTES, apiUrl } = require("../src/config/apiRoutes");
const {
  TrxService,
  assertTrxGameId,
  buildTrxResult,
  nextTrxPeriod,
  parseTrxBlock,
} = require("../src/modules/trx/trx.service");

function createConnection(respond) {
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
    release() {
      released = true;
    },
  };
}

test("TRX game IDs map to their existing result tables", () => {
  assert.equal(assertTrxGameId(6), 6);
  assert.equal(buildTrxResult({
    gameId: 9,
    number: "123",
    datetime: "2026-10-10 12:00:54",
    digit: 6,
    lastFour: "a1b2",
    fullHash: "8fa1b2",
  }).table, "trx_ten_min_result");
  assert.throws(() => assertTrxGameId(5), /selected TRX game_id is invalid/);
});

test("TRX block hash processing extracts the last numeric result digit", () => {
  const parsed = parseTrxBlock({
    tr_number: "123456",
    tr_digits: "abcde12f3",
    tr_overall_hash: JSON.stringify({ updatedTimestamp: 1791633654000 }),
  }, 6);

  assert.equal(parsed.table, "trx_one_min_result");
  assert.equal(parsed.blocknumber, "123456");
  assert.equal(parsed.result, 3);
  assert.equal(parsed.hash_value, "**12f3");
  assert.equal(parsed.five_digit_value, "abcde12f3");
});

test("TRX periods increment on the same local date and reset to the configured day seed", () => {
  const today = new Date("2026-10-10T12:00:00+05:30");
  assert.equal(
    nextTrxPeriod("20261010103010409", "2026-10-10 11:59:54", today),
    "20261010103010410",
  );
  assert.equal(
    nextTrxPeriod("20261009103010409", "2026-10-09 23:59:54", today),
    "20261010103010409",
  );
});

test("TRX bets use the current period, 2% commission, and atomically debit the wallet", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, wallet, recharge, status FROM users")) {
      return [{ id: 7, wallet: 50, recharge: 5, status: 1 }];
    }
    if (sql.startsWith("SELECT games_no FROM betlogs")) return [{ games_no: "2026101060001" }];
    if (sql.startsWith("SELECT name, multiplier, actual_number FROM virtual_games")) {
      return [{ name: "Big", multiplier: 2, actual_number: 6 }];
    }
    return { affectedRows: 1, insertId: 20 };
  });
  const service = new TrxService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.placeBet({
    userid: 7,
    game_id: 6,
    number: 40,
    amount: 10,
  });

  assert.deepEqual(result, { status: 200, message: "Bet Successfully Placed" });
  const insert = connection.calls.find(({ sql }) => sql.startsWith("INSERT INTO bets"));
  assert.deepEqual(insert.params.slice(0, 7), [10, 0.2, 9.8, 40, "2026101060001", 6, 7]);
  const walletUpdate = connection.calls.find(({ sql }) => sql.startsWith("UPDATE users"));
  assert.deepEqual(walletUpdate.params, [10, 10, 10, 7]);
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  assert.equal(connection.released, true);
});

test("TRX game serial initialization updates only game IDs 6 through 9", async () => {
  const connection = createConnection(() => ({ affectedRows: 1 }));
  const service = new TrxService(() => ({
    getConnection: async () => connection,
  }));

  await service.getGameSerialNo(new Date("2026-10-10T12:00:00+05:30"));

  const updates = connection.calls.filter(({ sql }) => sql.startsWith("UPDATE betlogs"));
  assert.deepEqual(updates.map(({ params }) => params), [
    ["20261010060001", 6],
    ["20261010070001", 7],
    ["20261010080001", 8],
    ["20261010090001", 9],
  ]);
  assert.equal(connection.committed, true);
});

test("TRX result lookup uses a whitelisted period table and bound values", async () => {
  let query;
  const service = new TrxService(() => ({
    async execute(sql, params) {
      query = { sql: sql.replace(/\s+/g, " ").trim(), params };
      return [[{ result: 4 }], []];
    },
  }));

  const result = await service.getResultByPeriod({
    game_id: 7,
    period_no: "2026101070001",
  });

  assert.deepEqual(result, { win_number: "4", status: "200" });
  assert.match(query.sql, /FROM `trx_three_min_result`/);
  assert.deepEqual(query.params, [7, "2026101070001"]);
});

test("TRX settlement marks winners and pays their existing wallet fields atomically", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, userid, number, trade_amount FROM bets")) {
      return [
        { id: 11, userid: 7, number: 6, trade_amount: 9.8 },
        { id: 12, userid: 8, number: 4, trade_amount: 5 },
      ];
    }
    if (sql.startsWith("SELECT name, multiplier, actual_number, type FROM virtual_games")) {
      return [
        { name: "Big", number: 40, multiplier: 2, actual_number: 6, type: 1 },
        { name: "six", number: 6, multiplier: 9.8, actual_number: 6, type: 0 },
      ];
    }
    return { affectedRows: 1 };
  });
  const service = new TrxService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settlePeriod({
    game_id: 6,
    games_no: "2026101060001",
    result: 6,
  });

  assert.deepEqual(result, { settled: 2, winners: 1 });
  const betUpdates = connection.calls.filter(({ sql }) => sql.startsWith("UPDATE bets"));
  assert.deepEqual(betUpdates[0].params, [1, 6, 96.04, 11]);
  assert.deepEqual(betUpdates[1].params, [2, 6, 0, 12]);
  const walletUpdate = connection.calls.find(({ sql }) => sql.startsWith("UPDATE users"));
  assert.deepEqual(walletUpdate.params, [96.04, 96.04, 7]);
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
});

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("TRX result-by-period route preserves URL and validation shape", async () => {
  const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.trx.resultByPeriod)}?gameid=6`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 400,
    message: "The period_no field is required.",
  });
});

test("the shared bets URL still requires authentication for TRX game IDs", async () => {
  const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.games.bet)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userid: 1, game_id: 6, number: 3, amount: 1 }),
  });
  assert.equal(response.status, 401);
});
