"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  STANDARD_GAME_IDS,
  WingoService,
  calculateBetAmounts,
  chooseWinningNumber,
  formatPeriod,
} = require("../src/modules/wingo/wingo.service");

test("the legacy shared game IDs match the configured non-provider games", () => {
  assert.deepEqual(STANDARD_GAME_IDS, [
    1, 2, 3, 4, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26,
  ]);
});

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

test("Wingo commission and trade amount use the Laravel 2% rule", () => {
  assert.deepEqual(calculateBetAmounts(100), {
    commission: 2,
    tradeAmount: 98,
  });
  assert.deepEqual(calculateBetAmounts(1), {
    commission: 0.02,
    tradeAmount: 0.98,
  });
});

test("Wingo period format preserves the existing game ID sequence", () => {
  const date = new Date(2026, 9, 10, 12, 0, 0);

  assert.equal(formatPeriod(date, 1), "20261010010001");
  assert.equal(formatPeriod(date, 4), "20261010040001");
});

test("an empty Wingo round randomly chooses between logged number bounds", () => {
  const result = chooseWinningNumber(
    { logNumbers: [0, 1, 2, 9], totalBet: 0, amountRows: [] },
    () => 0,
  );

  assert.equal(result, 0);
});

test("Wingo prefers a number with no bets when any are available", () => {
  const result = chooseWinningNumber(
    {
      logNumbers: [0, 1, 2, 3],
      totalBet: 10,
      amountRows: [
        { number: 0, total_amt: 4 },
        { number: 2, total_amt: 6 },
      ],
    },
    () => 0.99,
  );

  assert.equal(result, 3);
});

test("Wingo picks randomly among equally lowest bet totals when all numbers are bet", () => {
  const result = chooseWinningNumber(
    {
      logNumbers: [0, 1, 2],
      totalBet: 10,
      amountRows: [
        { number: 0, total_amt: 2 },
        { number: 1, total_amt: 5 },
        { number: 2, total_amt: 2 },
      ],
    },
    () => 0.99,
  );

  assert.equal(result, 2);
});

test("the provider-result adapter preserves Wingo query parameter names", async () => {
  let requestedUrl;
  const service = new WingoService(undefined, async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({ win_number: 0 }),
    };
  });

  const result = await service.fetchProviderResult(1, "20261010010001");

  assert.equal(result, 0);
  assert.equal(requestedUrl.searchParams.get("gameid"), "1");
  assert.equal(requestedUrl.searchParams.get("period_no"), "20261010010001");
});

test("placing a Wingo bet writes the legacy tables and debits the wallet atomically", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, games_no, number FROM betlogs")) {
      return [{ id: 1, games_no: "20261010010001", number: 2 }];
    }
    if (sql.startsWith("SELECT id, wallet, recharge FROM users")) {
      return [{ id: 8, wallet: 50, recharge: 35 }];
    }
    if (sql.startsWith("SELECT multiplier, actual_number FROM virtual_games")) {
      return [{ multiplier: 9, actual_number: 2 }];
    }
    return [];
  });
  const service = new WingoService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.placeBet({
    userid: 8,
    game_id: 1,
    number: "2",
    amount: 10,
  });

  assert.deepEqual(result, { status: 200, message: "Bet Successfully Placed" });
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  assert.equal(connection.released, true);
  assert.ok(connection.calls.some(({ sql }) => sql.startsWith("INSERT INTO bets")));
  assert.ok(connection.calls.some(({ sql }) => sql.startsWith("UPDATE betlogs SET amount")));
  assert.ok(connection.calls.some(({ sql }) => sql.startsWith("UPDATE users SET recharge")));
  assert.deepEqual(
    connection.calls.find(({ sql }) => sql.startsWith("INSERT INTO bets")).params.slice(0, 7),
    [10, 0.2, 9.8, "2", "20261010010001", 1, 8],
  );
});

test("placing a supported non-Wingo game bet uses its game ID in the legacy tables", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, games_no, number FROM betlogs")) {
      return [{ id: 1, games_no: "20261010250001", number: 3 }];
    }
    if (sql.startsWith("SELECT id, wallet, recharge FROM users")) {
      return [{ id: 8, wallet: 50, recharge: 35 }];
    }
    if (sql.startsWith("SELECT multiplier, actual_number FROM virtual_games")) {
      return [{ multiplier: 8, actual_number: 3 }];
    }
    return [];
  });
  const service = new WingoService(() => ({
    getConnection: async () => connection,
  }));

  await service.placeBet({
    userid: 8,
    game_id: 25,
    number: "3",
    amount: 10,
  });

  const betInsert = connection.calls.find(({ sql }) =>
    sql.startsWith("INSERT INTO bets"),
  );
  assert.equal(betInsert.params[5], 25);
  assert.equal(connection.committed, true);
});

test("an insufficient Wingo wallet rolls back without inserting a bet", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, games_no, number FROM betlogs")) {
      return [{ id: 1, games_no: "20261010010001", number: 2 }];
    }
    if (sql.startsWith("SELECT id, wallet, recharge FROM users")) {
      return [{ id: 8, wallet: 5, recharge: 5 }];
    }
    return [];
  });
  const service = new WingoService(() => ({
    getConnection: async () => connection,
  }));

  await assert.rejects(
    service.placeBet({
      userid: 8,
      game_id: 1,
      number: "2",
      amount: 10,
    }),
    { message: "insufficient funds" },
  );

  assert.equal(connection.committed, false);
  assert.equal(connection.rolledBack, true);
  assert.equal(
    connection.calls.some(({ sql }) => sql.startsWith("INSERT INTO bets")),
    false,
  );
});

function settlementConnection(gameId, number, multiplier, winAmount) {
  return createConnection((sql) => {
    if (sql.startsWith("SELECT winning_percentage FROM game_settings")) {
      return [{ winning_percentage: 20 }];
    }
    if (sql.startsWith("SELECT id, games_no, number, amount FROM betlogs")) {
      return [{
        id: 1,
        games_no: `20261010${String(gameId).padStart(2, "0")}0001`,
        number,
        amount: 10,
      }];
    }
    if (sql.startsWith("SELECT COALESCE(SUM(amount)")) {
      return [{ amount: 10 }];
    }
    if (sql.startsWith("SELECT number FROM admin_winner_results")) {
      return [{ number: String(number) }];
    }
    if (sql.startsWith("SELECT name FROM virtual_games")) {
      return [{ name: "selected option" }];
    }
    if (sql.startsWith("SELECT number, multiplier FROM virtual_games")) {
      return [{ number, multiplier }];
    }
    if (sql.startsWith("SELECT userid, win_amount FROM bets")) {
      return [{ userid: 8, win_amount: winAmount }];
    }
    return [];
  });
}

test("settling a Wingo round honors admin results and stores the existing result shape", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT winning_percentage FROM game_settings")) {
      return [{ winning_percentage: 20 }];
    }
    if (sql.startsWith("SELECT id, games_no, number, amount FROM betlogs")) {
      return [
        { id: 1, games_no: "20261010010001", number: 0, amount: 0 },
        { id: 2, games_no: "20261010010001", number: 2, amount: 10 },
      ];
    }
    if (sql.startsWith("SELECT COALESCE(SUM(amount)")) {
      return [{ amount: 10 }];
    }
    if (sql.startsWith("SELECT number FROM admin_winner_results")) {
      return [{ number: "2" }];
    }
    if (sql.startsWith("SELECT name FROM virtual_games")) {
      return [{ name: "2" }, { name: "Green" }];
    }
    if (sql.startsWith("SELECT number, multiplier FROM virtual_games")) {
      return [{ number: 2, multiplier: 9 }];
    }
    if (sql.startsWith("SELECT userid, win_amount FROM bets")) {
      return [{ userid: 8, win_amount: 88.2 }];
    }
    return [];
  });
  const service = new WingoService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settleRound(1);

  assert.equal(result.resultNumber, 2);
  assert.equal(result.gameNo, "20261010010001");
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  assert.ok(connection.calls.some(({ sql }) =>
    sql.includes("WHERE gamesno = ? AND gameId = ?"),
  ));
  const insert = connection.calls.find(({ sql }) =>
    sql.startsWith("INSERT INTO bet_results"),
  );
  assert.deepEqual(insert.params, [
    2,
    "20261010010001",
    1,
    '["2","Green"]',
    2,
  ]);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("UPDATE betlogs SET amount = 0, games_no = ?") &&
    params[0] === "20261010010002"
  ));
});

test("settleRound increments games_no from last bet_results row if betlogs is behind or duplicate", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT winning_percentage FROM game_settings")) {
      return [{ winning_percentage: 20 }];
    }
    // betlogs has old duplicate number: 20250822905392
    if (sql.startsWith("SELECT id, games_no, number, amount FROM betlogs")) {
      return [{ id: 1, games_no: "20250822905392", number: 0, amount: 0 }];
    }
    // bet_results already has the same number 20250822905392
    if (sql.startsWith("SELECT games_no FROM bet_results")) {
      return [{ games_no: "20250822905392" }];
    }
    if (sql.startsWith("SELECT COALESCE(SUM(amount)")) {
      return [{ amount: 0 }];
    }
    if (sql.startsWith("SELECT number FROM admin_winner_results")) {
      return [];
    }
    if (sql.startsWith("SELECT name FROM virtual_games")) {
      return [{ name: "5" }, { name: "Big" }, { name: "Violet" }];
    }
    if (sql.startsWith("SELECT number, multiplier FROM virtual_games")) {
      return [{ number: 5, multiplier: 9 }];
    }
    return [];
  });

  const service = new WingoService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settleRound(1, { forcedResult: 5 });

  // Must be 20250822905393 (+1 of the latest result in bet_results!)
  assert.equal(result.gameNo, "20250822905393");
  const insert = connection.calls.find(({ sql }) => sql.startsWith("INSERT INTO bet_results"));
  assert.equal(insert.params[1], "20250822905393");

  const betlogsUpdate = connection.calls.find(({ sql }) => sql.startsWith("UPDATE betlogs SET amount = 0, games_no = ?"));
  assert.equal(betlogsUpdate.params[0], "20250822905394");
});

test("settlement accepts a configured non-Wingo result number above nine", async () => {
  const connection = settlementConnection(25, 12, 4, 39.2);
  const service = new WingoService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.settleRound(25);

  assert.equal(result.resultNumber, 12);
  assert.equal(connection.committed, true);
  const insert = connection.calls.find(({ sql }) =>
    sql.startsWith("INSERT INTO bet_results"),
  );
  assert.equal(insert.params[2], 25);
});

test("placeBet uses current games_no from betlogs regardless of payload games_no", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, games_no, number FROM betlogs")) {
      return [{ id: 1, games_no: "20261010010001", number: 2 }];
    }
    if (sql.startsWith("SELECT id, wallet, recharge FROM users")) {
      return [{ id: 8, wallet: 50, recharge: 35 }];
    }
    if (sql.startsWith("SELECT multiplier, actual_number FROM virtual_games")) {
      return [{ multiplier: 9, actual_number: 2 }];
    }
    return [];
  });
  const service = new WingoService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.placeBet({
    userid: 8,
    game_id: 1,
    number: "2",
    amount: 10,
    games_no: "20261010019999",
  });

  assert.deepEqual(result, { status: 200, message: "Bet Successfully Placed" });
  assert.equal(connection.committed, true);
  const betInsert = connection.calls.find(({ sql }) => sql.startsWith("INSERT INTO bets"));
  assert.equal(betInsert.params[4], "20261010010001");
});

test("getWinAmount queries bets table with games_no, game_id, and userid", async () => {
  let executedSql = "";
  let executedParams = [];
  const pool = {
    async execute(sql, params) {
      executedSql = sql;
      executedParams = params;
      return [[{
        total_amount: 19.6,
        games_no: "20261010010001",
        gameid: 1,
        number: 2,
        result: "win",
      }], []];
    },
  };

  const service = new WingoService(() => pool);
  const result = await service.getWinAmount({
    userid: 10,
    game_id: 1,
    games_no: "20261010010001",
  });

  assert.deepEqual(result, {
    total_amount: 19.6,
    games_no: "20261010010001",
    gameid: 1,
    number: 2,
    result: "win",
  });
  assert.deepEqual(executedParams, ["20261010010001", 1, 10]);
});
