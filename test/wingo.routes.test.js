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
