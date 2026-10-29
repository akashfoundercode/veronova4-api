"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../src/app");
const { API_ROUTES, apiUrl } = require("../src/config/apiRoutes");
const { AviatorService } = require("../src/modules/aviator/aviator.service");
const { decodeCashout } = require("../src/modules/aviator/aviator.controller");

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

test("Aviator bet deducts wallet and recharge atomically and writes legacy bet fields", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, wallet, winning_wallet, recharge, status FROM users")) {
      return [{ id: 9, wallet: 100, winning_wallet: 20, recharge: 15, status: 1 }];
    }
    if (sql.startsWith("SELECT id FROM aviator_bet")) return [];
    if (sql.startsWith("SELECT `longtext` FROM admin_settings")) return [{ longtext: "0.02" }];
    if (sql.startsWith("INSERT INTO aviator_bet")) return { insertId: 8 };
    if (sql.startsWith("UPDATE users")) return { affectedRows: 1 };
    return [];
  });
  const service = new AviatorService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.placeBet({
    uid: 9,
    amount: 10,
    number: 1,
    game_id: 5,
    game_sr_num: "12345",
  });

  assert.deepEqual(result, { status: 200, message: "Bet placed successfully." });
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  assert.equal(connection.released, true);
  const walletUpdate = connection.calls.find(({ sql }) => sql.startsWith("UPDATE users"));
  assert.deepEqual(walletUpdate.params, [10, 10, 10, 9]);
  const betInsert = connection.calls.find(({ sql }) => sql.startsWith("INSERT INTO aviator_bet"));
  assert.deepEqual(betInsert.params, [9, 10, 0, 5, 9.8, 1, "12345", 0.2]);
});

test("legacy Aviator bet mode debits winning wallet up to the bet amount", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, wallet, winning_wallet, recharge, status FROM users")) {
      return [{ id: 9, wallet: 100, winning_wallet: 3, recharge: 0, status: 1 }];
    }
    if (sql.startsWith("SELECT id FROM aviator_bet")) return [];
    if (sql.startsWith("SELECT `longtext` FROM admin_settings")) return [{ longtext: "0" }];
    return { affectedRows: 1, insertId: 9 };
  });
  const service = new AviatorService(() => ({
    getConnection: async () => connection,
  }));

  await service.placeBet({
    uid: 9,
    amount: 10,
    number: 2,
    game_id: 5,
    game_sr_num: "12346",
  }, { legacyWalletMode: true });

  const walletUpdate = connection.calls.find(({ sql }) => sql.startsWith("UPDATE users"));
  assert.deepEqual(walletUpdate.params, [10, 10, 3, 9]);
  assert.equal(connection.committed, true);
});

test("insufficient Aviator wallet balance rolls back without inserting a bet", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, wallet, winning_wallet, recharge, status FROM users")) {
      return [{ id: 9, wallet: 2, winning_wallet: 0, recharge: 0, status: 1 }];
    }
    return [];
  });
  const service = new AviatorService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.placeBet({
    uid: 9,
    amount: 10,
    number: 1,
    game_id: 5,
    game_sr_num: "12345",
  });

  assert.deepEqual(result, { status: 400, message: "Insufficient funds!" });
  assert.equal(connection.rolledBack, true);
  assert.equal(connection.committed, false);
  assert.equal(connection.calls.some(({ sql }) => sql.startsWith("INSERT INTO aviator_bet")), false);
});

test("Aviator cashout credits both wallet fields and writes history in one transaction", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, totalamount FROM aviator_bet")) {
      return [{ id: 5, totalamount: 9.8 }];
    }
    if (sql.startsWith("UPDATE aviator_bet")) return { affectedRows: 1 };
    if (sql.startsWith("UPDATE users")) return { affectedRows: 1 };
    if (sql.startsWith("INSERT INTO wallet_history")) return { insertId: 1 };
    return [];
  });
  const service = new AviatorService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.cashout({
    uid: 9,
    number: 1,
    multiplier: 2,
    game_sr_num: "12345",
  });

  assert.deepEqual(result, { message: "19.6 Rs. Cashout Successfully", status: 200 });
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  assert.ok(connection.calls.some(({ sql, params }) =>
    sql.startsWith("INSERT INTO wallet_history") && params[2] === 24));
});

test("Aviator cancellation deletes a pending bet and refunds wallet balances atomically", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, amount FROM aviator_bet")) return [{ id: 12, amount: 7 }];
    if (sql.startsWith("DELETE FROM aviator_bet")) return { affectedRows: 1 };
    if (sql.startsWith("UPDATE users")) return { affectedRows: 1 };
    return [];
  });
  const service = new AviatorService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.cancelBet({
    uid: 9,
    number: 1,
    game_sr_num: "12345",
  });

  assert.deepEqual(result, { message: "Bet Cancel Successfully", status: 200 });
  assert.equal(connection.committed, true);
  const walletUpdate = connection.calls.find(({ sql }) => sql.startsWith("UPDATE users"));
  assert.deepEqual(walletUpdate.params, [7, 7, 9]);
});

test("Aviator history uses bound filters and includes the legacy crash-point shape", async () => {
  let query;
  const service = new AviatorService(() => ({
    async execute(sql, params) {
      query = { sql: sql.replace(/\s+/g, " ").trim(), params };
      return [[{ id: 1, crash_point: 1.5 }], []];
    },
  }));

  const rows = await service.getHistory({
    uid: 9,
    game_id: 5,
    limit: 25,
    offset: 5,
    created_at: "2026-10-10",
  });

  assert.deepEqual(rows, [{ id: 1, crash_point: 1.5 }]);
  assert.match(query.sql, /aviator_result\.price AS crash_point/);
  assert.deepEqual(query.params, [9, 5, "2026-10-10", 5, 25]);
});

test("cashout accepts the existing base64 JSON request envelope", () => {
  const salt = Buffer.from(JSON.stringify({
    uid: 9,
    number: 1,
    multiplier: 1.5,
    game_sr_num: "12345",
  })).toString("base64");

  assert.deepEqual(decodeCashout(salt), {
    uid: 9,
    number: 1,
    multiplier: 1.5,
    game_sr_num: "12345",
  });
  assert.throws(() => decodeCashout("invalid"), /salt must contain valid base64-encoded JSON/);
});

test("cashout decodes user salt and handles query params or URL spaces", async () => {
  const userSalt = "eyJ1aWQiOiIxIiwibXVsdGlwbGllciI6IjUuMzUiLCJnYW1lX3NyX251bSI6IjEyMTYyMDIiLCJudW1iZXIiOjF9";
  const decoded = decodeCashout(userSalt);
  assert.deepEqual(decoded, {
    uid: 1,
    number: 1,
    multiplier: 5.35,
    game_sr_num: "1216202",
  });

  const { cashout, setService } = require("../src/modules/aviator/aviator.controller");
  let calledWith = null;
  setService({
    async cashout(payload) {
      calledWith = payload;
      return { status: 200, message: "Cashout Success" };
    },
  });

  // Verify req.query.salt works (e.g. GET or URL query parameter)
  let responseData = null;
  const mockRes = {
    status(code) {
      return {
        json(data) {
          responseData = { code, data };
          return responseData;
        },
      };
    },
  };

  await cashout({ method: "GET", query: { salt: userSalt }, body: {} }, mockRes);
  assert.equal(responseData?.code, 200);
  assert.deepEqual(calledWith, {
    uid: 1,
    number: 1,
    multiplier: 5.35,
    game_sr_num: "1216202",
  });

  // Reset service back to default
  setService(new AviatorService());
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

test("legacy Aviator bet and cancel URLs preserve their validation response shapes", async () => {
  const betResponse = await fetch(`${baseUrl}${apiUrl(API_ROUTES.aviator.bet)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(betResponse.status, 200);
  assert.deepEqual(await betResponse.json(), {
    status: 400,
    message: "The uid field is required.",
  });

  const cancelResponse = await fetch(
    `${baseUrl}${apiUrl(API_ROUTES.aviator.betCancel)}`,
  );
  assert.equal(cancelResponse.status, 200);
  assert.deepEqual(await cancelResponse.json(), {
    status: 400,
    message: "The userid field is required.",
  });
});
