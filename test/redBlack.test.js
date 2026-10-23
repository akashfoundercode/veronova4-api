"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  RedBlackService,
  amountBasedResult,
  coloursForResult,
} = require("../src/modules/redBlack/redBlack.service");
const { API_ROUTES } = require("../src/config/apiRoutes");

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
      const normalized = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalized, params });
      return [respond(normalized, params), []];
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

test("Red & Black outcomes map to the legacy card colours", () => {
  assert.deepEqual(coloursForResult(1), ["d"]);
  assert.deepEqual(coloursForResult(2), ["c"]);
  assert.deepEqual(coloursForResult(3), ["k"]);
  assert.deepEqual(coloursForResult(4), ["e"]);
  assert.deepEqual(coloursForResult(5), ["e", "d"]);
  assert.deepEqual(coloursForResult(6), ["e", "d"]);
  assert.deepEqual(coloursForResult(7), ["c", "k"]);
  assert.throws(() => coloursForResult(8), { code: "INVALID_RESULT_NUMBER" });
});

test("Red & Black cron uses the legacy low-total random and percentage candidate rules", () => {
  const logs = [
    { number: 1, amount: 15 },
    { number: 2, amount: 25 },
    { number: 3, amount: 50 },
  ];
  assert.ok([1, 2, 3].includes(amountBasedResult(logs, 449, 20)));
  assert.equal(amountBasedResult(logs, 500, 20), 1);
  assert.equal(amountBasedResult(
    [{ number: 6, amount: 25 }, { number: 7, amount: 45 }],
    500,
    20,
  ), 6);
});

test("Red & Black bets preserve the batch no-commission and minimum amount rules", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, wallet, recharge")) {
      return [{ id: 8, wallet: 50, recharge: 40 }];
    }
    if (sql.startsWith("SELECT games_no FROM betlogs")) {
      return [{ games_no: "20261010160001" }];
    }
    if (sql.startsWith("SELECT number, actual_number, multiplier")) {
      return [
        { number: 1, actual_number: 1, multiplier: 2 },
        { number: 2, actual_number: 2, multiplier: 3 },
      ];
    }
    return [];
  });
  let committed = false;
  connection.commit = async () => {
    committed = true;
  };
  const service = new RedBlackService(() => ({
    getConnection: async () => connection,
  }));

  const response = await service.placeBets({
    userid: 8,
    game_id: 16,
    bets: [{ number: 1, amount: 0.1 }, { number: 2, amount: 10 }],
  });

  assert.deepEqual(response, { status: 200, message: "Bet Successfully" });
  assert.equal(committed, true);
  const inserts = connection.calls.filter(({ sql }) => sql.startsWith("INSERT INTO bets"));
  assert.equal(inserts.length, 2);
  assert.deepEqual(inserts.map(({ params }) => params.slice(0, 4)), [
    [0.1, 0.1, 0, 1],
    [10, 10, 0, 2],
  ]);
  assert.deepEqual(
    connection.calls.filter(({ sql }) => sql.startsWith("UPDATE betlogs")).map(({ params }) => params),
    [
      [0.2, 16, 1, "20261010160001"],
      [30, 16, 2, "20261010160001"],
    ],
  );
});

test("Red & Black single bets apply 2% commission but log the gross multiplier amount", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, wallet, recharge")) {
      return [{ id: 8, wallet: 50, recharge: 40 }];
    }
    if (sql.startsWith("SELECT games_no FROM betlogs")) {
      return [{ games_no: "20261010160001" }];
    }
    if (sql.startsWith("SELECT number, actual_number, multiplier")) {
      return [{ number: 1, actual_number: 1, multiplier: 2 }];
    }
    return [];
  });
  const service = new RedBlackService(() => ({
    getConnection: async () => connection,
  }));

  await service.placeBets({
    userid: 8,
    game_id: 16,
    bets: [{ number: 1, amount: 10 }],
    chargeCommission: true,
  });

  const insert = connection.calls.find(({ sql }) => sql.startsWith("INSERT INTO bets"));
  assert.equal(insert.params[1], 9.8);
  assert.equal(insert.params[2], 0.2);
  const logUpdate = connection.calls.find(({ sql }) => sql.startsWith("UPDATE betlogs"));
  assert.equal(logUpdate.params[0], 20);
});

test("Red & Black stores the mapped card and settles matching bets using the legacy payout", async () => {
  const connection = createConnection((sql, params) => {
    if (sql.startsWith("SELECT winning_percentage FROM game_settings")) {
      return [{ winning_percentage: 20 }];
    }
    if (sql.startsWith("SELECT id, games_no, number, amount FROM betlogs")) {
      return [{ id: 1, games_no: "20261010160001", number: 5, amount: 30 }];
    }
    if (sql.startsWith("SELECT id FROM bet_results")) return [];
    if (sql.startsWith("SELECT id, number, number_count FROM result_pattern_set")) return [];
    if (sql.startsWith("SELECT type FROM wingo_result_type")) return [{ type: 1 }];
    if (sql.startsWith("SELECT COALESCE(SUM(amount), 0)")) return [{ amount: 500 }];
    if (sql.startsWith("SELECT number FROM admin_winner_results")) return [{ number: 5 }];
    if (sql.startsWith("SELECT id FROM cards WHERE card = 11")) return [{ id: 11 }];
    if (sql.startsWith("SELECT image FROM cards WHERE colour = ?")) {
      assert.ok(["e", "d"].includes(params[0]));
      return [{ image: "https://example.test/card.png" }];
    }
    if (sql.startsWith("SELECT multiplier FROM virtual_games")) {
      return [{ multiplier: 3 }];
    }
    if (sql.startsWith("SELECT id, userid, amount, number FROM bets")) {
      return [
        { id: 31, userid: 8, amount: 10, number: 5 },
        { id: 32, userid: 8, amount: 20, number: 6 },
      ];
    }
    return [];
  });
  const service = new RedBlackService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settleRound(16);

  assert.equal(result.resultNumber, 5);
  assert.equal(result.image, "https://example.test/card.png");
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  const resultInsert = connection.calls.find(({ sql }) =>
    sql.startsWith("INSERT INTO bet_results"),
  );
  assert.deepEqual(resultInsert.params, [
    5,
    "20261010160001",
    16,
    "https://example.test/card.png",
    "https://example.test/card.png",
    5,
  ]);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE bets SET trade_amount = ?") &&
    params[0] === 3,
  ));
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE bets SET status = ?, win_amount = ?, trade_amount = ?, win_number = ?") &&
    params[0] === 1 &&
    params[1] === 30 &&
    params[2] === 3 &&
    params[3] === 5 &&
    params[4] === 31,
  ));
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE users SET wallet = wallet + ?") &&
    params[0] === 30 &&
    params[1] === 8,
  ));
  assert.equal(
    connection.calls.some(({ sql }) => sql.includes("winning_wallet =")),
    false,
  );
});

test("Red & Black advances game-specific result patterns transactionally", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, games_no, number, amount FROM betlogs")) {
      return [{ id: 1, games_no: "20261010160001", number: 2, amount: 0 }];
    }
    if (sql.startsWith("SELECT id FROM bet_results")) return [];
    if (sql.startsWith("SELECT id, number, number_count FROM result_pattern_set")) {
      return [
        { id: 1, number: 2, number_count: 2 },
        { id: 2, number: 3, number_count: 3 },
      ];
    }
    if (sql.startsWith("SELECT id, current_index, remaining_count FROM pattern_tracking")) {
      return [{ id: 4, current_index: 0, remaining_count: 1 }];
    }
    if (sql.startsWith("SELECT image FROM cards WHERE colour = ?")) {
      return [{ image: "club.png" }];
    }
    if (sql.startsWith("SELECT multiplier FROM virtual_games")) return [{ multiplier: 4 }];
    if (sql.startsWith("SELECT id, userid, amount, number FROM bets")) return [];
    return [];
  });
  const service = new RedBlackService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settleRound(16);

  assert.equal(result.resultNumber, 2);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE pattern_tracking") &&
    params[0] === 1 &&
    params[1] === 3 &&
    params[2] === 4,
  ));
  assert.equal(
    connection.calls.some(({ sql }) => sql.startsWith("SELECT type FROM wingo_result_type")),
    false,
  );
  assert.equal(connection.committed, true);
});

test("Red & Black uses the Laravel cron URL alias and returns full result records", async () => {
  assert.equal(API_ROUTES.wingo.cronNews, "/cron_news/:game_id/");
  const queries = [];
  const service = new RedBlackService(() => ({
    async execute(sql, params) {
      queries.push({ sql, params });
      if (sql.startsWith("SELECT COUNT(*)")) return [[{ total_result: 2 }], []];
      return [[{ id: 1, game_id: 16, json: "card.png", win_number: "card.png", random_card: 5 }], []];
    },
  }));
  const result = await service.getResults({ game_id: 16, limit: 10, offset: 0 });
  assert.deepEqual(result, {
    total_result: 2,
    data: [{
      id: 1,
      game_id: 16,
      json: "card.png",
      win_number: "card.png",
      random_card: 5,
    }],
  });
  assert.ok(queries.some(({ sql }) => sql.includes("SELECT * FROM bet_results")));
});
