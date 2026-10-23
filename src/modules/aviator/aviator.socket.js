"use strict";

const { API_ROUTES } = require("../../config/apiRoutes");
const config = require("../../config");

const INITIAL_BET_TIME = 10;
const ROUND_PAUSE_MS = 3000;
const REQUEST_TIMEOUT_MS = 10000;

function multiplierStep(multiplier) {
  if (multiplier > 50) return 0.08;
  if (multiplier > 30) return 0.06;
  if (multiplier > 20) return 0.05;
  if (multiplier > 10) return 0.04;
  if (multiplier > 5) return 0.03;
  if (multiplier > 2) return 0.02;
  return 0.01;
}

function createAviatorSocket(io, {
  fetchImpl = globalThis.fetch,
  resultApiUrl = config.aviator.resultApiUrl,
  random = Math.random,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
  logger = console,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("Aviator socket requires a fetch implementation.");
  }

  const socket = io.of(API_ROUTES.aviator.socketNamespace);
  const state = {
    betTime: INITIAL_BET_TIME,
    multiplier: 1,
    status: 0,
    period: 0,
    adminMultiplier: 0,
    crashMultiplier: 0,
    userCount: 0,
    highestAmount: 0,
    adminPercent: 0,
    totalAmount: 0,
    minAmount: 0,
    lossPercent: 0,
    currentTotalWin: 0,
    phase: "betting",
    timeout: undefined,
    stopped: false,
  };
  let roundResultInserted = false;

  function emitState(target = socket) {
    const payload = {
      betTime: state.betTime,
      status: state.status,
      period: state.period,
      timer: state.multiplier.toFixed(2),
    };
    target.emit(API_ROUTES.aviator.socketEvent, JSON.stringify(payload, null, 2));
  }

  async function requestJson(url, options) {
    const response = await fetchImpl(url, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Aviator API returned HTTP ${response.status}.`);
    }
    return response.json();
  }

  async function loadRoundSettings() {
    const result = await requestJson(`${resultApiUrl}result_half_new.php`);
    if (!result || typeof result !== "object") {
      throw new Error("Aviator API returned an invalid round response.");
    }

    const period = Number(result.game_sr);
    if (Number.isFinite(period) && period > 0) state.period = result.game_sr;
    state.userCount = result.totalusers ?? 0;
    state.highestAmount = result.highestamount ?? 0;
    state.adminMultiplier = Number(result.adminmultiply) > 0 ? Number(result.adminmultiply) : 0;
    state.adminPercent = result.adminpercent ?? 0;
    state.totalAmount = result.totalamount ?? 0;
    state.minAmount = result.min_amount ?? 0;
    state.lossPercent = result.loss_per ?? 0;
    state.currentTotalWin = result.total_win ?? 0;
  }

  async function insertRoundResult() {
    const response = await requestJson(`${resultApiUrl}result_insert_new.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminmultiply: state.multiplier,
        game_sr: state.period,
      }),
    });

    logger.log("Aviator result insert response:", response);
  }

  async function tick() {
    if (state.stopped) return;

    try {
      if (state.phase === "betting") {
        if (state.betTime === INITIAL_BET_TIME) await loadRoundSettings();

        if (state.betTime > 1) {
          emitState();
          state.betTime -= 1;
          state.timeout = setTimeoutImpl(tick, 1000);
          return;
        }

        state.phase = "flying";
        state.status = 1;
        state.betTime = 1;
        state.multiplier = 1;
        state.crashMultiplier = state.adminMultiplier || Math.max(1, random() * 100);
        roundResultInserted = false;
      }

      if (state.phase === "flying") {
        state.multiplier += multiplierStep(state.multiplier);
        if (state.multiplier >= state.crashMultiplier) {
          state.phase = "crashed";
          state.status = 2;
          state.betTime = 2;
          await insertRoundResult();
          roundResultInserted = true;
          emitState();
          state.timeout = setTimeoutImpl(tick, ROUND_PAUSE_MS);
          return;
        }

        emitState();
        state.timeout = setTimeoutImpl(tick, 100);
        return;
      }

      if (state.phase === "crashed" && !roundResultInserted) {
        await insertRoundResult();
        roundResultInserted = true;
        emitState();
        state.timeout = setTimeoutImpl(tick, ROUND_PAUSE_MS);
        return;
      }

      emitState();
      state.phase = "betting";
      state.status = 0;
      state.betTime = INITIAL_BET_TIME;
      state.multiplier = 1;
      state.crashMultiplier = 0;
      state.timeout = setTimeoutImpl(tick, 1000);
    } catch (error) {
      logger.error("Aviator socket update failed:", error.message);
      emitState();
      state.timeout = setTimeoutImpl(tick, 1000);
    }
  }

  socket.on("connection", (client) => emitState(client));
  state.timeout = setTimeoutImpl(tick, 0);

  return {
    namespace: socket,
    stop() {
      state.stopped = true;
      if (state.timeout !== undefined) clearTimeoutImpl(state.timeout);
    },
  };
}

module.exports = { createAviatorSocket };
