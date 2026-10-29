"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const app = require("../src/app");

function testRoute(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resBody = null;
    const req = {
      method,
      url,
      headers: { host: "api.wingo4all.site", ...headers },
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

test("GET /public/api/bet_values returns 200 OK and valid bet options", async () => {
  const res = await testRoute("GET", "/public/api/bet_values");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "data fetch success");
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length > 0);
  assert.equal(res.body.data[0].value, 10);
});

test("GET /api/bet_values and GET /bet_values also return 200 OK", async () => {
  const resApi = await testRoute("GET", "/api/bet_values");
  assert.equal(resApi.statusCode, 200);
  assert.equal(resApi.body.success, true);

  const resRoot = await testRoute("GET", "/bet_values");
  assert.equal(resRoot.statusCode, 200);
  assert.equal(resRoot.body.success, true);
});

test("GET /public/api/multiplier returns 200 OK with multiplier difficulty groups", async () => {
  const res = await testRoute("GET", "/public/api/multiplier");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.equal(res.body.data.length, 4);
});

test("POST /public/api/bet and POST /public/api/cashout require authentication", async () => {
  const resBet = await testRoute("POST", "/public/api/bet");
  assert.equal(resBet.statusCode, 401);

  const resCashout = await testRoute("POST", "/public/api/cashout");
  assert.equal(resCashout.statusCode, 401);
});

test("GET /bet, GET /betHistory, and GET /admin/chicken/history return 200 OK with admin bet history", async () => {
  const resBet = await testRoute("GET", "/bet");
  assert.equal(resBet.statusCode, 200);
  assert.equal(resBet.body.status, 200);
  assert.ok(Array.isArray(resBet.body.data));
  assert.ok(resBet.body.summary !== undefined);

  const resApiBet = await testRoute("GET", "/api/bet");
  assert.equal(resApiBet.statusCode, 200);
  assert.equal(resApiBet.body.status, 200);

  const resAdmin = await testRoute("GET", "/admin/chicken/history");
  assert.equal(resAdmin.statusCode, 200);
  assert.equal(resAdmin.body.status, 200);

  const resAdminBets = await testRoute("GET", "/admin/chicken/bets");
  assert.equal(resAdminBets.statusCode, 200);
  assert.equal(resAdminBets.body.status, 200);

  const resBetHistory = await testRoute("GET", "/betHistory");
  assert.equal(resBetHistory.statusCode, 200);
  assert.equal(resBetHistory.body.status, 200);
});

test("GET /api/history without user_id serves chicken bet history", async () => {
  const res = await testRoute("GET", "/api/history");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 200);
  assert.ok(Array.isArray(res.body.data));
});
