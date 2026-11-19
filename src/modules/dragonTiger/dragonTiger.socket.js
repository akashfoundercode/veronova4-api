"use strict";

const { DragonTigerService, DRAGON_TIGER_GAME_ID } = require("./dragonTiger.service");
const { dealWinningCards, determineWinner } = require("./dragonTigerDeck");

const BETTING_TIME_SEC = 15;
const REVEALING_TIME_SEC = 8;

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
    status: "betting", // "betting" | "revealing"
    time_remaining: BETTING_TIME_SEC,
    total_bet_time: BETTING_TIME_SEC,
    total_reveal_time: REVEALING_TIME_SEC,
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
      latest_bet: betRecord,
      totals: { ...activeRoundBets.totals },
      counts: { ...activeRoundBets.counts },
      lowest_spot: lowestWinner === "D" ? "dragon" : lowestWinner === "T" ? "tiger" : "tie",
      lowest_winner: lowestWinner,
    };

    // Broadcast to Socket 2 (Admin Live Bets Stream)
    try {
      adminNsp.emit("dragon_tiger:admin:bet_placed", streamPayload);
      if (io !== adminNsp && typeof io.emit === "function") {
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
    const payload = {
      status: state.status,
      period: state.period,
      time_remaining: state.time_remaining,
      game_id: state.game_id,
      online_count: state.online_count,
      cards: state.status === "revealing" ? state.current_cards : null,
      winner: state.status === "revealing" ? state.current_winner : null,
      multiplier: state.status === "revealing" ? state.multiplier : null,
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
      time_remaining: state.time_remaining,
      totals: { ...activeRoundBets.totals },
      counts: { ...activeRoundBets.counts },
      lowest_spot: lowestWinner === "D" ? "dragon" : lowestWinner === "T" ? "tiger" : "tie",
      lowest_winner: lowestWinner,
      bets: activeRoundBets.bets.slice(0, 50),
    };

    try {
      target.emit("dragon_tiger:admin:state", payload);
      if (io !== adminNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:admin:state", payload);
      }
    } catch (_) {}
  }

  async function handleRevealingPhase() {
    state.status = "revealing";
    state.time_remaining = REVEALING_TIME_SEC;

    logger.log(`[DragonTigerSocket] Round ${state.period} betting ended. Entering revealing phase...`);

    let settleResult = null;
    try {
      settleResult = await service.settleRound(DRAGON_TIGER_GAME_ID);
      logger.log(
        `[DragonTigerSocket] Round ${state.period} settled: Winner ${settleResult.winner} (${settleResult.win_number}) with Cards: D=${settleResult.cards?.dragon?.symbol}, T=${settleResult.cards?.tiger?.symbol}`
      );
    } catch (err) {
      logger.error("[DragonTigerSocket] Settle round error:", err.message);
      // Fallback in-memory settlement card reveal
      const fallbackWinner = determineWinner({
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
      status: "revealing",
      period: state.period,
      time_remaining: state.time_remaining,
      game_id: state.game_id,
      cards: settleResult.cards,
      winner: settleResult.winner, // "D" | "T" | "Tie"
      win_number: settleResult.win_number,
      multiplier: settleResult.multiplier,
    };

    try {
      clientNsp.emit("dragon_tiger:revealing", revealPayload);
      clientNsp.emit("dragon_tiger:state", revealPayload);
      if (io !== clientNsp && typeof io.emit === "function") {
        io.emit("dragon_tiger:revealing", revealPayload);
        io.emit("dragon_tiger:state", revealPayload);
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
  }

  async function handleRoundTransition() {
    logger.log(`[DragonTigerSocket] Round ${state.period} complete. Starting next round...`);

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

    // Reset state to betting
    state.status = "betting";
    state.time_remaining = BETTING_TIME_SEC;
    state.current_cards = null;
    state.current_winner = null;

    // Advance to next period
    await syncPeriod();

    emitClientState();
    emitAdminState();

    try {
      adminNsp.emit("dragon_tiger:admin:round_change", {
        type: "new_round",
        period: state.period,
        status: "betting",
        time_remaining: BETTING_TIME_SEC,
      });
    } catch (_) {}
  }

  // Initial sync
  syncPeriod();

  // Master 1-second loop
  const intervalId = setIntervalImpl(async () => {
    if (state.stopped) return;

    if (state.status === "betting") {
      state.time_remaining -= 1;
      emitClientState();

      if (state.time_remaining <= 0) {
        await handleRevealingPhase();
      }
    } else if (state.status === "revealing") {
      state.time_remaining -= 1;
      emitClientState();

      if (state.time_remaining <= 0) {
        await handleRoundTransition();
      }
    }
  }, 1000);

  // Client connection handler (Socket 1: Player Game Flow)
  clientNsp.on("connection", (client) => {
    emitClientState(client);

    // Allow bet placement over socket
    client.on("dragon_tiger:place_bet", async (data, callback) => {
      try {
        if (state.status !== "betting") {
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
  BETTING_TIME_SEC,
  REVEALING_TIME_SEC,
};
