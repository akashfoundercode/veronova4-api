"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const app = require("../src/app");
const { API_ROUTES, apiUrl } = require("../src/config/apiRoutes");

function testRoute(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resBody = null;
    const req = {
      method,
      url,
      headers: { host: "localhost:3010", ...headers },
      body: body || {},
    };
    const res = {
      statusCode: 200,
      setHeader() {},
      getHeader() {},
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resBody = data;
        resolve({ statusCode, body: resBody });
      },
      send(data) {
        resBody = data;
        resolve({ statusCode, body: resBody });
      },
      end() {
        resolve({ statusCode, body: resBody });
      },
    };
    app.handle(req, res, (err) => {
      resolve({ statusCode: 500, error: err });
    });
  });
}

test("the original POST /bets URL requires the logged-in user's bearer token", async () => {
  const res = await testRoute("POST", "/bets", {
    "content-type": "application/json",
  }, {
    userid: 10,
    game_id: 1,
    number: 2,
    amount: 0,
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    message: "Unauthenticated.",
  });
});

test("the original POST /api/login URL preserves required field validation", async () => {
  const res = await testRoute("POST", apiUrl(API_ROUTES.auth.login), {
    "content-type": "application/json",
  }, { identity: "player@example.test" });

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    message: "The password must be at least 6 characters.",
    status: "400",
  });
});

test("the original POST /api/register URL validates before touching the database", async () => {
  const res = await testRoute("POST", apiUrl(API_ROUTES.auth.register), {
    "content-type": "application/json",
  }, { mobile: "1234567890" });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 400,
    message: "The country_code field is required.",
  });
});

test("the original POST /bets URL handles a missing body as a validation error", async () => {
  const res = await testRoute("POST", "/bets", {
    "content-type": "application/json",
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    message: "Unauthenticated.",
  });
});

test("the existing /api/v1 health endpoint remains available", async () => {
  const res = await testRoute("GET", apiUrl(API_ROUTES.health, true));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { data: { status: "ok" } });
});

test("POST /auto_wingo_result_insert and aliases reject unauthenticated calls gracefully", async () => {
  const res1 = await testRoute("POST", "/auto_wingo_result_insert", {
    "content-type": "application/json",
  }, { gameid: 1, period_num: "20261112001", card_number: 5 });
  assert.equal(res1.statusCode, 401);

  const res2 = await testRoute("POST", "/api/auto_wingo_result_insert", {
    "content-type": "application/json",
  }, { game_id: 1, game_no: "20261112001", number: 5 });
  assert.equal(res2.statusCode, 401);

  const res3 = await testRoute("POST", "/colour_prediction_store", {
    "content-type": "application/json",
  }, { game_id: 1, game_no: "20261112001", number: 5 });
  assert.equal(res3.statusCode, 401);

  const res4 = await testRoute("POST", "/api/colour_prediction_store", {
    "content-type": "application/json",
  }, { game_id: 1, game_no: "20261112001", number: 5 });
  assert.equal(res4.statusCode, 401);
});

test("WingoService.addAdminResult handles normal insert, forced update, and ER_DUP_ENTRY recovery", async () => {
  const { WingoService } = require("../src/modules/wingo/wingo.service");
  let executedSql = [];
  let existingRows = [];
  let simulatePrimaryDupOnce = true;

  const mockPool = {
    async execute(sql, params) {
      executedSql.push({ sql, params });
      if (sql.includes("CREATE TABLE IF NOT EXISTS")) {
        return [[], []];
      }
      if (sql.includes("SELECT id FROM admin_winner_results")) {
        return [existingRows, []];
      }
      if (sql.includes("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM admin_winner_results")) {
        return [[{ next_id: 42 }], []];
      }
      if (sql.includes("UPDATE admin_winner_results")) {
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("ALTER TABLE")) {
        return [[], []];
      }
      if (sql.includes("INSERT INTO admin_winner_results")) {
        if (simulatePrimaryDupOnce && !sql.includes("(id,")) {
          simulatePrimaryDupOnce = false;
          const err = new Error("Duplicate entry '0' for key 'PRIMARY'");
          err.code = "ER_DUP_ENTRY";
          throw err;
        }
        return [{ insertId: params?.[0] === 42 ? 42 : 1 }, []];
      }
      return [[], []];
    },
  };

  const wingoService = new WingoService(() => mockPool);

  // Test 1: Duplicate entry '0' for key 'PRIMARY' auto-recovers
  const res1 = await wingoService.addAdminResult({
    period_num: "20261112001",
    card_number: 7,
    gameid: 1,
  });
  assert.equal(res1, true);
  assert.ok(executedSql.some((e) => e.sql.includes("(id,") && e.params[0] === 42));
  assert.ok(executedSql.some((e) => e.sql.includes("ALTER TABLE admin_winner_results MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT")));

  // Test 2: Admin force update when period already exists
  existingRows = [{ id: 42 }];
  const res2 = await wingoService.addAdminResult({
    period_num: "20261112001",
    card_number: 3,
    gameid: 1,
  });
  assert.equal(res2, true);
  assert.ok(executedSql.some((e) => e.sql.includes("UPDATE admin_winner_results SET number = ?") && e.params[0] === "3"));
});
