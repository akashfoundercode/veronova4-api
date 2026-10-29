  "use strict";

  const assert = require("node:assert/strict");
  const { test } = require("node:test");
  const { API_ROUTES } = require("../src/config/apiRoutes");
  const { SocketService } = require("../src/modules/horseRace/services/socket.service");
  const { raceEngine } = require("../src/modules/horseRace/services/raceEngine");

  function createSocketIoMock() {
    const rootHandlers = new Map();
    const nsHandlers = new Map();
    const rootEmissions = [];
    const nsEmissions = [];

    const rootSocket = {
      on(event, handler) {
        rootHandlers.set(event, handler);
      },
      emit(event, payload) {
        rootEmissions.push({ event, payload });
      },
      to() {
        return {
          emit(event, payload) {
            rootEmissions.push({ event, payload });
          },
        };
      },
    };

    const nsSocket = {
      on(event, handler) {
        nsHandlers.set(event, handler);
      },
      emit(event, payload) {
        nsEmissions.push({ event, payload });
      },
      to() {
        return {
          emit(event, payload) {
            nsEmissions.push({ event, payload });
          },
        };
      },
    };

    const io = {
      ...rootSocket,
      of(namespace) {
        assert.equal(namespace, API_ROUTES.horseRace.socketNamespace);
        return nsSocket;
      },
    };

    return { io, rootHandlers, nsHandlers, rootEmissions, nsEmissions };
  }

  test("horseRace socket service attaches to both root and /horse-race namespace", () => {
    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    assert.equal(mock.rootHandlers.has("connection"), true);
    assert.equal(mock.nsHandlers.has("connection"), true);

    service.stop();
  });

  test("horseRace socket sends race:current_state upon client connection to root socket", () => {
    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    const clientEmissions = [];
    const clientHandlers = new Map();
    const clientSocket = {
      id: "client-root-1",
      handshake: {},
      join() { },
      emit(event, payload) {
        clientEmissions.push({ event, payload });
      },
      on(event, handler) {
        clientHandlers.set(event, handler);
      },
    };

    // Simulate client connection to root socket
    mock.rootHandlers.get("connection")(clientSocket);

    // Client must immediately receive race:current_state
    const stateEmission = clientEmissions.find((e) => e.event === "race:current_state");
    assert.ok(stateEmission, "Must emit race:current_state on connection");
    assert.ok(typeof stateEmission.payload === "object");

    service.stop();
  });

  test("horseRace socket responds to client requesting race:current_state explicitly", () => {
    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    const clientEmissions = [];
    const clientHandlers = new Map();
    const clientSocket = {
      id: "client-root-2",
      handshake: {},
      join() { },
      emit(event, payload) {
        clientEmissions.push({ event, payload });
      },
      on(event, handler) {
        clientHandlers.set(event, handler);
      },
    };

    mock.rootHandlers.get("connection")(clientSocket);

    assert.ok(clientHandlers.has("race:current_state"));
    assert.ok(clientHandlers.has("race:get_current_state"));

    let callbackResult;
    clientHandlers.get("race:current_state")({}, (result) => {
      callbackResult = result;
    });

    assert.ok(callbackResult, "Callback must receive current state");
    assert.ok(typeof callbackResult === "object");

    service.stop();
  });

  test("horseRace socket supports all forced winner event aliases (admin:force_winner, race:force_winner, etc.)", () => {
    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    const clientHandlers = new Map();
    const clientSocket = {
      id: "client-admin-1",
      handshake: {},
      join() { },
      emit() { },
      on(event, handler) {
        clientHandlers.set(event, handler);
      },
    };

    mock.rootHandlers.get("connection")(clientSocket);

    assert.ok(clientHandlers.has("admin:set_forced_winner"));
    assert.ok(clientHandlers.has("race:set_forced_winner"));
    assert.ok(clientHandlers.has("admin:force_winner"));
    assert.ok(clientHandlers.has("race:force_winner"));

    service.stop();
  });

  test("horseRace socket supports all jackpot control & queue event aliases", () => {
    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    const clientHandlers = new Map();
    const clientSocket = {
      id: "client-admin-2",
      handshake: {},
      join() { },
      emit() { },
      on(event, handler) {
        clientHandlers.set(event, handler);
      },
    };

    mock.rootHandlers.get("connection")(clientSocket);

    assert.ok(clientHandlers.has("admin:set_jackpot"));
    assert.ok(clientHandlers.has("admin:force_jackpot"));
    assert.ok(clientHandlers.has("race:set_jackpot"));
    assert.ok(clientHandlers.has("race:force_jackpot"));
    assert.ok(clientHandlers.has("admin:jackpot_queue_status"));
    assert.ok(clientHandlers.has("race:jackpot_queue"));
    service.stop();
  });

  test("horseRace socket broadcasts betting closed ticks with race:betting_closed_tic alias", () => {
    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    const tickData = {
      raceId: 101,
      gameSerial: "20261024001",
      stage: "BETTING_CLOSED",
      secondsRemaining: 3,
    };

    // Trigger engine event
    raceEngine.emit("race:betting_closed_tick", tickData);

    const ticEmission = mock.rootEmissions.find((e) => e.event === "race:betting_closed_tic");
    assert.ok(ticEmission, "Must emit race:betting_closed_tic for client compatibility");
    assert.deepEqual(ticEmission.payload, tickData);

    const tickEmission = mock.rootEmissions.find((e) => e.event === "race:betting_closed_tick");
    assert.ok(tickEmission, "Must emit race:betting_closed_tick");

    const closedEmission = mock.rootEmissions.find((e) => e.event === "race:betting_closed");
    assert.ok(closedEmission, "Must emit race:betting_closed");
    service.stop();
  });

  test("horseRace engine in-memory fallback creates active race and returns 12 horses", async () => {
    await raceEngine.startInMemoryRaceCycle();
    const state = raceEngine.getCurrentState();

    assert.equal(state.active, true);
    assert.equal(state.status, "BETTING_OPEN");
    assert.ok(state.gameSerial);
    assert.equal(state.horses.length, 12);
    assert.equal(state.horses[0].name, "Thunder Bolt");
    assert.equal(state.horses[11].name, "Victory Spirit");
    raceEngine.stop();
  });

  test("horseRace engine allows setting forced winner during BETTING_OPEN, BETTING_CLOSED, and COUNTDOWN", async () => {
    await raceEngine.startInMemoryRaceCycle();
    const serial = raceEngine.currentRace.game_serial;

    // 1. In BETTING_OPEN
    let res = await raceEngine.setForcedWinner({ gameSerial: serial, horseSerial: 5, reason: "Test winner during betting open" });
    assert.equal(res.success, true);
    assert.equal(raceEngine.forcedCurrentWinner.horseSerial, 5);

    // 2. In BETTING_CLOSED
    raceEngine.currentRace.status = "BETTING_CLOSED";
    res = await raceEngine.setForcedWinner({ gameSerial: serial, horseSerial: 7, reason: "Test winner during betting closed" });
    assert.equal(res.success, true);
    assert.equal(raceEngine.forcedCurrentWinner.horseSerial, 7);

    // 3. In COUNTDOWN
    raceEngine.currentRace.status = "COUNTDOWN";
    res = await raceEngine.setForcedWinner({ gameSerial: serial, horseSerial: 9, reason: "Test winner during countdown" });
    assert.equal(res.success, true);
    assert.equal(raceEngine.forcedCurrentWinner.horseSerial, 9);

    raceEngine.stop();
  });

  test("live track simulation keeps forced winner horse in 1st place (Rank 1) ahead of all other horses", async () => {
    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    await raceEngine.startInMemoryRaceCycle();
    const serial = raceEngine.currentRace.game_serial;
    const targetHorseSerial = 4; // Horse #4 forced to win

    const res = await raceEngine.setForcedWinner({ gameSerial: serial, horseSerial: targetHorseSerial, reason: "Test winner horse 4" });
    assert.equal(res.success, true);

    const raceState = raceEngine.getCurrentState();
    raceState.status = "RUNNING";

    // Run a short live simulation
    service.startLiveRunningTrackSimulation(raceState);

    // Collect track update emissions
    await new Promise((resolve) => setTimeout(resolve, 350));

    service.stop();
    raceEngine.stop();

    const trackUpdates = mock.rootEmissions.filter((e) => e.event === "race:track_update");
    assert.ok(trackUpdates.length > 0, "Must have generated track updates");

    // Verify across all emitted ticks that the forced horse is Rank 1 and leading
    for (const update of trackUpdates) {
      const payload = update.payload;
      const horses = payload.horses;
      assert.equal(horses.length, 12);

      const winnerHorse = horses.find((h) => h.serialNumber === targetHorseSerial);
      assert.ok(winnerHorse, "Winner horse must be present in simulation");
      assert.equal(winnerHorse.currentRank, 1, `Horse #${targetHorseSerial} must be Rank 1`);
      assert.equal(winnerHorse.gapToLeaderM, 0, "Leader gap must be 0 for winner");
      assert.equal(winnerHorse.status, "LEADING");
      assert.equal(winnerHorse.isWinner, true);

      // All other horses must be strictly behind the winner
      for (const h of horses) {
        if (h.serialNumber !== targetHorseSerial) {
          assert.ok(h.currentDistanceM < winnerHorse.currentDistanceM,
            `Non-winner horse #${h.serialNumber} (${h.currentDistanceM}M) must be behind winner #${targetHorseSerial} (${winnerHorse.currentDistanceM}M)`);
          assert.ok(h.currentRank > 1, `Non-winner horse #${h.serialNumber} must have rank > 1`);
          assert.equal(h.isWinner, false);
        }
      }
    }
  });

  test("full race simulation reaches 1000M for forced winner with non-winners finishing behind", () => {
    const service = new SocketService();
    const horses = [
      { id: 1, serialNumber: 1, name: "Horse 1" },
      { id: 2, serialNumber: 2, name: "Horse 2" },
      { id: 3, serialNumber: 3, name: "Horse 3" },
      { id: 4, serialNumber: 4, name: "Horse 4" },
      { id: 5, serialNumber: 5, name: "Horse 5" },
      { id: 6, serialNumber: 6, name: "Horse 6" },
      { id: 7, serialNumber: 7, name: "Horse 7" },
      { id: 8, serialNumber: 8, name: "Horse 8" },
      { id: 9, serialNumber: 9, name: "Horse 9" },
      { id: 10, serialNumber: 10, name: "Horse 10" },
      { id: 11, serialNumber: 11, name: "Horse 11" },
      { id: 12, serialNumber: 12, name: "Horse 12" },
    ];

    // Force winner Horse 6
    raceEngine.forcedCurrentWinner = {
      gameSerial: "20261026999",
      horseSerial: 6,
      horseId: 6,
      horseName: "Horse 6",
    };

    const raceState = {
      id: 999,
      gameSerial: "20261026999",
      status: "RUNNING",
      horses,
    };

    const mock = createSocketIoMock();
    service.initialize(mock.io);

    service.startLiveRunningTrackSimulation(raceState);

    // Directly check that simulations map contains the forced winner
    const sim = service.horseLiveSimulations.get(6);
    assert.ok(sim);

    service.stop();
    raceEngine.forcedCurrentWinner = null;
  });

  test("live track simulation: horses start together for first 2-3s, separate mid-race, and winner finishes 1000M alone", async () => {
    const service = new SocketService();
    const horses = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      serialNumber: i + 1,
      name: `Horse #${i + 1}`,
    }));

    raceEngine.forcedCurrentWinner = {
      gameSerial: "20261028777",
      horseSerial: 5,
      horseId: 5,
      horseName: "Midnight Star",
    };

    const raceState = {
      id: 777,
      gameSerial: "20261028777",
      status: "RUNNING",
      horses,
    };

    const mock = createSocketIoMock();
    service.initialize(mock.io);

    service.startLiveRunningTrackSimulation(raceState);

    // Initial frame emission
    const initialUpdate = mock.rootEmissions.find((e) => e.event === "race:track_update");
    assert.ok(initialUpdate, "Initial track update emitted");
    const initHorses = initialUpdate.payload.horses;
    assert.equal(initHorses.length, 12);

    // At the start (0-2s), all horses are grouped tightly together (gap < 1.0M)
    const winnerHorse = initHorses.find((h) => h.serialNumber === 5);
    for (const h of initHorses) {
      const gap = Math.abs(winnerHorse.currentDistanceM - h.currentDistanceM);
      assert.ok(gap <= 1.0, `Initial gap (${gap}M) between horse #${h.serialNumber} and winner must be <= 1.0M`);
    }

    service.stop();
    raceEngine.forcedCurrentWinner = null;
  });

  test("setForcedWinner flexibly accepts primitive number, string, and all payload alias formats", async () => {
    await raceEngine.startInMemoryRaceCycle();

    // 1. Plain number
    let res = await raceEngine.setForcedWinner(3);
    assert.equal(res.success, true);
    assert.equal(raceEngine.forcedCurrentWinner.horseSerial, 3);

    // 2. Plain string
    res = await raceEngine.setForcedWinner("7");
    assert.equal(res.success, true);
    assert.equal(raceEngine.forcedCurrentWinner.horseSerial, 7);

    // 3. Object with { horse: 2 }
    res = await raceEngine.setForcedWinner({ horse: 2 });
    assert.equal(res.success, true);
    assert.equal(raceEngine.forcedCurrentWinner.horseSerial, 2);

    // 4. Object with { serial_number: 9 }
    res = await raceEngine.setForcedWinner({ serial_number: 9 });
    assert.equal(res.success, true);
    assert.equal(raceEngine.forcedCurrentWinner.horseSerial, 9);

    // 5. Object with { winner: 11 }
    res = await raceEngine.setForcedWinner({ winner: 11 });
    assert.equal(res.success, true);
    assert.equal(raceEngine.forcedCurrentWinner.horseSerial, 11);

    raceEngine.stop();
  });

  test("calculateAndPersistRaceResult strictly sets finish_position: 1 for forced winner", async () => {
    await raceEngine.startInMemoryRaceCycle();
    const serial = raceEngine.currentRace.game_serial;

    // Force horse #8
    await raceEngine.setForcedWinner({ gameSerial: serial, horseSerial: 8 });

    // Transition to RESULT
    await raceEngine.calculateAndPersistRaceResult();

    const resultHorses = raceEngine.currentHorses;
    assert.equal(resultHorses.length, 12);

    // First horse in result must be Horse #8 with finish_position 1 and WINNER
    assert.equal(resultHorses[0].serial_number, 8);
    assert.equal(resultHorses[0].finish_position, 1);
    assert.equal(resultHorses[0].result, "WINNER");

    // All other 11 horses must have finish_position > 1
    for (let i = 1; i < resultHorses.length; i++) {
      assert.notEqual(resultHorses[i].serial_number, 8);
      assert.equal(resultHorses[i].finish_position, i + 1);
      assert.notEqual(resultHorses[i].result, "WINNER");
    }

    raceEngine.stop();
  });

  test("raceEngine records bets in-memory and reflects amounts in getCurrentState and getHorseBetsPool", async () => {
    await raceEngine.startInMemoryRaceCycle();

    // Place bets on Horse 3 (₹200) and Horse 7 (₹500)
    raceEngine.recordBets([
      { horseSerial: 3, amount: 200 },
      { horseSerial: 7, amount: 500 },
    ]);

    const pool = raceEngine.getHorseBetsPool();
    assert.equal(pool.totalPot, 700);

    const h3 = pool.horses.find((h) => h.serialNumber === 3);
    const h7 = pool.horses.find((h) => h.serialNumber === 7);
    const h1 = pool.horses.find((h) => h.serialNumber === 1);

    assert.equal(h3.totalBetsAmount, 200);
    assert.equal(h3.totalBets, 200);
    assert.equal(h7.totalBetsAmount, 500);
    assert.equal(h7.totalBets, 500);
    assert.equal(h1.totalBetsAmount, 0);

    // Verify getCurrentState also reflects bet breakdown
    const state = raceEngine.getCurrentState();
    assert.equal(state.totalPot, 700);
    const stateH3 = state.horses.find((h) => h.serialNumber === 3);
    const stateH7 = state.horses.find((h) => h.serialNumber === 7);
    assert.equal(stateH3.totalBetsAmount, 200);
    assert.equal(stateH7.totalBetsAmount, 500);

    // Remove partial bet from Horse 7 (₹200 refund)
    raceEngine.removeBet(7, 200);
    const poolAfterRefund = raceEngine.getHorseBetsPool();
    assert.equal(poolAfterRefund.totalPot, 500);
    const h7After = poolAfterRefund.horses.find((h) => h.serialNumber === 7);
    assert.equal(h7After.totalBetsAmount, 300);

    raceEngine.stop();
  });

  test("socketService broadcasts bet:live and race:bet_pool_update with per-horse breakdown and totals", async () => {
    await raceEngine.startInMemoryRaceCycle();
    const service = new SocketService();
    const mock = createSocketIoMock();
    service.initialize(mock.io);

    // Record a bet
    raceEngine.recordBets([{ horseSerial: 5, amount: 250 }]);

    service.broadcastLiveBet({
      id: 101,
      userId: 1,
      username: 'gamer99',
      raceId: 1,
      gameSerial: '20261026001',
      horseSerial: 5,
      horseName: 'Shadow Blaze',
      amount: 250,
      odds: 10,
    });

    const liveBetEmissions = mock.rootEmissions.filter((e) => e.event === 'bet:live');
    assert.ok(liveBetEmissions.length > 0);
    const liveBet = liveBetEmissions[0].payload;
    assert.equal(liveBet.horseSerial, 5);
    assert.equal(liveBet.amount, 250);
    assert.equal(liveBet.totalHorseBetAmount, 250);
    assert.equal(liveBet.totalPot, 250);
    assert.ok(Array.isArray(liveBet.horses));
    assert.equal(liveBet.horses.length, 12);

    const poolEmissions = mock.rootEmissions.filter((e) => e.event === 'race:bet_pool_update');
    assert.ok(poolEmissions.length > 0);
    const pool = poolEmissions[0].payload;
    assert.equal(pool.totalPot, 250);
    const h5 = pool.horses.find((h) => h.serialNumber === 5);
    assert.equal(h5.totalBetsAmount, 250);

    service.stop();
    raceEngine.stop();
  });

  test("client receives bet:live on connection with horses pool breakdown", async () => {
    await raceEngine.startInMemoryRaceCycle();
    raceEngine.recordBets([{ horseSerial: 4, amount: 150 }]);

    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    const clientEmissions = [];
    const clientHandlers = new Map();
    const clientSocket = {
      id: "client-root-test",
      handshake: {},
      join() { },
      emit(event, payload) {
        clientEmissions.push({ event, payload });
      },
      on(event, handler) {
        clientHandlers.set(event, handler);
      },
    };

    await mock.rootHandlers.get("connection")(clientSocket);

    // Verify bet:live was emitted on connection with 12 horses
    const liveEmission = clientEmissions.find((e) => e.event === "bet:live");
    assert.ok(liveEmission, "Must emit bet:live on client connection");
    assert.equal(liveEmission.payload.success, true);
    assert.equal(liveEmission.payload.totalPot, 150);
    assert.ok(Array.isArray(liveEmission.payload.horses));
    assert.equal(liveEmission.payload.horses.length, 12);
    const h4 = liveEmission.payload.horses.find((h) => h.serialNumber === 4);
    assert.equal(h4.totalBetsAmount, 150);

    service.stop();
    raceEngine.stop();
  });

  test("client emits bet:live and receives per-horse amounts in callback and socket emit", async () => {
    await raceEngine.startInMemoryRaceCycle();
    raceEngine.recordBets([{ horseSerial: 2, amount: 300 }]);

    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    const clientEmissions = [];
    const clientHandlers = new Map();
    const clientSocket = {
      id: "client-root-2",
      handshake: {},
      join() { },
      emit(event, payload) {
        clientEmissions.push({ event, payload });
      },
      on(event, handler) {
        clientHandlers.set(event, handler);
      },
    };

    await mock.rootHandlers.get("connection")(clientSocket);

    let callbackResult = null;
    await clientHandlers.get("bet:live")({}, (res) => {
      callbackResult = res;
    });

    assert.ok(callbackResult, "Callback must be invoked");
    assert.equal(callbackResult.success, true);
    assert.equal(callbackResult.totalPot, 300);
    const h2 = callbackResult.horses.find((h) => h.serialNumber === 2);
    assert.equal(h2.totalBetsAmount, 300);

    // Also check socket.emit('bet:live') was called
    const liveEmits = clientEmissions.filter((e) => e.event === "bet:live");
    assert.ok(liveEmits.length >= 2); // Initial on connect + explicit request
    const lastEmit = liveEmits[liveEmits.length - 1];
    assert.equal(lastEmit.payload.totalPot, 300);

    service.stop();
    raceEngine.stop();
  });

  test("client emits bet:place and receives response on bet:place event and callback with horse info", async () => {
    await raceEngine.startInMemoryRaceCycle();
    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    const clientEmissions = [];
    const clientHandlers = new Map();
    const clientSocket = {
      id: "client-root-3",
      handshake: {},
      join() { },
      emit(event, payload) {
        clientEmissions.push({ event, payload });
      },
      on(event, handler) {
        clientHandlers.set(event, handler);
      },
    };

    await mock.rootHandlers.get("connection")(clientSocket);

    // If userId missing, returns error response on bet:place
    let errorRes = null;
    await clientHandlers.get("bet:place")({ horseSerial: 3, amount: 50 }, (res) => {
      errorRes = res;
    });
    assert.equal(errorRes.success, false);
    assert.equal(errorRes.error, "User ID is required");

    const errorEmit = clientEmissions.find((e) => e.event === "bet:place" && e.payload.success === false);
    assert.ok(errorEmit, "Must emit bet:place error event to socket");

    // Also verify bet:cancel emits error response when unauthenticated
    let cancelErrorRes = null;
    await clientHandlers.get("bet:cancel")({ horseSerial: 3, amount: 50 }, (res) => {
      cancelErrorRes = res;
    });
    assert.equal(cancelErrorRes.success, false);
    const cancelErrorEmit = clientEmissions.find((e) => e.event === "bet:cancel" && e.payload.success === false);
    assert.ok(cancelErrorEmit, "Must emit bet:cancel error event to socket");

    service.stop();
    raceEngine.stop();
  });

  test("horseRace engine serial number increments sequentially and never stays on one number", async () => {
    raceEngine.stop();
    await raceEngine.startInMemoryRaceCycle();
    const firstState = raceEngine.getCurrentState();
    const firstSerial = firstState.gameSerial;
    assert.ok(firstSerial, "First race must have gameSerial");
    assert.equal(firstState.game_serial, firstSerial);
    assert.equal(firstState.games_no, firstSerial);
    assert.equal(firstState.period, firstSerial);

    await raceEngine.startInMemoryRaceCycle();
    const secondState = raceEngine.getCurrentState();
    const secondSerial = secondState.gameSerial;
    assert.ok(secondSerial, "Second race must have gameSerial");
    assert.notEqual(secondSerial, firstSerial, "Second race serial number must change and not remain the same");
    assert.ok(Number(secondSerial) > Number(firstSerial), "Second race serial number must be greater than first");

    await raceEngine.startInMemoryRaceCycle();
    const thirdState = raceEngine.getCurrentState();
    const thirdSerial = thirdState.gameSerial;
    assert.notEqual(thirdSerial, secondSerial, "Third race serial number must change and increment");
    assert.ok(Number(thirdSerial) > Number(secondSerial), "Third race serial number must be strictly greater than second");

    raceEngine.stop();
  });

  test("mock DB generateGameSerial generates strictly incrementing serials", async () => {
    const fakeDb = {
      execute: async () => [
        [{ game_serial: "20261027005" }]
      ],
    };

    raceEngine.stop();
    raceEngine.roundCounter = 0;
    raceEngine.currentRace = null;
    const serial1 = await raceEngine.generateGameSerial(fakeDb);
    assert.equal(serial1.slice(8), "006");

    fakeDb.execute = async () => [
      [{ game_serial: serial1 }]
    ];
    const serial2 = await raceEngine.generateGameSerial(fakeDb);
    assert.equal(serial2.slice(8), "007");
    assert.notEqual(serial1, serial2);
  });

  test("raceEngine runBettingOpenSequence emits race:betting_open_tick and race:tick", async () => {
    raceEngine.stop();
    await raceEngine.startInMemoryRaceCycle();
    
    let receivedTick = null;
    raceEngine.once("race:betting_open_tick", (tick) => {
      receivedTick = tick;
    });

    // Manually run a short 2000ms sequence
    raceEngine.runBettingOpenSequence(2000);
    assert.ok(raceEngine.bettingOpenTimers.length > 0, "Must create betting open timers");

    // Wait 60ms for first tick at 0ms delay
    await new Promise((r) => setTimeout(r, 60));
    assert.ok(receivedTick, "Must emit race:betting_open_tick");
    assert.equal(receivedTick.stage, "BETTING_OPEN");
    assert.ok(receivedTick.secondsRemaining > 0);

    raceEngine.stop();
  });

  test("horseRace socket client receives state and responds to race:state and bet:live aliases", async () => {
    const mock = createSocketIoMock();
    const service = new SocketService();
    service.initialize(mock.io);

    const clientEmissions = [];
    const clientHandlers = new Map();
    const clientSocket = {
      id: "client-test-all-events",
      handshake: {},
      join() { },
      emit(event, payload) {
        clientEmissions.push({ event, payload });
      },
      on(event, handler) {
        clientHandlers.set(event, handler);
      },
    };

    mock.rootHandlers.get("connection")(clientSocket);

    // Verify events received upon connection
    const eventsReceived = clientEmissions.map((e) => e.event);
    assert.ok(eventsReceived.includes("race:current_state"), "Must receive race:current_state");
    assert.ok(eventsReceived.includes("race:state"), "Must receive race:state");
    assert.ok(eventsReceived.includes("bet:live"), "Must receive bet:live");
    assert.ok(eventsReceived.includes("race:bet_pool_update"), "Must receive race:bet_pool_update");

    // Test client emitting race:state
    assert.ok(clientHandlers.has("race:state"), "Must listen to race:state");
    let stateResult;
    clientHandlers.get("race:state")({}, (res) => {
      stateResult = res;
    });
    assert.ok(stateResult, "Callback must receive state");
    assert.ok(stateResult.gameSerial, "State must contain gameSerial");

    // Test client emitting bet:live
    assert.ok(clientHandlers.has("bet:live"), "Must listen to bet:live");
    let liveResult;
    await clientHandlers.get("bet:live")({}, (res) => {
      liveResult = res;
    });
    assert.ok(liveResult, "Callback must receive bet:live response");
    assert.equal(liveResult.success, true);
    assert.ok(Array.isArray(liveResult.horses));
    assert.equal(liveResult.horses.length, 12);

    service.stop();
  });





