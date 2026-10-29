"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { API_ROUTES } = require("../src/config/apiRoutes");
const { createAviatorSocket } = require("../src/modules/aviator/aviator.socket");

function createSocketHarness() {
  const handlers = new Map();
  const emissions = [];
  const scheduled = [];
  const cleared = [];
  const namespace = {
    on(event, handler) {
      handlers.set(event, handler);
    },
    emit(event, payload) {
      emissions.push({ event, payload });
    },
  };

  return {
    handlers,
    emissions,
    scheduled,
    cleared,
    io: {
      of(namespacePath) {
        assert.equal(namespacePath, API_ROUTES.aviator.socketNamespace);
        return namespace;
      },
    },
    setTimeoutImpl(callback, delay) {
      const timer = { callback, delay };
      scheduled.push(timer);
      return timer;
    },
    clearTimeoutImpl(timer) {
      cleared.push(timer);
    },
  };
}

test("Aviator emits only on its own namespace and inserts a crash result once", async () => {
  const harness = createSocketHarness();
  const requests = [];
  const socket = createAviatorSocket(harness.io, {
    resultApiUrl: "https://results.example/Aviator/",
    random: () => 0.5,
    setTimeoutImpl: harness.setTimeoutImpl,
    clearTimeoutImpl: harness.clearTimeoutImpl,
    logger: { log() {}, error() {} },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return url.endsWith("result_half_new.php")
            ? { game_sr: "12345", adminmultiply: 1.01 }
            : { status: "success" };
        },
      };
    },
  });

  assert.equal(harness.handlers.has("connection"), true);
  assert.equal(harness.scheduled[0].delay, 0);

  await harness.scheduled[0].callback();
  assert.equal(harness.emissions[0].event, API_ROUTES.aviator.socketEvent);
  assert.deepEqual(JSON.parse(harness.emissions[0].payload), {
    betTime: 10,
    status: 0,
    period: "12345",
    timer: "1.00",
  });

  for (let i = 0; i < 9; i += 1) {
    const timer = harness.scheduled.at(-1);
    await timer.callback();
  }

  const crashPayload = JSON.parse(harness.emissions.at(-1).payload);
  assert.deepEqual(crashPayload, {
    betTime: 2,
    status: 2,
    period: "12345",
    timer: "1.01",
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, "https://results.example/Aviator/result_half_new.php");
  assert.equal(requests[1].url, "https://results.example/Aviator/result_insert_new.php");
  assert.equal(requests[1].options.method, "POST");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    adminmultiply: 1.01,
    game_sr: "12345",
  });

  socket.stop();
  assert.equal(harness.cleared.at(-1), harness.scheduled.at(-1));
});

test("Aviator sends the current state to new namespace clients", () => {
  const harness = createSocketHarness();
  createAviatorSocket(harness.io, {
    setTimeoutImpl: harness.setTimeoutImpl,
    clearTimeoutImpl: harness.clearTimeoutImpl,
    fetchImpl: async () => {
      throw new Error("Unexpected fetch");
    },
    logger: { log() {}, error() {} },
  });

  const clientEmissions = [];
  harness.handlers.get("connection")({
    emit(event, payload) {
      clientEmissions.push({ event, payload });
    },
  });
  assert.equal(harness.emissions.length, 0);
  assert.equal(clientEmissions[0].event, API_ROUTES.aviator.socketEvent);
  assert.deepEqual(JSON.parse(clientEmissions[0].payload), {
    betTime: 10,
    status: 0,
    period: 0,
    timer: "1.00",
  });
});

test("Aviator keeps emitting its state when the round-settings API fails", async () => {
  const harness = createSocketHarness();
  const errors = [];
  const socket = createAviatorSocket(harness.io, {
    setTimeoutImpl: harness.setTimeoutImpl,
    clearTimeoutImpl: harness.clearTimeoutImpl,
    fetchImpl: async () => {
      throw new Error("provider unavailable");
    },
    logger: {
      log() {},
      error(...args) {
        errors.push(args);
      },
    },
  });

  await harness.scheduled[0].callback();

  assert.equal(errors.length, 1);
  assert.equal(harness.emissions.length, 1);
  assert.equal(harness.emissions[0].event, API_ROUTES.aviator.socketEvent);
  assert.deepEqual(JSON.parse(harness.emissions[0].payload), {
    betTime: 10,
    status: 0,
    period: 0,
    timer: "1.00",
  });
  assert.equal(harness.scheduled.at(-1).delay, 1000);

  socket.stop();
});

test("Aviator retries a failed crash-result insert before advancing the round", async () => {
  const harness = createSocketHarness();
  let insertAttempts = 0;
  const errors = [];
  const socket = createAviatorSocket(harness.io, {
    resultApiUrl: "https://results.example/Aviator/",
    setTimeoutImpl: harness.setTimeoutImpl,
    clearTimeoutImpl: harness.clearTimeoutImpl,
    logger: {
      log() {},
      error(...args) {
        errors.push(args);
      },
    },
    fetchImpl: async (url) => {
      if (url.endsWith("result_half_new.php")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { game_sr: "12345", adminmultiply: 1.01 };
          },
        };
      }

      insertAttempts += 1;
      if (insertAttempts === 1) {
        throw new Error("temporary provider failure");
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { status: "success" };
        },
      };
    },
  });

  await harness.scheduled[0].callback();
  for (let i = 0; i < 9; i += 1) {
    await harness.scheduled.at(-1).callback();
  }

  assert.equal(insertAttempts, 1);
  assert.equal(errors.length, 1);
  await harness.scheduled.at(-1).callback();
  assert.equal(insertAttempts, 2);
  assert.deepEqual(JSON.parse(harness.emissions.at(-1).payload), {
    betTime: 2,
    status: 2,
    period: "12345",
    timer: "1.01",
  });

  socket.stop();
});

test("Aviator triggers force drop when aviator_drop_now socket event is received", async () => {
  const harness = createSocketHarness();
  const socket = createAviatorSocket(harness.io, {
    resultApiUrl: "https://results.example/Aviator/",
    random: () => 0.99, // High random multiplier (e.g. up to 99) so it wouldn't crash immediately
    setTimeoutImpl: harness.setTimeoutImpl,
    clearTimeoutImpl: harness.clearTimeoutImpl,
    logger: { log() {}, error() {} },
    fetchImpl: async (url) => {
      return {
        ok: true,
        status: 200,
        async json() {
          return url.endsWith("result_half_new.php")
            ? { game_sr: "88888", adminmultiply: 50.0 }
            : { status: "success" };
        },
      };
    },
  });

  // Advance through betting countdown to start flying
  await harness.scheduled[0].callback();
  for (let i = 0; i < 9; i += 1) {
    await harness.scheduled.at(-1).callback();
  }

  // Now in flying phase (status: 1)
  const flyingPayload = JSON.parse(harness.emissions.at(-1).payload);
  assert.equal(flyingPayload.status, 1);

  // Connect client and send aviator_drop_now
  let dropHandler;
  harness.handlers.get("connection")({
    emit() {},
    on(event, handler) {
      if (event === "aviator_drop_now") dropHandler = handler;
    },
  });
  assert.ok(typeof dropHandler === "function", "aviator_drop_now handler must be registered");

  // Trigger drop
  dropHandler();

  // Next tick must crash immediately due to forceCrash
  await harness.scheduled.at(-1).callback();
  const crashedPayload = JSON.parse(harness.emissions.at(-1).payload);
  assert.equal(crashedPayload.status, 2);
  assert.equal(crashedPayload.betTime, 2);
  assert.equal(crashedPayload.period, "88888");

  socket.stop();
});

test("Aviator allows dynamic live game API URL updates", () => {
  const harness = createSocketHarness();
  const socket = createAviatorSocket(harness.io, {
    resultApiUrl: "https://root.veronova.co.in/Aviator/",
    setTimeoutImpl: harness.setTimeoutImpl,
    clearTimeoutImpl: harness.clearTimeoutImpl,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }),
    logger: { log() {}, error() {} },
  });

  assert.equal(socket.getResultApiUrl(), "https://root.veronova.co.in/Aviator/");
  socket.setResultApiUrl("https://newgame.example.com/api/aviator");
  assert.equal(socket.getResultApiUrl(), "https://newgame.example.com/api/aviator/");

  socket.stop();
});

test("Aviator legacy PHP routes respond correctly on all path aliases", async () => {
  const app = require("../src/app");
  const { EventEmitter } = require("node:events");

  function mockRequest(appInstance, { method, url, body = {}, query = {} }) {
    return new Promise((resolve) => {
      const req = new EventEmitter();
      req.method = method;
      req.url = url;
      req.headers = { host: "127.0.0.1", "content-type": "application/json" };
      req.query = query;
      req.body = body;

      const res = new EventEmitter();
      res.statusCode = 200;
      res.headers = {};
      res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
      res.getHeader = (k) => res.headers[k.toLowerCase()];
      res.status = (code) => { res.statusCode = code; return res; };
      let responseBody = "";
      res.send = (chunk) => {
        responseBody = chunk;
        resolve({ statusCode: res.statusCode, body: responseBody });
      };
      res.json = (data) => {
        resolve({ statusCode: res.statusCode, body: data });
      };
      res.end = (chunk) => {
        if (chunk) responseBody = chunk;
        resolve({ statusCode: res.statusCode, body: responseBody });
      };

      appInstance.handle(req, res);
    });
  }

  // 1. GET /Aviator/result_half_new.php
  const res1 = await mockRequest(app, { method: "GET", url: "/Aviator/result_half_new.php" });
  assert.ok(res1.statusCode === 200 || res1.statusCode === 500, "Must route to roundSettings controller");

  // 2. GET /result_half_new.php
  const res2 = await mockRequest(app, { method: "GET", url: "/result_half_new.php" });
  assert.ok(res2.statusCode === 200 || res2.statusCode === 500, "Must route to roundSettings controller");

  // 3. GET /aviator/result_half_new.php
  const res3 = await mockRequest(app, { method: "GET", url: "/aviator/result_half_new.php" });
  assert.ok(res3.statusCode === 200 || res3.statusCode === 500, "Must route to roundSettings controller");

  // 4. POST /Aviator/result_insert_new.php (without params should return 400 validation, proving route reached)
  const res4 = await mockRequest(app, { method: "POST", url: "/Aviator/result_insert_new.php", body: {} });
  assert.equal(res4.statusCode, 400, "Must hit insertResult controller and validate game_sr");

  // 5. POST /result_insert_new.php
  const res5 = await mockRequest(app, { method: "POST", url: "/result_insert_new.php", body: {} });
  assert.equal(res5.statusCode, 400, "Must hit insertResult controller and validate game_sr");

  // 6. POST /aviator/result_insert_new.php
  const res6 = await mockRequest(app, { method: "POST", url: "/aviator/result_insert_new.php", body: {} });
  assert.equal(res6.statusCode, 400, "Must hit insertResult controller and validate game_sr");
});
