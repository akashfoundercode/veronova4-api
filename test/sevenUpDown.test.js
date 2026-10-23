"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  DICE_IMAGE_BASE,
  SevenUpDownService,
  makeDiceResult,
} = require("../src/modules/sevenUpDown/sevenUpDown.service");

function createConnection(respond) {
  const calls = [];
  let committed = false;
  return {
    calls,
    get committed() {
      return committed;
    },
    async beginTransaction() {},
    async execute(sql, params) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalized, params });
      return [respond(normalized), []];
    },
    async commit() {
      committed = true;
    },
    async rollback() {},
    release() {},
  };
}

test("7 Up Down dice results store two legacy image URLs and a possible dice total", () => {
  for (const result of [1, 2, 3]) {
    const diceResult = makeDiceResult(result);
    assert.equal(diceResult.dice.length, 2);
    assert.equal(diceResult.total, diceResult.dice[0] + diceResult.dice[1]);
    assert.deepEqual(
      diceResult.images,
      diceResult.dice.map((die) => `${DICE_IMAGE_BASE}/${die}.png`),
    );
    if (result === 1) assert.ok(diceResult.total <= 6);
    if (result === 2) assert.equal(diceResult.total, 7);
    if (result === 3) assert.ok(diceResult.total >= 7);
  }
});

test("7 Up Down settlement records dice data, pays 2x gross and credits wallet only", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT winning_percentage FROM game_settings")) {
      return [{ winning_percentage: 20 }];
    }
    if (sql.startsWith("SELECT id, games_no, number, amount FROM betlogs")) {
      return [{
        id: 1,
        games_no: "20261010150001",
        number: 2,
        amount: 10,
      }];
    }
    if (sql.startsWith("SELECT id FROM bet_results")) return [];
    if (sql.startsWith("SELECT id, userid, amount, number FROM bets")) {
      return [
        { id: 5, userid: 8, amount: 20, number: 2 },
        { id: 6, userid: 9, amount: 5, number: 1 },
      ];
    }
    return [];
  });
  const service = new SevenUpDownService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settleRound(15, { forcedResult: 2 });

  assert.equal(result.resultNumber, 2);
  assert.equal(result.diceTotal, 7);
  assert.equal(connection.committed, true);
  const resultInsert = connection.calls.find(({ sql }) =>
    sql.startsWith("INSERT INTO bet_results"),
  );
  assert.equal(resultInsert.params[0], 2);
  assert.equal(resultInsert.params[2], 15);
  assert.equal(JSON.parse(resultInsert.params[3]).length, 2);
  assert.equal(resultInsert.params[4], 7);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE bets") &&
    params[0] === 1 &&
    params[1] === 40 &&
    params[2] === 7 &&
    params[3] === 5,
  ));
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE users SET wallet = wallet + ?") &&
    params[0] === 40 &&
    params[1] === 8,
  ));
  assert.equal(
    connection.calls.some(({ sql }) => sql.includes("winning_wallet =")),
    false,
  );
});
