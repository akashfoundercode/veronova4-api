"use strict";

const { API_ROUTES } = require("../../config/apiRoutes");
const config = require("../../config");
const { AviatorService } = require("./aviator.service");

/**
 * ============================================================================
 * LIVE GAME API URL
 * ============================================================================
 * Live game ka URL change karne ke liye:
 * 1. .env file mein: AVIATOR_RESULT_API_URL=https://root.veronova.co.in/Aviator/
 * 2. Ya yahan DEFAULT_AVIATOR_API_URL ko change karein.
 */
const DEFAULT_AVIATOR_API_URL =
  process.env.AVIATOR_RESULT_API_URL ||
  config?.aviator?.resultApiUrl ||
  "https://root.veronova.co.in/Aviator/";

const INITIAL_BET_TIME = 10;
const ROUND_PAUSE_MS = 3000;
const REQUEST_TIMEOUT_MS = 10000;

function normalizeBaseUrl(url) {
  const base = url || DEFAULT_AVIATOR_API_URL;
  return base.endsWith("/") ? base : `${base}/`;
}

function multiplierStep(multiplier) {
  if (multiplier > 50) return 0.08;
  if (multiplier > 30) return 0.06;
  if (multiplier > 20) return 0.05;
  if (multiplier > 10) return 0.04;
  if (multiplier > 5) return 0.03;
  if (multiplier > 2) return 0.02;
  return 0.01;
}

function createAviatorSocket(winplay_socket, {
  fetchImpl = globalThis.fetch,
  resultApiUrl = DEFAULT_AVIATOR_API_URL,
  random = Math.random,
  resultStore = new AviatorService(),
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
  logger = console,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("Aviator socket requires a fetch implementation.");
  }

  let activeApiUrl = normalizeBaseUrl(resultApiUrl);

  // Namespace support (e.g. /aviator) as well as root socket
  const namespace = (winplay_socket && typeof winplay_socket.of === "function")
    ? winplay_socket.of(API_ROUTES.aviator.socketNamespace)
    : winplay_socket;

  let forceCrash = false;

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

  function emitToEmitter(emitter, jsonPayload) {
    if (!emitter || typeof emitter.emit !== "function") return;
    emitter.emit(API_ROUTES.aviator.socketEvent, jsonPayload);
    if (API_ROUTES.aviator.socketEvent !== "demobdg_aviator") {
      emitter.emit("demobdg_aviator", jsonPayload);
    }
  }

  function emitState(target) {
    const payload = {
      betTime: state.betTime,
      status: state.status,
      period: state.period,
      timer: state.multiplier.toFixed(2),
    };
    const jsonPayload = JSON.stringify(payload, null, 2);

    if (target) {
      emitToEmitter(target, jsonPayload);
      return;
    }

    if (namespace) {
      emitToEmitter(namespace, jsonPayload);
    }
    if (winplay_socket && winplay_socket !== namespace) {
      emitToEmitter(winplay_socket, jsonPayload);
    }
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
    let result;
    if (resultStore && typeof resultStore.getNextRoundSettings === "function") {
      try {
        result = await resultStore.getNextRoundSettings();
      } catch {
        result = null;
      }
    }
    if (!result && activeApiUrl && typeof fetchImpl === "function") {
      result = await requestJson(`${activeApiUrl}result_half_new.php`);
    }
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
    let response;
    if (resultStore && typeof resultStore.settleRound === "function") {
      try {
        response = await resultStore.settleRound({
          game_sr_num: state.period,
          multiplier: state.multiplier,
        });
      } catch (error) {
        // Fall back to external API if local persistence throws (e.g. mock test environment)
        response = null;
      }
    }
    if (!response && activeApiUrl && typeof fetchImpl === "function") {
      response = await requestJson(`${activeApiUrl}result_insert_new.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminmultiply: state.multiplier,
          game_sr: state.period,
        }),
      });
    }

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
        if (forceCrash || state.multiplier >= state.crashMultiplier) {
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
      forceCrash = false;
      state.timeout = setTimeoutImpl(tick, 1000);
    } catch (error) {
      logger.error("Aviator socket update failed:", error.message);
      emitState();
      state.timeout = setTimeoutImpl(tick, 1000);
    }
  }

  function handleConnection(clientSocket) {
    emitState(clientSocket);

    // Support force drop / crash event
    if (clientSocket && typeof clientSocket.on === "function") {
      clientSocket.on("aviator_drop_now", () => {
        logger.log("🔥 FORCE CRASH RECEIVED (aviator_drop_now)");
        forceCrash = true;
      });

      clientSocket.on("force_crash", () => {
        logger.log("🔥 FORCE CRASH RECEIVED (force_crash)");
        forceCrash = true;
      });

      clientSocket.on("demobdg_aviator_control", () => {
        logger.log("🔥 FORCE CRASH RECEIVED (demobdg_aviator_control)");
        forceCrash = true;
      });
    }
  }

  if (namespace && typeof namespace.on === "function") {
    namespace.on("connection", handleConnection);
  }
  if (winplay_socket && winplay_socket !== namespace && typeof winplay_socket.on === "function") {
    winplay_socket.on("connection", handleConnection);
  }

  state.timeout = setTimeoutImpl(tick, 0);

  return {
    namespace,
    stop() {
      state.stopped = true;
      if (state.timeout !== undefined) clearTimeoutImpl(state.timeout);
    },
    forceCrash() {
      logger.log("🔥 FORCE CRASH TRIGGERED PROGRAMMATICALLY");
      forceCrash = true;
    },
    setResultApiUrl(newUrl) {
      activeApiUrl = normalizeBaseUrl(newUrl);
      logger.log("Aviator API URL updated to:", activeApiUrl);
    },
    getResultApiUrl() {
      return activeApiUrl;
    },
    getState() {
      return { ...state, forceCrash };
    },
  };
}

module.exports = createAviatorSocket;
module.exports.createAviatorSocket = createAviatorSocket;
