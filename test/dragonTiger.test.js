"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../src/app");
const { API_ROUTES, apiUrl } = require("../src/config/apiRoutes");
const {
  DragonTigerService,
  chooseOutcome,
} = require("../src/modules/dragonTiger/dragonTiger.service");
const { AndarBaharService } = require("../src/modules/andarBahar/andarBahar.service");

function createConnection({ wallet = 100, options = [1, 2, 3] } = {}) {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  let released = false;
  const connection = {
    calls,
    get committed() { return committed; },
    get rolledBack() { return rolledBack; },
    get released() { return released; },
    async beginTransaction() {},
    async execute(sql, params) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalizedSql, params });
      if (normalizedSql.startsWith("SELECT id, wallet")) {
        return [[{ id: 1, wallet, recharge: 40, status: 1 }], []];
      }
      if (normalizedSql.startsWith("SELECT games_no FROM betlogs")) {
        return [[{ games_no: "20261010100001" }], []];
      }
      if (normalizedSql.startsWith("SELECT number, actual_number, multiplier")) {
        return [[
          { number: 1, actual_number: 1, multiplier: 2 },
          { number: 2, actual_number: 2, multiplier: 2 },
          { number: 3, actual_number: 3, multiplier: 5 },
        ].filter((option) => options.includes(option.number)), []];
      }
      return [{ affectedRows: 1 }, []];
    },
    async commit() { committed = true; },
    async rollback() { rolledBack = true; },
    release() { released = true; },
  };
  return connection;
}

test("Dragon Tiger selects an unbet outcome before a bet outcome", () => {
  const result = chooseOutcome(
    [1, 2, 3],
    [{ number: 1, total_amt: 5 }, { number: 2, total_amt: 0 }, { number: 3, total_amt: 7 }],
    null,
    () => 0,
  );

  assert.equal(result, 2);
});

test("Dragon Tiger batch bets use the legacy no-commission payout log and transaction", async () => {
  const connection = createConnection();
  const service = new DragonTigerService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.placeBets({
    userid: 1,
    game_id: 10,
    bets: [{ number: 1, amount: 10 }, { number: 3, amount: 5 }],
  });

  test("the shared batch-bet handler accepts Andar Bahar without changing its game ID", async () => {
    const connection = createConnection();
    const service = new DragonTigerService(() => ({
      getConnection: async () => connection,
    }));

    await service.placeBets({
      userid: 1,
      game_id: 13,
      bets: [{ number: 1, amount: 10 }],
    });

    const insert = connection.calls.find(({ sql }) =>
      sql.startsWith("INSERT INTO bets"),
    );
    assert.equal(insert.params[5], 13);
    assert.equal(connection.committed, true);
  });

  assert.deepEqual(result, { status: 200, message: "Bet Successfully" });
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  assert.equal(connection.released, true);
  const inserts = connection.calls.filter(({ sql }) => sql.startsWith("INSERT INTO bets"));
  assert.equal(inserts.length, 2);
  assert.equal(inserts[0].params[1], 10);
  assert.equal(inserts[0].params[2], 0);
  const logUpdates = connection.calls.filter(({ sql }) => sql.startsWith("UPDATE betlogs"));
  assert.deepEqual(logUpdates.map(({ params }) => params[0]), [20, 25]);
  const walletUpdate = connection.calls.find(({ sql }) => sql.startsWith("UPDATE users"));
  assert.deepEqual(walletUpdate.params, [15, 15, 15, 1]);
});

test("Dragon Tiger rejects an invalid bet option and rolls back the whole batch", async () => {
  const connection = createConnection({ options: [1, 2] });
  const service = new DragonTigerService(() => ({
    getConnection: async () => connection,
  }));

  await assert.rejects(
    service.placeBets({
      userid: 1,
      game_id: 10,
      bets: [{ number: 1, amount: 10 }, { number: 3, amount: 5 }],
    }),
    { code: "INVALID_BET_NUMBER" },
  );
  assert.equal(connection.committed, false);
  assert.equal(connection.rolledBack, true);
  assert.equal(connection.released, true);
  assert.equal(connection.calls.some(({ sql }) => sql.startsWith("INSERT INTO bets")), false);
});

test("Dragon Tiger rejects bets when the complete batch exceeds the wallet", async () => {
  const connection = createConnection({ wallet: 10 });
  const service = new DragonTigerService(() => ({
    getConnection: async () => connection,
  }));

  await assert.rejects(
    service.placeBets({
      userid: 1,
      game_id: 10,
      bets: [{ number: 1, amount: 10 }, { number: 2, amount: 1 }],
    }),
    { code: "INSUFFICIENT_FUNDS" },
  );
  assert.equal(connection.rolledBack, true);
  assert.equal(connection.calls.some(({ sql }) => sql.startsWith("INSERT INTO bets")), false);
});

test("Dragon Tiger settles the current round with cards, payout, and betlog advancement atomically", async () => {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  let released = false;
  const connection = {
    async beginTransaction() {},
    async execute(sql, params) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalizedSql, params });
      if (normalizedSql.startsWith("SELECT games_no, number, amount")) {
        return [[
          { games_no: "20261010100001", number: 1, amount: 10 },
          { games_no: "20261010100001", number: 2, amount: 0 },
          { games_no: "20261010100001", number: 3, amount: 0 },
        ], []];
      }
      if (normalizedSql.startsWith("SELECT id FROM bet_results")) return [[], []];
      if (normalizedSql.startsWith("SELECT number FROM admin_winner_results")) {
        return [[{ number: 1 }], []];
      }
      if (normalizedSql.startsWith("SELECT card, image FROM cards")) {
        return [[
          { card: "2", image: "dragon-2.png" },
          { card: "3", image: "tiger-3.png" },
        ], []];
      }
      if (normalizedSql.startsWith("SELECT number, multiplier FROM virtual_games")) {
        return [[{ number: 1, multiplier: 2 }], []];
      }
      if (normalizedSql.startsWith("SELECT userid, win_amount FROM bets")) {
        return [[{ userid: 1, win_amount: 20 }], []];
      }
      return [{ affectedRows: 1 }, []];
    },
    async commit() { committed = true; },
    async rollback() { rolledBack = true; },
    release() { released = true; },
  };
  const service = new DragonTigerService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settleRound(10);

  assert.equal(result.result, 1);
  assert.equal(committed, true);
  assert.equal(rolledBack, false);
  assert.equal(released, true);
  const resultInsert = calls.find(({ sql }) => sql.startsWith("INSERT INTO bet_results"));
  assert.deepEqual(resultInsert.params.slice(0, 4), [
    1,
    "20261010100001",
    10,
    JSON.stringify([3, 2]),
  ]);
  assert.deepEqual(
    calls.find(({ sql }) => sql.startsWith("UPDATE users")).params,
    [20, 20, 1],
  );
  assert.equal(
    calls.some(({ sql }) => sql.startsWith("UPDATE betlogs SET amount = 0, games_no = games_no + 1")),
    true,
  );
});

test("Andar Bahar has its own service and settles the round using its card sequence", async () => {
  const calls = [];
  let committed = false;
  const connection = {
    async beginTransaction() {},
    async execute(sql, params) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalizedSql, params });
      if (normalizedSql.startsWith("SELECT games_no, number, amount")) {
        return [[
          { games_no: "20261010130001", number: 1, amount: 10 },
          { games_no: "20261010130001", number: 2, amount: 0 },
        ], []];
      }
      if (normalizedSql.startsWith("SELECT id FROM bet_results")) return [[], []];
      if (normalizedSql.startsWith("SELECT number FROM admin_winner_results")) {
        return [[{ number: 1 }], []];
      }
      if (normalizedSql.includes("JOIN bet_results ON cards.card = bet_results.random_card")) {
        return [[{ id: 7, card: 5 }], []];
      }
      if (normalizedSql.startsWith("SELECT id, card FROM cards")) {
        return [[
          ...Array.from({ length: 12 }, (_, index) => ({
            id: index + 1,
            card: index % 12 + 1,
          })),
          { id: 99, card: 5 },
        ], []];
      }
      if (normalizedSql.startsWith("SELECT number, multiplier FROM virtual_games")) {
        return [[{ number: 1, multiplier: 2 }], []];
      }
      if (normalizedSql.startsWith("SELECT userid, win_amount FROM bets")) {
        return [[{ userid: 1, win_amount: 20 }], []];
      }
      return [{ affectedRows: 1 }, []];
    },
    async commit() { committed = true; },
    async rollback() {},
    release() {},
  };
  const service = new AndarBaharService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settleRound(13);

  assert.equal(result.result, 1);
  assert.equal(committed, true);
  const inserted = calls.find(({ sql }) =>
    sql.startsWith("INSERT INTO bet_results") && sql.includes("random_card"),
  );
  assert.equal(inserted.params[2], 13);
  assert.ok(JSON.parse(inserted.params[3]).length > 0);
  assert.ok(calls.some(({ sql }) =>
    sql.includes("UPDATE bets SET win_amount = trade_amount * ?") &&
    sql.includes("game_id = ?"),
  ));
  assert.ok(calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE betlogs SET amount = 0, games_no = games_no + 1 WHERE game_id = ?") &&
    params[0] === 13,
  ));
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

test("the original Dragon Tiger batch URL requires an authenticated user", async () => {
  assert.equal(API_ROUTES.dragonTiger.batchBet, API_ROUTES.games.dragonBet);
  const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.dragonTiger.batchBet)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userid: 1,
      game_id: 10,
      json: [{ number: 1, amount: 1 }],
    }),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "Unauthenticated." });
});
