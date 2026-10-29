"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { API_ROUTES } = require("../src/config/apiRoutes");
const { createWingoSocket } = require("../src/modules/wingo/wingo.socket");

function createSocketHarness() {
  const handlers = new Map();
  const emissions = [];
  let intervalCallback;
  let intervalDelay;
  let clearedInterval;
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
    io: {
      of(namespacePath) {
        assert.equal(namespacePath, API_ROUTES.wingo.socketNamespace);
        return namespace;
      },
    },
    get intervalCallback() {
      return intervalCallback;
    },
    get intervalDelay() {
      return intervalDelay;
    },
    get clearedInterval() {
      return clearedInterval;
    },
    setIntervalImpl(callback, delay) {
      intervalCallback = callback;
      intervalDelay = delay;
      return "wingo-timer";
    },
    clearIntervalImpl(timer) {
      clearedInterval = timer;
    },
  };
}

test("Wingo socket emits the five legacy timers in its own namespace", async () => {
  const harness = createSocketHarness();
  const requests = [];
  const wingoSocket = createWingoSocket(harness.io, {
    timerApiUrl: "https://results.example/api/crone/",
    setIntervalImpl: harness.setIntervalImpl,
    clearIntervalImpl: harness.clearIntervalImpl,
    logger: { log() {}, error() {} },
    fetchImpl: async (url) => {
      requests.push(url);
      return { ok: true, status: 200 };
    },
  });

  assert.equal(harness.intervalDelay, 1000);
  assert.equal(harness.handlers.has("connection"), true);
  const clientEmissions = [];
  harness.handlers.get("connection")({
    emit(event, payload) {
      clientEmissions.push({ event, payload });
    },
  });
  assert.equal(clientEmissions[0].event, API_ROUTES.wingo.socketEvent);
  assert.deepEqual(JSON.parse(clientEmissions[0].payload), {
    timerBetTime: 30,
    oneMinTimer: 60,
    threeMinTimer: 180,
    fiveMinTimer: 300,
    tenMinTimer: 600,
    timerStatus: 1,
  });

  for (let i = 0; i < 30; i += 1) {
    await harness.intervalCallback();
  }
  assert.equal(requests.length, 0);
  await harness.intervalCallback();

  assert.deepEqual(requests, ["https://results.example/api/crone/1"]);
  assert.equal(harness.emissions.at(-1).event, API_ROUTES.wingo.socketEvent);
  assert.deepEqual(JSON.parse(harness.emissions.at(-1).payload), {
    timerBetTime: 30,
    oneMinTimer: 29,
    threeMinTimer: 149,
    fiveMinTimer: 269,
    tenMinTimer: 569,
    timerStatus: 1,
  });

  wingoSocket.stop();
  assert.equal(harness.clearedInterval, "wingo-timer");
  await harness.intervalCallback();
  assert.equal(requests.length, 1);
});

test("Wingo socket triggers direct in-process settleRound and emits round_settled when timer ends", async () => {
  const harness = createSocketHarness();
  const settledGames = [];
  const mockService = {
    async settleRound(gameId) {
      settledGames.push(gameId);
      return {
        gameId,
        gameNo: "20250822213539",
        resultNumber: 7,
      };
    },
  };

  const wingoSocket = createWingoSocket(harness.io, {
    service: mockService,
    timerApiUrl: "",
    setIntervalImpl: harness.setIntervalImpl,
    clearIntervalImpl: harness.clearIntervalImpl,
    logger: { log() {}, error() {} },
  });

  // Advance 30 seconds
  for (let i = 0; i < 30; i += 1) {
    await harness.intervalCallback();
  }
  assert.equal(settledGames.length, 0);

  // 31st tick: timerBetTime reaches 0 -> settles Game 1
  await harness.intervalCallback();
  assert.deepEqual(settledGames, [1]);

  const settledEmission = harness.emissions.find(({ event }) => event === "wingo:round_settled");
  assert.ok(settledEmission);
  assert.deepEqual(settledEmission.payload, {
    game_id: 1,
    games_no: "20250822213539",
    win_number: 7,
  });

  wingoSocket.stop();
});
