"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  HEADS_IMAGE,
  HeadTailService,
  TAILS_IMAGE,
} = require("../src/modules/headTail/headTail.service");

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

test("Head Tail settlement stores heads image and pays from gross bet amount", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT winning_percentage FROM game_settings")) {
      return [{ winning_percentage: 20 }];
    }
    if (sql.startsWith("SELECT id, games_no, number, amount FROM betlogs")) {
      return [
        { id: 1, games_no: "20261010140001", number: 1, amount: 10 },
        { id: 2, games_no: "20261010140001", number: 2, amount: 0 },
      ];
    }
    if (sql.startsWith("SELECT number FROM admin_winner_results")) {
      return [{ number: "1" }];
    }
    if (sql.startsWith("SELECT name, number, multiplier FROM virtual_games")) {
      return [{ name: "Head", number: 1, multiplier: 2 }];
    }
    if (sql.startsWith("SELECT userid, win_amount FROM bets")) {
      return [{ userid: 8, win_amount: 20 }];
    }
    return [];
  });
  const service = new HeadTailService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settleRound(14);

  assert.equal(result.resultNumber, 1);
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  const insert = connection.calls.find(({ sql }) =>
    sql.startsWith("INSERT INTO bet_results"),
  );
  assert.deepEqual(insert.params, [
    1,
    "20261010140001",
    14,
    HEADS_IMAGE,
    HEADS_IMAGE,
  ]);
  const payout = connection.calls.find(({ sql }) =>
    sql.includes("SET win_amount = amount * ?"),
  );
  assert.deepEqual(payout.params, [2, 1, "20261010140001", 14, 1]);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE users") &&
    params.join(",") === "20,20,8",
  ));
});

test("Head Tail settlement stores tails image for the tail result", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT winning_percentage FROM game_settings")) {
      return [{ winning_percentage: 20 }];
    }
    if (sql.startsWith("SELECT id, games_no, number, amount FROM betlogs")) {
      return [{ id: 1, games_no: "20261010140001", number: 2, amount: 10 }];
    }
    if (sql.startsWith("SELECT number FROM admin_winner_results")) {
      return [{ number: "2" }];
    }
    if (sql.startsWith("SELECT name, number, multiplier FROM virtual_games")) {
      return [{ name: "Tail", number: 2, multiplier: 2 }];
    }
    return [];
  });
  const service = new HeadTailService(() => ({
    getConnection: async () => connection,
  }));

  await service.settleRound(14);

  const insert = connection.calls.find(({ sql }) =>
    sql.startsWith("INSERT INTO bet_results"),
  );
  assert.equal(insert.params[3], TAILS_IMAGE);
  assert.equal(insert.params[4], TAILS_IMAGE);
});

test("Head Tail settlement rejects another game's ID", async () => {
  const service = new HeadTailService(() => ({}));

  await assert.rejects(service.settleRound(13), { code: "INVALID_GAME_ID" });
});
