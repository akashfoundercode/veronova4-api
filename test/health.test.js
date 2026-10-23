"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../src/app");
const errorHandler = require("../src/middleware/errorHandler");
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

test("health endpoint returns the standard success envelope", async () => {
  const response = await fetch(`${baseUrl}${apiUrl(API_ROUTES.health, true)}`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { status: "ok" } });
});

test("unknown endpoints return the standard error envelope", async () => {
  const response = await fetch(`${baseUrl}${apiUrl("/unknown", true)}`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: "ROUTE_NOT_FOUND", message: "Route not found" },
  });
});

test("an unconfigured database returns a safe, actionable setup message", () => {
  const error = new Error(
    "Database configuration is incomplete; set DB_HOST, DB_DATABASE, and DB_USERNAME",
  );

  assert.deepEqual(errorHandler.getPublicError(error), {
    statusCode: 500,
    code: "DATABASE_CONFIGURATION_ERROR",
    message:
      "Database is not configured. Copy .env.example to .env, set DB_HOST, DB_DATABASE, DB_USERNAME, and DB_PASSWORD, then restart the API.",
  });
});

test("database connection errors identify the setting to check without exposing credentials", () => {
  const error = Object.assign(new Error("sensitive driver details"), {
    code: "ER_ACCESS_DENIED_ERROR",
  });

  assert.deepEqual(errorHandler.getPublicError(error), {
    statusCode: 500,
    code: "DATABASE_CONFIGURATION_ERROR",
    message:
      "Database rejected the configured user. Check DB_USERNAME and DB_PASSWORD in .env.",
  });
});
