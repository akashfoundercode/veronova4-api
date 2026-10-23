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
