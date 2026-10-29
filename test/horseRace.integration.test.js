"use strict";

const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const app = require("../src/app");
const { API_ROUTES } = require("../src/config/apiRoutes");
const { isHorseDatabaseConfigured } = require("../src/modules/horseRace/config/database");
const { SocketService } = require("../src/modules/horseRace/services/socket.service");
const { raceEngine } = require("../src/modules/horseRace/services/raceEngine");

after(() => {
  raceEngine.stop();
});

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

test("horse-race uses the configured shared application database", () => {
  const databaseConfig = {
    host: "localhost",
    user: "api",
    name: "main",
    connectionLimit: 10,
  };

  assert.equal(isHorseDatabaseConfigured(databaseConfig), true);
  assert.equal(isHorseDatabaseConfigured({ ...databaseConfig, name: undefined }), false);
});

test("horse-race current snapshot is mounted under its isolated API prefix", async () => {
  const res = await testRoute("GET", "/api/horse-race/races/current");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("horse-race authentication routes retain their independent validation contract", async () => {
  const res = await testRoute("POST", "/api/horse-race/auth/register", {
    "content-type": "application/json",
  }, {});

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Username/);
});

test("horse-race bets require a horse-race bearer session", async () => {
  const res = await testRoute("POST", "/api/horse-race/bets", {
    "content-type": "application/json",
  }, {});

  assert.equal(res.statusCode, 401);
});

test("horse-race authenticates with JWT and custom tokens without throwing configuration errors", async () => {
  const jwt = require("jsonwebtoken");
  const token = jwt.sign({ userId: 123 }, "veronova_default_jwt_secret", { expiresIn: "1h" });
  const res = await testRoute("GET", "/api/races/my-bets", {
    authorization: `Bearer ${token}`,
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("horse-race root logout alias requires a horse-race bearer session", async () => {
  const res = await testRoute("POST", "/api/horse-race/logout");
  assert.equal(res.statusCode, 401);
});

test("horse-race standalone aliases match horse-race-api endpoints directly", async () => {
  // 1. Current race
  const curRes = await testRoute("GET", "/api/races/current");
  assert.equal(curRes.statusCode, 200);
  assert.equal(curRes.body.success, true);
  assert.ok(curRes.body.race);

  // 2. Horses list
  const horsesRes = await testRoute("GET", "/api/horses");
  assert.equal(horsesRes.statusCode, 200);
  assert.equal(horsesRes.body.success, true);
  assert.ok(Array.isArray(horsesRes.body.horses));
  assert.equal(horsesRes.body.horses.length, 12);

  // 3. Previous results
  const prevRes = await testRoute("GET", "/api/races/previous-results");
  assert.equal(prevRes.statusCode, 200);
  assert.equal(prevRes.body.success, true);

  // 4. Bet without auth
  const betRes = await testRoute("POST", "/api/races/bet", {
    "content-type": "application/json",
  }, {});
  assert.equal(betRes.statusCode, 401);

  // 5. Flexible race horses and results queries
  const horsesCurrent = await testRoute("GET", "/api/races/horses");
  assert.equal(horsesCurrent.statusCode, 200);
  assert.equal(horsesCurrent.body.success, true);
  assert.ok(Array.isArray(horsesCurrent.body.horses));

  const horsesWithCurrentParam = await testRoute("GET", "/api/races/current/horses");
  assert.equal(horsesWithCurrentParam.statusCode, 200);
  assert.equal(horsesWithCurrentParam.body.success, true);

  const horsesWithQuery = await testRoute("GET", "/api/races/horses?race_id=459");
  assert.equal(horsesWithQuery.statusCode, 200);
  assert.equal(horsesWithQuery.body.success, true);

  const raceHorsesAlias = await testRoute("GET", "/api/race_horses");
  assert.equal(raceHorsesAlias.statusCode, 200);
  assert.equal(raceHorsesAlias.body.success, true);

  const resultCurrent = await testRoute("GET", "/api/races/current/result");
  assert.equal(resultCurrent.statusCode, 200);
  assert.equal(resultCurrent.body.success, true);

  const resultByParam = await testRoute("GET", `/api/races/${curRes.body.race.id}/result`);
  assert.equal(resultByParam.statusCode, 200);
  assert.equal(resultByParam.body.success, true);
  assert.ok(resultByParam.body.result);
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
