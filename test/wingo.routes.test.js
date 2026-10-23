"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../src/app");
const { API_ROUTES, apiUrl } = require("../src/config/apiRoutes");

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

test("the original POST /api/bets URL requires the logged-in user's bearer token", async () => {
  const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.games.bet)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userid: 10,
      game_id: 1,
      number: 2,
      amount: 0,
    }),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    message: "Unauthenticated.",
  });
});

test("the original POST /api/login URL preserves required field validation", async () => {
  const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.auth.login)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: "player@example.test" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: "The password must be at least 6 characters.",
    status: "400",
  });
});

test("the original POST /api/register URL validates before touching the database", async () => {
  const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.auth.register)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mobile: "1234567890" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 400,
    message: "The country_code field is required.",
  });
});

test("the original POST /api/bets URL handles a missing body as a validation error", async () => {
  const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.games.bet)}`, {
    method: "POST",
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    message: "Unauthenticated.",
  });
});

test("the existing /api/v1 health endpoint remains available", async () => {
  const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.health, true)}`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { status: "ok" } });
});
