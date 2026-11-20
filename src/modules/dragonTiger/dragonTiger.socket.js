"use strict";

const { DragonTigerService, DRAGON_TIGER_GAME_ID } = require("./dragonTiger.service");
const { dealWinningCards, determineWinner } = require("./dragonTigerDeck");

// User requested exact timing cycle:
// 1. 4 sec versus pop up
// 2. 2 sec place bet pop up
// 3. 15 sec place bets timer
// 4. 6 sec revealing cards & winner decide
// 5. 5 sec winner pop up
const PHASES = Object.freeze({
  VERSUS: "versus",
  PLACE_BET_POPUP: "place_bet_popup",
  BETTING: "betting",
  REVEALING: "revealing",
  WINNER_POPUP: "winner_popup",
});

const PHASE_TIMINGS = Object.freeze({
  [PHASES.VERSUS]: 4,
  [PHASES.PLACE_BET_POPUP]: 2,
  [PHASES.BETTING]: 15,
  [PHASES.REVEALING]: 6,
  [PHASES.WINNER_POPUP]: 5,
});

let activeSocketInstance = null;

function createDragonTigerSocket(io, {
  service = new DragonTigerService(),
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
  logger = console,
} = {}) {
  if (!io) return null;

  // Socket 1: Player Game Flow Namespace
  const clientNsp = typeof io.of === "function" ? io.of("/dragon-tiger") : io;
  // Socket 2: Admin Live Stream Namespace
  const adminNsp = typeof io.of === "function" ? io.of("/dragon-tiger-admin") : io;

  const state = {
    game_id: DRAGON_TIGER_GAME_ID,
    period: "0",
    status: PHASES.VERSUS, // "versus" | "place_bet_popup" | "betting" | "revealing" | "winner_popup"
    phase: PHASES.VERSUS,
    time_remaining: PHASE_TIMINGS[PHASES.VERSUS],
    phase_duration: PHASE_TIMINGS[PHASES.VERSUS],
    timings: PHASE_TIMINGS,
    last_settled: null,
    current_cards: null,
    current_winner: null,
    multiplier: 2,
    online_count: 85 + Math.floor(Math.random() * 20),
    stopped: false,
  };

  // In-memory active round bets cache for instantaneous admin streaming
  const activeRoundBets = {
    period: "0",
    totals: { dragon: 0, tiger: 0, tie: 0, total: 0 },
    counts: { dragon: 0, tiger: 0, tie: 0, total: 0 },
    bets: [],
  };

  async function syncPeriod() {
    try {
      const period = await service.getCurrentPeriod(DRAGON_TIGER_GAME_ID);
      if (period && period !== state.period) {
        state.period = period;
        resetActiveRoundBets(period);
      }
    } catch (err) {
      logger.error("[DragonTigerSocket] syncPeriod error:", err.message);
    }
  }

  function resetActiveRoundBets(newPeriod) {
    activeRoundBets.period = newPeriod;
    activeRoundBets.totals = { dragon: 0, tiger: 0, tie: 0, total: 0 };
    activeRoundBets.counts = { dragon: 0, tiger: 0, tie: 0, total: 0 };
    activeRoundBets.bets = [];
  }

  function recordLiveBet({ userid, username, spot, amount, id, created_at }) {
    const s = String(spot).toLowerCase();
    const amt = Number(amount);
    if (s === "tiger" || s === "t" || s === "2") {
      activeRoundBets.totals.tiger = Number((activeRoundBets.totals.tiger + amt).toFixed(2));
      activeRoundBets.counts.tiger += 1;
    } else if (s === "tie" || s === "3") {
      activeRoundBets.totals.tie = Number((activeRoundBets.totals.tie + amt).toFixed(2));
      activeRoundBets.counts.tie += 1;
    } else {
      activeRoundBets.totals.dragon = Number((activeRoundBets.totals.dragon + amt).toFixed(2));
      activeRoundBets.counts.dragon += 1;
    }
    activeRoundBets.totals.total = Number(
      (activeRoundBets.totals.dragon + activeRoundBets.totals.tiger + activeRoundBets.totals.tie).toFixed(2)
    );
    activeRoundBets.counts.total =
      activeRoundBets.counts.dragon + activeRoundBets.counts.tiger + activeRoundBets.counts.tie;

    const betRecord = {
      id: id || `bet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userid,
      username: username || `User_${userid}`,
      spot: s === "tiger" || s === "t" || s === "2" ? "tiger" : s === "tie" || s === "3" ? "tie" : "dragon",
      amount: amt,
      created_at: created_at || new Date().toISOString(),
    };
    activeRoundBets.bets.unshift(betRecord);
    if (activeRoundBets.bets.length > 200) activeRoundBets.bets.pop();

    const lowestWinner = determineWinner({
      dragonTotal: activeRoundBets.totals.dragon,
      tigerTotal: activeRoundBets.totals.tiger,
      tieTotal: activeRoundBets.totals.tie,
    });

    const streamPayload = {
      period: state.period,
      game_id: DRAGON_TIGER_GAME_ID,
      status: state.status,
      phase: state.phase,
      time_remaining: state.time_remaining,
      phase_duration: state.phase_duration,
      latest_bet: betRecord,
      totals: { ...activeRoundBets.totals },
      counts: { ...activeRoundBets.counts },
      lowest_spot: lowestWinner === "D" ? "dragon" : lowestWinner === "T" ? "tiger" : "tie",
      lowest_winner: lowestWinner,
      admin_force: service.inMemoryForce?.winner || "auto",
      bets: activeRoundBets.bets.slice(0, 50),
      timings: PHASE_TIMINGS,
    };

    // Broadcast unified live feed to Socket 2 (Admin)
    try {
      adminNsp.emit("dragon_tiger:admin:live", streamPayload);
      adminNsp.emit("dragon_tiger:admin:bet_placed", streamPayload);
      adminNsp.emit("dragon_tiger:admin:state", streamPayload);
      if (io !== adminNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:admin:live", streamPayload);
        io.emit("dragon_tiger:admin:bet_placed", streamPayload);
        io.emit("dragon_tiger:admin_stream", streamPayload);
      }
    } catch (_) {}

    // Broadcast bet pulse to client socket
    try {
      clientNsp.emit("dragon_tiger:bet_pulse", {
        period: state.period,
        spot: betRecord.spot,
        amount: betRecord.amount,
        totals: { ...activeRoundBets.totals },
      });
    } catch (_) {}
  }

  function emitClientState(target = clientNsp) {
    const isRevealOrWinner = state.phase === PHASES.REVEALING || state.phase === PHASES.WINNER_POPUP;
    const activeForce = service.inMemoryForce?.winner || null;
    const payload = {
      status: state.status,
      phase: state.phase,
      phase_duration: state.phase_duration,
      period: state.period,
      time_remaining: state.time_remaining,
      game_id: state.game_id,
      online_count: state.online_count,
      admin_force: activeForce !== "auto" ? activeForce : null,
      cards: isRevealOrWinner ? state.current_cards : null,
      winner: isRevealOrWinner ? state.current_winner : null,
      win_number: isRevealOrWinner ? (state.last_settled?.win_number ?? (state.current_winner ? (state.current_winner === "D" ? 1 : state.current_winner === "T" ? 2 : 3) : null)) : null,
      multiplier: isRevealOrWinner ? state.multiplier : null,
      last_settled: state.last_settled,
      timings: PHASE_TIMINGS,
    };

    try {
      target.emit("dragon_tiger:state", payload);
      target.emit("dragon_tiger:timer", payload);
      if (io !== clientNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:state", payload);
        io.emit("dragon_tiger:timer", payload);
      }
    } catch (_) {}
  }

  function emitAdminState(target = adminNsp) {
    const lowestWinner = determineWinner({
      dragonTotal: activeRoundBets.totals.dragon,
      tigerTotal: activeRoundBets.totals.tiger,
      tieTotal: activeRoundBets.totals.tie,
    });
    const payload = {
      period: state.period,
      game_id: DRAGON_TIGER_GAME_ID,
      status: state.status,
      phase: state.phase,
      time_remaining: state.time_remaining,
      phase_duration: state.phase_duration,
      totals: { ...activeRoundBets.totals },
      counts: { ...activeRoundBets.counts },
      lowest_spot: lowestWinner === "D" ? "dragon" : lowestWinner === "T" ? "tiger" : "tie",
      lowest_winner: lowestWinner,
      admin_force: service.inMemoryForce?.winner || "auto",
      bets: activeRoundBets.bets.slice(0, 50),
      timings: PHASE_TIMINGS,
    };

    try {
      target.emit("dragon_tiger:admin:live", payload);
      target.emit("dragon_tiger:admin:state", payload);
      if (io !== adminNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:admin:live", payload);
        io.emit("dragon_tiger:admin:state", payload);
      }
    } catch (_) {}
  }

  // --- Phase Handlers ---

  function startVersusPhase() {
    state.status = PHASES.VERSUS;
    state.phase = PHASES.VERSUS;
    state.phase_duration = PHASE_TIMINGS[PHASES.VERSUS];
    state.time_remaining = PHASE_TIMINGS[PHASES.VERSUS];
    state.current_cards = null;
    state.current_winner = null;

    logger.log(`[DragonTigerSocket] Round ${state.period} - Phase 1: Versus Pop-up (4s)...`);
    const payload = {
      status: PHASES.VERSUS,
      phase: PHASES.VERSUS,
      period: state.period,
      time_remaining: state.time_remaining,
      phase_duration: state.phase_duration,
    };
    try {
      clientNsp.emit("dragon_tiger:versus", payload);
      if (io !== clientNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:versus", payload);
      }
    } catch (_) {}
    emitClientState();
    emitAdminState();
  }

  function startPlaceBetPopupPhase() {
    state.status = PHASES.PLACE_BET_POPUP;
    state.phase = PHASES.PLACE_BET_POPUP;
    state.phase_duration = PHASE_TIMINGS[PHASES.PLACE_BET_POPUP];
    state.time_remaining = PHASE_TIMINGS[PHASES.PLACE_BET_POPUP];

    logger.log(`[DragonTigerSocket] Round ${state.period} - Phase 2: Place Bet Pop-up (2s)...`);
    const payload = {
      status: PHASES.PLACE_BET_POPUP,
      phase: PHASES.PLACE_BET_POPUP,
      period: state.period,
      time_remaining: state.time_remaining,
      phase_duration: state.phase_duration,
    };
    try {
      clientNsp.emit("dragon_tiger:place_bet_popup", payload);
      clientNsp.emit("dragon_tiger:start_bet", payload);
      if (io !== clientNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:place_bet_popup", payload);
        io.emit("dragon_tiger:start_bet", payload);
      }
    } catch (_) {}
    emitClientState();
    emitAdminState();
  }

  function startBettingPhase() {
    state.status = PHASES.BETTING;
    state.phase = PHASES.BETTING;
    state.phase_duration = PHASE_TIMINGS[PHASES.BETTING];
    state.time_remaining = PHASE_TIMINGS[PHASES.BETTING];

    logger.log(`[DragonTigerSocket] Round ${state.period} - Phase 3: Place Bets Timer (15s)...`);
    const payload = {
      status: PHASES.BETTING,
      phase: PHASES.BETTING,
      period: state.period,
      time_remaining: state.time_remaining,
      phase_duration: state.phase_duration,
    };
    try {
      clientNsp.emit("dragon_tiger:betting_started", payload);
      if (io !== clientNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:betting_started", payload);
      }
      adminNsp.emit("dragon_tiger:admin:round_change", { type: "betting", ...payload });
    } catch (_) {}
    emitClientState();
    emitAdminState();
  }

  async function startRevealingPhase() {
    state.status = PHASES.REVEALING;
    state.phase = PHASES.REVEALING;
    state.phase_duration = PHASE_TIMINGS[PHASES.REVEALING];
    state.time_remaining = PHASE_TIMINGS[PHASES.REVEALING];

    logger.log(`[DragonTigerSocket] Round ${state.period} - Phase 4: Revealing Cards & Winner Decide (6s)...`);

    let settleResult = null;
    try {
      settleResult = await service.settleRound(
        DRAGON_TIGER_GAME_ID,
        service.inMemoryForce?.winner || null,
        state.period,
      );
      logger.log(
        `[DragonTigerSocket] Round ${state.period} settled: Winner ${settleResult.winner} (${settleResult.win_number}) with Cards: D=${settleResult.cards?.dragon?.symbol}, T=${settleResult.cards?.tiger?.symbol}`
      );
    } catch (err) {
      logger.error("[DragonTigerSocket] Settle round error:", err.message);
      // Fallback in-memory settlement card reveal - RESPECT ACTIVE FORCE!
      const activeForced = service.inMemoryForce?.winner || null;
      const fallbackWinner = activeForced ? activeForced : determineWinner({
        dragonTotal: activeRoundBets.totals.dragon,
        tigerTotal: activeRoundBets.totals.tiger,
        tieTotal: activeRoundBets.totals.tie,
      });
      const dealt = dealWinningCards(fallbackWinner);
      settleResult = {
        games_no: state.period,
        winner: fallbackWinner,
        win_number: dealt.win_number,
        multiplier: dealt.multiplier,
        cards: { dragon: dealt.dragon, tiger: dealt.tiger },
      };
    }

    state.current_cards = settleResult.cards;
    state.current_winner = settleResult.winner;
    state.multiplier = settleResult.multiplier;
    state.last_settled = settleResult;

    const revealPayload = {
      status: PHASES.REVEALING,
      phase: PHASES.REVEALING,
      period: state.period,
      time_remaining: state.time_remaining,
      phase_duration: state.phase_duration,
      game_id: state.game_id,
      cards: settleResult.cards,
      winner: settleResult.winner, // "D" | "T" | "Tie"
      win_number: settleResult.win_number,
      multiplier: settleResult.multiplier,
    };

    try {
      clientNsp.emit("dragon_tiger:revealing", revealPayload);
      if (io !== clientNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:revealing", revealPayload);
      }

      adminNsp.emit("dragon_tiger:admin:round_change", {
        type: "revealing",
        ...revealPayload,
      });
      if (io !== adminNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:admin:round_change", {
          type: "revealing",
          ...revealPayload,
        });
      }
    } catch (_) {}
    emitClientState();
    emitAdminState();
  }

  function startWinnerPopupPhase() {
    state.status = PHASES.WINNER_POPUP;
    state.phase = PHASES.WINNER_POPUP;
    state.phase_duration = PHASE_TIMINGS[PHASES.WINNER_POPUP];
    state.time_remaining = PHASE_TIMINGS[PHASES.WINNER_POPUP];

    logger.log(`[DragonTigerSocket] Round ${state.period} - Phase 5: Winner Pop-up (5s)... Winner: ${state.current_winner}`);

    const winnerPayload = {
      status: PHASES.WINNER_POPUP,
      phase: PHASES.WINNER_POPUP,
      period: state.period,
      time_remaining: state.time_remaining,
      phase_duration: state.phase_duration,
      winner: state.current_winner,
      win_number: state.last_settled?.win_number,
      multiplier: state.multiplier,
      cards: state.current_cards,
    };

    try {
      clientNsp.emit("dragon_tiger:winner_popup", winnerPayload);
      clientNsp.emit("dragon_tiger:winner", winnerPayload);
      if (io !== clientNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:winner_popup", winnerPayload);
        io.emit("dragon_tiger:winner", winnerPayload);
      }
    } catch (_) {}
    emitClientState();
    emitAdminState();
  }

  async function handleCycleTransition() {
    logger.log(`[DragonTigerSocket] Round ${state.period} fully completed. Starting next round...`);

    const settledPayload = {
      period: state.period,
      winner: state.current_winner,
      win_number: state.last_settled?.win_number,
      cards: state.current_cards,
    };

    try {
      clientNsp.emit("dragon_tiger:round_settled", settledPayload);
      clientNsp.emit("dragon_tiger:result", settledPayload);
      if (io !== clientNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:round_settled", settledPayload);
        io.emit("dragon_tiger:result", settledPayload);
      }
    } catch (_) {}

    // Advance to next period explicitly in DB & memory
    try {
      const nextPeriod = await service.advancePeriod(DRAGON_TIGER_GAME_ID, state.period);
      state.period = String(nextPeriod);
    } catch (_) {
      if (/^\d+$/.test(String(state.period))) {
        state.period = String(BigInt(state.period) + 1n);
      }
    }
    resetActiveRoundBets(state.period);

    // Start next round with Phase 1: Versus
    startVersusPhase();
  }

  // Initial period sync from database
  service.getCurrentPeriod(DRAGON_TIGER_GAME_ID).then((period) => {
    if (period && period !== "0") {
      state.period = String(period);
      resetActiveRoundBets(state.period);
      emitClientState();
      emitAdminState();
    }
  }).catch(() => {});

  // Master 1-second state-machine timer loop
  const intervalId = setIntervalImpl(async () => {
    if (state.stopped) return;

    state.time_remaining -= 1;
    emitClientState();

    if (state.time_remaining <= 0) {
      switch (state.phase) {
        case PHASES.VERSUS:
          // 4s versus complete -> start 2s place bet popup
          startPlaceBetPopupPhase();
          break;

        case PHASES.PLACE_BET_POPUP:
          // 2s place bet popup complete -> start 15s place bets timer
          startBettingPhase();
          break;

        case PHASES.BETTING:
          // 15s betting timer complete -> start 6s revealing cards & winner decide
          await startRevealingPhase();
          break;

        case PHASES.REVEALING:
          // 6s revealing cards complete -> start 5s winner popup
          startWinnerPopupPhase();
          break;

        case PHASES.WINNER_POPUP:
          // 5s winner popup complete -> complete round and transition to next round
          await handleCycleTransition();
          break;

        default:
          startVersusPhase();
          break;
      }
    }
  }, 1000);

  // Client connection handler (Socket 1: Player Game Flow)
  clientNsp.on("connection", (client) => {
    emitClientState(client);

    // Allow bet placement over socket (allowed during betting & place_bet_popup phases)
    client.on("dragon_tiger:place_bet", async (data, callback) => {
      try {
        if (state.phase !== PHASES.BETTING && state.phase !== PHASES.PLACE_BET_POPUP) {
          const errRes = { status: 400, message: "Betting closed for current round. Please wait for next round." };
          if (typeof callback === "function") callback(errRes);
          return client.emit("dragon_tiger:bet_error", errRes);
        }
        const res = await service.placeSingleOrMultiBet({
          userid: data?.userid,
          bets: data?.bets || { spot: data?.spot, amount: data?.amount },
          game_id: DRAGON_TIGER_GAME_ID,
        });

        // Record for real-time live bets stream
        if (Array.isArray(res.bets)) {
          for (const b of res.bets) {
            recordLiveBet({
              userid: b.userid,
              username: data?.username,
              spot: b.spot,
              amount: b.amount,
              id: b.id,
            });
          }
        }
        if (typeof callback === "function") callback(res);
        client.emit("dragon_tiger:bet_success", res);
      } catch (err) {
        const errPayload = { status: 400, message: err.message || "Failed to place bet" };
        if (typeof callback === "function") callback(errPayload);
        client.emit("dragon_tiger:bet_error", errPayload);
      }
    });
  });

  // Admin connection handler (Socket 2: Admin Live Bets Stream)
  adminNsp.on("connection", (adminClient) => {
    emitAdminState(adminClient);

    // Admin can force winner over socket
    adminClient.on("dragon_tiger:admin:force_winner", async (data, callback) => {
      try {
        const res = await service.setAdminForce({
          winner: data?.winner,
          period: state.period,
          gameId: DRAGON_TIGER_GAME_ID,
        });
        const resp = { status: 200, message: "Admin force configured", data: res };
        if (typeof callback === "function") callback(resp);
        adminClient.emit("dragon_tiger:admin:force_success", resp);
        emitAdminState();
      } catch (err) {
        const errResp = { status: 400, message: err.message };
        if (typeof callback === "function") callback(errResp);
        adminClient.emit("dragon_tiger:admin:force_error", errResp);
      }
    });
  });

  const instance = {
    io,
    service,
    clientNsp,
    adminNsp,
    state,
    activeRoundBets,
    recordLiveBet,
    stop: () => {
      state.stopped = true;
      clearIntervalImpl(intervalId);
    },
    syncPeriod,
    // Methods for testing transitions directly
    startVersusPhase,
    startPlaceBetPopupPhase,
    startBettingPhase,
    startRevealingPhase,
    startWinnerPopupPhase,
    handleCycleTransition,
  };

  activeSocketInstance = instance;
  return instance;
}

function getDragonTigerSocket() {
  return activeSocketInstance;
}

module.exports = {
  createDragonTigerSocket,
  getDragonTigerSocket,
  PHASES,
  PHASE_TIMINGS,
};
