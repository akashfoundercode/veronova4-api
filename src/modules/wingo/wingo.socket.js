"use strict";

const { API_ROUTES } = require("../../config/apiRoutes");
const config = require("../../config");

const TIMER_INTERVAL_MS = 1000;
const REQUEST_TIMEOUT_MS = 10000;

function createWingoSocket(io, {
  fetchImpl = globalThis.fetch,
  timerApiUrl = config.wingo.timerApiUrl,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
  logger = console,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("Wingo socket requires a fetch implementation.");
  }

  const socket = io.of(API_ROUTES.wingo.socketNamespace);
  const state = {
    timerBetTime: 30,
    oneMinTimer: 60,
    threeMinTimer: 180,
    fiveMinTimer: 300,
    tenMinTimer: 600,
    timerStatus: 1,
  };
  let isApiCalling = false;
  let isTickRunning = false;
  let stopped = false;

  function emitTimerData(target = socket) {
    target.emit(API_ROUTES.wingo.socketEvent, JSON.stringify(state));
  }

  async function fetchApi(gameId) {
    const url = `${timerApiUrl}${gameId}`;
    try {
      logger.log(`Calling Wingo API: ${url}`);
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`Wingo API returned HTTP ${response.status}.`);
      }
      logger.log(`Wingo API called successfully: ${url}`);
    } catch (error) {
      logger.error(`Error fetching ${url}:`, error.message);
    }
  }

  async function fetchTimerData() {
    if (stopped || isTickRunning) return;
    isTickRunning = true;
    try {
      if (state.timerBetTime === 0) {
        if (!isApiCalling) {
          isApiCalling = true;
          try {
            await fetchApi(1);
          } finally {
            isApiCalling = false;
          }
        }
        state.timerBetTime = 30;
      } else {
        state.timerBetTime -= 1;
      }

      if (state.oneMinTimer === 0) {
        if (!isApiCalling) {
          isApiCalling = true;
          try {
            await fetchApi(2);
          } finally {
            isApiCalling = false;
          }
        }
        state.oneMinTimer = 60;
      } else {
        state.oneMinTimer -= 1;
      }

      if (state.threeMinTimer === 0) {
        if (!isApiCalling) {
          isApiCalling = true;
          try {
            await fetchApi(3);
          } finally {
            isApiCalling = false;
          }
        }
        state.threeMinTimer = 180;
      } else {
        state.threeMinTimer -= 1;
      }

      if (state.fiveMinTimer === 0) {
        if (!isApiCalling) {
          isApiCalling = true;
          try {
            await fetchApi(4);
          } finally {
            isApiCalling = false;
          }
        }
        state.fiveMinTimer = 300;
      } else {
        state.fiveMinTimer -= 1;
      }

      if (state.tenMinTimer === 0) {
        state.tenMinTimer = 600;
      } else {
        state.tenMinTimer -= 1;
      }

      emitTimerData();
    } catch (error) {
      logger.error("Error updating Wingo timers:", error.message);
    } finally {
      isTickRunning = false;
    }
  }

  socket.on("connection", (client) => {
    emitTimerData(client);
  });

  const timer = setIntervalImpl(fetchTimerData, TIMER_INTERVAL_MS);

  return {
    namespace: socket,
    stop() {
      stopped = true;
      clearIntervalImpl(timer);
    },
  };
}

module.exports = { createWingoSocket };
