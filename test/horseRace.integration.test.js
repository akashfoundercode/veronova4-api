"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../src/app");
const { API_ROUTES } = require("../src/config/apiRoutes");
const { isHorseDatabaseConfigured } = require("../src/modules/horseRace/config/database");
const { SocketService } = require("../src/modules/horseRace/services/socket.service");

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

test("horse-race database requires a configured schema separate from the main schema", () => {
  const databaseConfig = {
    host: "localhost",
    user: "api",
    name: "main",
    connectionLimit: 10,
  };

  assert.equal(isHorseDatabaseConfigured(databaseConfig, { database: undefined }), false);
  assert.equal(isHorseDatabaseConfigured(databaseConfig, { database: "main" }), false);
  assert.equal(isHorseDatabaseConfigured(databaseConfig, { database: "horse_race" }), true);
});

test("horse-race current snapshot is mounted under its isolated API prefix", async () => {
  const response = await fetch(`${baseUrl}/api/horse-race/races/current`);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
});

test("horse-race authentication routes retain their independent validation contract", async () => {
  const response = await fetch(`${baseUrl}/api/horse-race/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Username/);
});

test("horse-race bets require a horse-race bearer session", async () => {
  const response = await fetch(`${baseUrl}/api/horse-race/bets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 401);
});

test("horse-race root logout alias requires a horse-race bearer session", async () => {
  const response = await fetch(`${baseUrl}/api/horse-race/logout`, {
    method: "POST",
  });

  assert.equal(response.status, 401);
});

test("existing shared game bet API keeps its existing route and auth response", async () => {
  const response = await fetch(`${baseUrl}/api/bets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "Unauthenticated." });
});

test("horse-race sockets attach only a namespace to the already-created Socket.IO server", () => {
  const namespace = {
    on() {},
    to() {
      return { emit() {} };
    },
  };
  const calls = [];
  const sharedIo = {
    of(name) {
      calls.push(name);
      return namespace;
    },
  };
  const service = new SocketService();

  assert.equal(service.initialize(sharedIo), namespace);
  assert.deepEqual(calls, [API_ROUTES.horseRace.socketNamespace]);
  service.stop();
});
