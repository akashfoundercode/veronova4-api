"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  DECK_52,
  buildFullDeck,
  dealWinningCards,
  determineWinner,
  normalizeWinner,
  getPayoutMultiplier,
} = require("../src/modules/dragonTiger/dragonTigerDeck");
const { DragonTigerService } = require("../src/modules/dragonTiger/dragonTiger.service");
const { createDragonTigerSocket } = require("../src/modules/dragonTiger/dragonTiger.socket");

test("Dragon Tiger 52-card deck has exactly 52 cards with 4 suits and 13 ranks each", () => {
  const deck = buildFullDeck();
  assert.equal(deck.length, 52);
  assert.equal(DECK_52.length, 52);

  const suits = new Set(deck.map((c) => c.suit));
  assert.equal(suits.size, 4);
  assert.ok(suits.has("spades"));
  assert.ok(suits.has("hearts"));
  assert.ok(suits.has("clubs"));
  assert.ok(suits.has("diamonds"));

  for (let rank = 1; rank <= 13; rank++) {
    const ofRank = deck.filter((c) => c.rank === rank);
    assert.equal(ofRank.length, 4);
  }
});

test("Card dealing strictly satisfies the winner condition and payouts", () => {
  // 1. Dragon wins: Dragon rank > Tiger rank, payout 2x
  for (let i = 0; i < 20; i++) {
    const dealD = dealWinningCards("D");
    assert.equal(dealD.winner, "D");
    assert.equal(dealD.win_number, 1);
    assert.equal(dealD.multiplier, 2);
    assert.ok(dealD.dragon.rank > dealD.tiger.rank);
  }

  // 2. Tiger wins: Tiger rank > Dragon rank, payout 2x
  for (let i = 0; i < 20; i++) {
    const dealT = dealWinningCards("T");
    assert.equal(dealT.winner, "T");
    assert.equal(dealT.win_number, 2);
    assert.equal(dealT.multiplier, 2);
    assert.ok(dealT.tiger.rank > dealT.dragon.rank);
  }

  // 3. Tie wins: Dragon rank == Tiger rank, payout 5x
  for (let i = 0; i < 20; i++) {
    const dealTie = dealWinningCards("Tie");
    assert.equal(dealTie.winner, "Tie");
    assert.equal(dealTie.win_number, 3);
    assert.equal(dealTie.multiplier, 5);
    assert.equal(dealTie.dragon.rank, dealTie.tiger.rank);
    assert.notEqual(dealTie.dragon.suit, dealTie.tiger.suit);
  }
});

test("Payout multipliers are strictly Dragon 2x, Tiger 2x, Tie 5x", () => {
  assert.equal(getPayoutMultiplier("D"), 2);
  assert.equal(getPayoutMultiplier("1"), 2);
  assert.equal(getPayoutMultiplier("dragon"), 2);
  assert.equal(getPayoutMultiplier("T"), 2);
  assert.equal(getPayoutMultiplier("2"), 2);
  assert.equal(getPayoutMultiplier("tiger"), 2);
  assert.equal(getPayoutMultiplier("Tie"), 5);
  assert.equal(getPayoutMultiplier("3"), 5);
  assert.equal(getPayoutMultiplier("tie"), 5);
});

test("Lowest bet option strictly wins when not forced by admin", () => {
  // Case A: Dragon has lowest bet amount -> Dragon ('D') wins
  const winnerA = determineWinner({
    dragonTotal: 100,
    tigerTotal: 500,
    tieTotal: 300,
  });
  assert.equal(winnerA, "D");

  // Case B: Tiger has lowest bet amount -> Tiger ('T') wins
  const winnerB = determineWinner({
    dragonTotal: 1000,
    tigerTotal: 200,
    tieTotal: 400,
  });
  assert.equal(winnerB, "T");

  // Case C: Tie has lowest bet amount -> Tie ('Tie') wins
  const winnerC = determineWinner({
    dragonTotal: 500,
    tigerTotal: 300,
    tieTotal: 50,
  });
  assert.equal(winnerC, "Tie");
});

test("Admin force strictly overrides bet totals", () => {
  // Even if Dragon has the highest bets, if admin forces Dragon -> Dragon wins
  const forcedD = determineWinner({
    dragonTotal: 10000,
    tigerTotal: 10,
    tieTotal: 5,
    adminForced: "D",
  });
  assert.equal(forcedD, "D");

  // Even if Tiger has the highest bets, if admin forces Tiger -> Tiger wins
  const forcedT = determineWinner({
    dragonTotal: 10,
    tigerTotal: 10000,
    tieTotal: 5,
    adminForced: "T",
  });
  assert.equal(forcedT, "T");

  // Even if Tie has the highest bets, if admin forces Tie -> Tie wins
  const forcedTie = determineWinner({
    dragonTotal: 10,
    tigerTotal: 20,
    tieTotal: 50000,
    adminForced: "Tie",
  });
  assert.equal(forcedTie, "Tie");

  // If admin force is auto -> lowest bet wins
  const forcedAuto = determineWinner({
    dragonTotal: 1000,
    tigerTotal: 200,
    tieTotal: 800,
    adminForced: "auto",
  });
  assert.equal(forcedAuto, "T");
});

test("DragonTigerService settleRound awards 2x for Dragon/Tiger and 5x for Tie atomically", async () => {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  let released = false;

  const mockConnection = {
    calls,
    get committed() { return committed; },
    get rolledBack() { return rolledBack; },
    get released() { return released; },
    async beginTransaction() {},
    async execute(sql, params) {
      const norm = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: norm, params });
      if (norm.startsWith("SELECT games_no, number, amount FROM betlogs")) {
        return [[{ games_no: "20261119100001", number: 1, amount: 100 }], []];
      }
      if (norm.startsWith("SELECT id FROM bet_results")) {
        return [[], []];
      }
      if (norm.startsWith("SELECT number FROM admin_winner_results")) {
        return [[], []];
      }
      if (norm.startsWith("SELECT number, amount FROM bets")) {
        return [[
          { number: 1, amount: 200 }, // Dragon: 200
          { number: 2, amount: 500 }, // Tiger: 500
          { number: 3, amount: 50 },  // Tie: 50 -> Tie is lowest!
        ], []];
      }
      if (norm.startsWith("SELECT userid, win_amount FROM bets")) {
        return [[{ userid: 77, win_amount: 250 }], []];
      }
      return [{ affectedRows: 1 }, []];
    },
    async commit() { committed = true; },
    async rollback() { rolledBack = true; },
    release() { released = true; },
  };

  const service = new DragonTigerService(() => ({
    getConnection: async () => mockConnection,
  }));

  const res = await service.settleRound(10);
  assert.equal(res.winner, "Tie");
  assert.equal(res.win_number, 3);
  assert.equal(res.multiplier, 5);
  assert.equal(res.cards.dragon.rank, res.cards.tiger.rank);
  assert.equal(mockConnection.committed, true);

  const updateBets = calls.find((c) => c.sql.startsWith("UPDATE bets SET win_amount = trade_amount * ?"));
  assert.ok(updateBets);
  assert.equal(updateBets.params[0], 5); // 5x payout for Tie
  assert.equal(updateBets.params[1], 3); // win_number = 3
});

test("DragonTigerSocket manages exact 5-phase timing: 4s versus, 2s place bet popup, 15s betting, 6s revealing, 5s winner popup", async () => {
  const clientEvents = [];
  const adminEvents = [];

  const mockClientNsp = {
    emit(event, data) {
      clientEvents.push({ event, data });
    },
    on() {},
  };

  const mockAdminNsp = {
    emit(event, data) {
      adminEvents.push({ event, data });
    },
    on() {},
  };

  const mockIo = {
    of(nsp) {
      if (nsp === "/dragon-tiger-admin") return mockAdminNsp;
      return mockClientNsp;
    },
    emit(event, data) {
      clientEvents.push({ event, data });
    },
  };

  let tickHandler = null;
  const mockSetInterval = (fn) => {
    tickHandler = fn;
    return 12345;
  };

  const mockService = {
    getCurrentPeriod: async () => "20261119100001",
    advancePeriod: async (gid, curr) => String(BigInt(curr || "20261119100001") + 1n),
    settleRound: async () => ({
      games_no: "20261119100001",
      winner: "D",
      win_number: 1,
      multiplier: 2,
      cards: dealWinningCards("D"),
    }),
  };

  const socketInstance = createDragonTigerSocket(mockIo, {
    service: mockService,
    setIntervalImpl: mockSetInterval,
    clearIntervalImpl: () => {},
  });
  socketInstance.state.period = "20261119100001";

  assert.ok(socketInstance);
  // Phase 1: Versus (4 seconds)
  assert.equal(socketInstance.state.phase, "versus");
  assert.equal(socketInstance.state.time_remaining, 4);

  // Fast forward versus timer (4 -> 0) -> should transition to Phase 2: Place Bet Pop-up (2s)
  socketInstance.state.time_remaining = 1;
  await tickHandler();
  assert.equal(socketInstance.state.phase, "place_bet_popup");
  assert.equal(socketInstance.state.time_remaining, 2);

  // Fast forward place bet pop-up timer (2 -> 0) -> should transition to Phase 3: Betting (15s)
  socketInstance.state.time_remaining = 1;
  await tickHandler();
  assert.equal(socketInstance.state.phase, "betting");
  assert.equal(socketInstance.state.time_remaining, 15);

  // Place a live bet and check Socket 2 (Admin Live Bets Stream)
  socketInstance.recordLiveBet({
    userid: 42,
    username: "Alex_Ace",
    spot: "dragon",
    amount: 500,
  });

  const adminBetEvent = adminEvents.find((e) => e.event === "dragon_tiger:admin:bet_placed");
  assert.ok(adminBetEvent);
  assert.equal(adminBetEvent.data.latest_bet.spot, "dragon");
  assert.equal(adminBetEvent.data.latest_bet.amount, 500);
  assert.equal(adminBetEvent.data.totals.dragon, 500);

  // Fast forward betting timer (15 -> 0) -> should transition to Phase 4: Revealing (6s)
  socketInstance.state.time_remaining = 1;
  await tickHandler();
  assert.equal(socketInstance.state.phase, "revealing");
  assert.equal(socketInstance.state.time_remaining, 6);

  const revealEvent = clientEvents.find((e) => e.event === "dragon_tiger:revealing");
  assert.ok(revealEvent);
  assert.equal(revealEvent.data.phase, "revealing");
  assert.equal(revealEvent.data.winner, "D");
  assert.equal(revealEvent.data.multiplier, 2);
  assert.ok(revealEvent.data.cards.dragon.rank > revealEvent.data.cards.tiger.rank);

  // Fast forward revealing timer (6 -> 0) -> should transition to Phase 5: Winner Pop-up (5s)
  socketInstance.state.time_remaining = 1;
  await tickHandler();
  assert.equal(socketInstance.state.phase, "winner_popup");
  assert.equal(socketInstance.state.time_remaining, 5);

  const winnerEvent = clientEvents.find((e) => e.event === "dragon_tiger:winner_popup");
  assert.ok(winnerEvent);
  assert.equal(winnerEvent.data.phase, "winner_popup");
  assert.equal(winnerEvent.data.winner, "D");

  // Fast forward winner pop-up timer (5 -> 0) -> round completes and transitions back to Phase 1: Versus (4s)
  socketInstance.state.time_remaining = 1;
  await tickHandler();
  assert.equal(socketInstance.state.phase, "versus");
  assert.equal(socketInstance.state.time_remaining, 4);
  assert.equal(socketInstance.state.period, "20261119100002");

  socketInstance.stop();
});

test("DragonTigerService returns last 120 results formatted strictly with 'D', 'T', 'Tie'", async () => {
  const sampleResults = [
    { id: 101, games_no: "20261119100101", number: 1, card_id: JSON.stringify({ dragon: { rank: 12, suit: "hearts" }, tiger: { rank: 5, suit: "spades" } }), json: null, created_at: "2026-11-19T10:00:00Z" },
    { id: 102, games_no: "20261119100102", number: 2, card_id: JSON.stringify({ dragon: { rank: 3, suit: "clubs" }, tiger: { rank: 10, suit: "diamonds" } }), json: null, created_at: "2026-11-19T10:01:00Z" },
    { id: 103, games_no: "20261119100103", number: 3, card_id: JSON.stringify({ dragon: { rank: 8, suit: "hearts" }, tiger: { rank: 8, suit: "spades" } }), json: null, created_at: "2026-11-19T10:02:00Z" },
  ];

  const mockPool = {
    execute: async (sql) => {
      if (sql.includes("FROM bet_results")) {
        return [sampleResults, []];
      }
      return [[], []];
    },
  };

  const service = new DragonTigerService(() => mockPool);
  const results = await service.getLast120Results(10);

  assert.equal(results.length, 3);
  assert.equal(results[0].winner, "D");
  assert.equal(results[0].win_number, 1);
  assert.equal(results[1].winner, "T");
  assert.equal(results[1].win_number, 2);
  assert.equal(results[2].winner, "Tie");
  assert.equal(results[2].win_number, 3);
});

test("DragonTiger controllers support placeBet, getResults, getCurrentRound, and adminControl", async () => {
  const controller = require("../src/modules/dragonTiger/dragonTiger.controller");

  // 1. getCurrentRound
  let roundJson = null;
  const mockResRound = {
    status(code) {
      assert.equal(code, 200);
      return { json: (data) => { roundJson = data; } };
    },
  };
  await controller.getCurrentRound({}, mockResRound);
  assert.ok(roundJson);
  assert.equal(roundJson.status, 200);
  assert.equal(roundJson.game_id, 10);
  assert.ok(roundJson.period);

  // 2. getResults (last 120 results)
  let resultsJson = null;
  const mockResResults = {
    status(code) {
      assert.equal(code, 200);
      return { json: (data) => { resultsJson = data; } };
    },
  };
  // Mock service.getLast120Results for controller
  const origGetLast120 = controller.service.getLast120Results;
  controller.service.getLast120Results = async () => [
    { period: "20261119100001", winner: "D", win_number: 1, dragon_card: { rank: 11 }, tiger_card: { rank: 4 } },
    { period: "20261119100002", winner: "T", win_number: 2, dragon_card: { rank: 2 }, tiger_card: { rank: 9 } },
    { period: "20261119100003", winner: "Tie", win_number: 3, dragon_card: { rank: 7 }, tiger_card: { rank: 7 } },
  ];
  await controller.getResults({}, mockResResults);
  assert.ok(resultsJson);
  assert.equal(resultsJson.status, 200);
  assert.equal(resultsJson.total_results, 3);
  assert.equal(resultsJson.data[0].winner, "D");
  assert.equal(resultsJson.data[1].winner, "T");
  assert.equal(resultsJson.data[2].winner, "Tie");
  controller.service.getLast120Results = origGetLast120;

  // 3. adminControl
  let adminJson = null;
  const mockResAdmin = {
    status(code) {
      assert.equal(code, 200);
      return { json: (data) => { adminJson = data; } };
    },
  };
  const origSetAdminForce = controller.service.setAdminForce;
  controller.service.setAdminForce = async ({ winner }) => ({ success: true, winner });
  await controller.adminControl({ body: { winner: "D" } }, mockResAdmin);
  assert.ok(adminJson);
  assert.equal(adminJson.status, 200);
  assert.equal(adminJson.data.winner, "D");
  controller.service.setAdminForce = origSetAdminForce;

  // 4. placeBet
  const socket = require("../src/modules/dragonTiger/dragonTiger.socket").getDragonTigerSocket();
  if (socket) {
    socket.state.status = "betting";
    socket.state.phase = "betting";
  }

  let betJson = null;
  const mockResBet = {
    status(code) {
      assert.equal(code, 200);
      return { json: (data) => { betJson = data; } };
    },
  };
  const origPlaceBet = controller.service.placeSingleOrMultiBet;
  controller.service.placeSingleOrMultiBet = async () => ({
    status: 200,
    message: "Bet Successfully",
    balance: 900,
    bets: [{ id: 99, spot: "dragon", amount: 100 }],
  });
  await controller.placeBet({ user: { id: 1 }, body: { spot: "dragon", amount: 100 } }, mockResBet);
  assert.ok(betJson);
  assert.equal(betJson.status, 200);
  assert.equal(betJson.balance, 900);

  // 5. placeBet should reject when revealing
  if (socket) {
    socket.state.status = "revealing";
    socket.state.phase = "revealing";
  }
  let rejectedCode = null;
  const mockResReject = {
    status(code) {
      rejectedCode = code;
      return { json: () => {} };
    },
  };
  await controller.placeBet({ user: { id: 1 }, body: { spot: "dragon", amount: 100 } }, mockResReject);
  assert.equal(rejectedCode, 400);

  controller.service.placeSingleOrMultiBet = origPlaceBet;
});

test("DragonTigerService advancePeriod accurately increments period sequence", async () => {
  const calls = [];
  const mockPool = {
    execute: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM bet_results")) {
        return [[{ games_no: "20261119100050" }], []];
      }
      if (sql.includes("FROM betlogs")) {
        return [[{ games_no: "20261119100050" }], []];
      }
      return [{ affectedRows: 1 }, []];
    },
  };

  const service = new DragonTigerService(() => mockPool);
  const curr = await service.getCurrentPeriod(10);
  assert.equal(curr, "20261119100051");

  const next = await service.advancePeriod(10, curr);
  assert.equal(next, "20261119100052");
});
