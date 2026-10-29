"use strict";

const { API_ROUTES } = require("../../config/apiRoutes");
const config = require("../../config");
const { WingoService } = require("./wingo.service");

const defaultWingoService = new WingoService();
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
  const pendingGameIds = [];

  function emitTimerData(target = socket) {
    const payload = JSON.stringify(state);
    target.emit(API_ROUTES.wingo.socketEvent, payload);
    try {
      io.emit(API_ROUTES.wingo.socketEvent, payload);
      io.emit("wingo_timer", payload);
    } catch (_) {}
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
      // Fallback: If HTTP request fails or server is local/sandboxed,
      // directly settle the round in-process so round resets and round number increments!
      try {
        logger.log(`[WingoSocket] Triggering in-process settleRound fallback for Game ${gameId}...`);
        const result = await defaultWingoService.settleRound(gameId);
        logger.log(`[WingoSocket] Direct settleRound success for Game ${gameId}: Period ${result.gameNo} -> Result ${result.resultNumber}`);
        const payload = {
          game_id: gameId,
          games_no: result.gameNo,
          win_number: result.resultNumber,
        };
        socket.emit("wingo:round_settled", payload);
        try {
          io.emit("wingo:round_settled", payload);
          io.emit("verenova_wingo_result", payload);
        } catch (_) {}
      } catch (fallbackErr) {
        logger.error(`[WingoSocket] Direct settleRound fallback failed for Game ${gameId}:`, fallbackErr.message);
      }
    }
  }

  async function drainPendingGameIds() {
    if (isApiCalling || pendingGameIds.length === 0) return;
    isApiCalling = true;
    try {
      while (pendingGameIds.length > 0) {
        await fetchApi(pendingGameIds.shift());
      }
    } finally {
      isApiCalling = false;
    }
  }

  async function fetchTimerData() {
    if (stopped || isTickRunning) return;
    isTickRunning = true;
    try {
      const dueGameIds = [];
      if (state.timerBetTime === 0) {
        dueGameIds.push(1);
        state.timerBetTime = 30;
      } else {
        state.timerBetTime -= 1;
      }

      if (state.oneMinTimer === 0) {
        dueGameIds.push(2);
        state.oneMinTimer = 60;
      } else {
        state.oneMinTimer -= 1;
      }

      if (state.threeMinTimer === 0) {
        dueGameIds.push(3);
        state.threeMinTimer = 180;
      } else {
        state.threeMinTimer -= 1;
      }

      if (state.fiveMinTimer === 0) {
        dueGameIds.push(4);
        state.fiveMinTimer = 300;
      } else {
        state.fiveMinTimer -= 1;
      }

      if (state.tenMinTimer === 0) {
        dueGameIds.push(10);
        state.tenMinTimer = 600;
      } else {
        state.tenMinTimer -= 1;
      }

      emitTimerData();

      // Do not hold up timer ticks while a round settlement API is responding.
      // Calls remain serialized so simultaneous boundaries cannot overlap.
      pendingGameIds.push(...dueGameIds);
      if (pendingGameIds.length > 0 && !isApiCalling) {
        void drainPendingGameIds();
      }
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
