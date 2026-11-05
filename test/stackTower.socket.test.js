"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createStackTowerSocket, getStackTowerSocket } = require("../src/modules/stackTower/stackTower.socket");
const { StackTowerService } = require("../src/modules/stackTower/stackTower.service");

function createMockSocketHarness() {
  const namespaceHandlers = new Map();
  const roomEmissions = new Map(); // room -> [{ event, payload }]
  const globalEmissions = [];

  const createClientSocket = () => {
    const clientHandlers = new Map();
    const clientEmits = [];
    const joinedRooms = new Set();

    return {
      joinedRooms,
      on(event, fn) {
        clientHandlers.set(event, fn);
      },
      emit(event, payload) {
        clientEmits.push({ event, payload });
      },
      join(room) {
        joinedRooms.add(room);
      },
      leave(room) {
        joinedRooms.delete(room);
      },
      trigger(event, data) {
        const handler = clientHandlers.get(event);
        if (handler) return handler(data);
      },
      getClientEmits() {
        return clientEmits;
      },
    };
  };

  const namespace = {
    on(event, handler) {
      namespaceHandlers.set(event, handler);
    },
    emit(event, payload) {
      globalEmissions.push({ event, payload });
    },
    to(room) {
      return {
        emit(event, payload) {
          const list = roomEmissions.get(room) || [];
          list.push({ event, payload });
          roomEmissions.set(room, list);
        },
      };
    },
    trigger(event, client) {
      const handler = namespaceHandlers.get(event);
      if (handler) return handler(client);
    },
  };

  const io = {
    of(path) {
      return namespace;
    },
    emit(event, payload) {
      globalEmissions.push({ event, payload });
    },
  };

  return {
    io,
    namespace,
    createClientSocket,
    roomEmissions,
    globalEmissions,
  };
}

test("Stack Tower Socket - Connection, Room Management & Live Updates", async () => {
  const harness = createMockSocketHarness();
  const service = new StackTowerService();
  const socketService = createStackTowerSocket(harness.io, { service, logger: { log() {}, error() {} } });

  assert.ok(socketService, "Socket service must be initialized");
  assert.equal(getStackTowerSocket(), socketService, "Singleton must be registered");

  const client = harness.createClientSocket();
  harness.namespace.trigger("connection", client);

  // 1. Connection initial ack received
  const emits = client.getClientEmits();
  assert.equal(emits[0].event, "stack_tower_connected");

  // 2. Join Round - returns user's active round info
  await client.trigger("join_round", { round_id: "ST_TEST_101", userid: 5, amount: 200, difficulty: "HARD" });
  assert.ok(client.joinedRooms.has("round:ST_TEST_101"));
  assert.ok(client.joinedRooms.has("user:5"));

  const joinedEmit = emits.find((e) => e.event === "joined_round");
  assert.ok(joinedEmit, "Player must receive joined_round ack response");
  assert.equal(joinedEmit.payload.round_id, "ST_TEST_101");
  assert.equal(joinedEmit.payload.difficulty, "HARD");
  assert.equal(joinedEmit.payload.status, "PLAYING");

  // 3. Player stacks block live
  await client.trigger("stack_block", { round_id: "ST_TEST_101", level: 4, multiplier: 1.72 });
  const roomEvents = harness.roomEmissions.get("round:ST_TEST_101") || [];
  assert.ok(roomEvents.some((e) => e.event === "block_stacked" && e.payload.level === 4));

  socketService.stop();
});

test("Stack Tower Socket - Admin Force Stop arms and topples on user's NEXT block drop", async () => {
  const harness = createMockSocketHarness();
  const service = new StackTowerService();

  // Create an active bet in service first
  const betRes = await service.placeBet({ userid: 8, amount: 150, difficulty: "HARD" });
  const roundId = betRes.data.round_id;

  const socketService = createStackTowerSocket(harness.io, { service, logger: { log() {}, error() {} } });
  const adminClient = harness.createClientSocket();
  const playerClient = harness.createClientSocket();
  harness.namespace.trigger("connection", adminClient);
  harness.namespace.trigger("connection", playerClient);

  playerClient.trigger("join_round", { round_id: roundId, userid: 8 });

  // 1. Admin triggers force_stop over socket (defaults to NEXT_BLOCK trigger)
  await adminClient.trigger("force_stop", {
    round_id: roundId,
    userid: 8,
    obstacle_type: "METEOR",
    level: 6,
  });

  // Verify ack sent back to admin socket showing it is ARMED
  const adminEmits = adminClient.getClientEmits();
  const ack = adminEmits.find((e) => e.event === "obstacle_drop_ack");
  assert.ok(ack, "Admin should receive obstacle_drop_ack");
  assert.equal(ack.payload.success, true);
  assert.equal(ack.payload.data.armed, true);
  assert.equal(ack.payload.data.trigger, "NEXT_BLOCK");

  // Verify obstacle_armed event broadcasted to room
  const roundRoomEvents = harness.roomEmissions.get(`round:${roundId}`) || [];
  assert.ok(roundRoomEvents.some((e) => e.event === "obstacle_armed"));

  // 2. WHILE USER HAS NOT DROPPED A BLOCK, THE TOWER DOES NOT FALL!
  assert.ok(!roundRoomEvents.some((e) => e.event === "obstacle_dropped"), "Tower must NOT collapse before user drops block");

  // 3. User now taps/drops the NEXT block!
  await playerClient.trigger("stack_block", {
    round_id: roundId,
    userid: 8,
    level: 6,
    multiplier: 2.1,
  });

  // 4. NOW THAT USER DROPPED THE BLOCK, THE TOWER TOPPLES!
  const roundRoomEventsAfter = harness.roomEmissions.get(`round:${roundId}`) || [];
  assert.ok(roundRoomEventsAfter.some((e) => e.event === "obstacle_dropped" && e.payload.toppled === true));
  console.log("✅ Tower successfully waited and only toppled when user dropped the next block!");

  // Verify that cashout fails
  await assert.rejects(
    async () => {
      await service.cashout({ userid: 8, round_id: roundId, level: 6, multiplier: 2.1 });
    },
    /obstacle/i
  );

  socketService.stop();
});

test("Stack Tower Socket - Immediate force drop when immediate: true", async () => {
  const harness = createMockSocketHarness();
  const service = new StackTowerService();
  const betRes = await service.placeBet({ userid: 9, amount: 100, difficulty: "EASY" });
  const roundId = betRes.data.round_id;

  const socketService = createStackTowerSocket(harness.io, { service, logger: { log() {}, error() {} } });
  const adminClient = harness.createClientSocket();
  harness.namespace.trigger("connection", adminClient);

  await adminClient.trigger("force_stop", {
    round_id: roundId,
    userid: 9,
    immediate: true,
  });

  const adminEmits = adminClient.getClientEmits();
  const ack = adminEmits.find((e) => e.event === "obstacle_drop_ack");
  assert.ok(ack);
  assert.equal(ack.payload.success, true);
  assert.equal(ack.payload.data.status, "OBSTACLE_DROPPED");

  socketService.stop();
});

test("Stack Tower Socket - Admin Force Stop without active bet still succeeds and broadcasts", async () => {
  const harness = createMockSocketHarness();
  const service = new StackTowerService();
  const socketService = createStackTowerSocket(harness.io, { service, logger: { log() {}, error() {} } });

  const adminClient = harness.createClientSocket();
  harness.namespace.trigger("connection", adminClient);

  // Admin triggers force_stop with NO active bet in system
  await adminClient.trigger("force_stop", {});

  const adminEmits = adminClient.getClientEmits();
  const ack = adminEmits.find((e) => e.event === "obstacle_drop_ack");
  assert.ok(ack, "Admin should receive obstacle_drop_ack even when no bet exists");
  assert.equal(ack.payload.success, true);
  assert.equal(ack.payload.data.armed, true);

  // Verify that obstacle_armed was broadcasted to namespace
  assert.ok(harness.globalEmissions.some((e) => e.event === "obstacle_armed"));

  socketService.stop();
});

test("Stack Tower Socket - Complete Admin Live Monitoring & Force Drop Flow", async () => {
  const harness = createMockSocketHarness();
  const service = new StackTowerService();
  const socketService = createStackTowerSocket(harness.io, { service, logger: { log() {}, error() {} } });

  // 1. User places a bet of 250 in HARD mode
  const betRes = await service.placeBet({ userid: 12, amount: 250, difficulty: "HARD" });
  const roundId = betRes.data.round_id;
  assert.equal(betRes.data.bet_amount, 250);
  assert.equal(betRes.data.difficulty, "HARD");

  // 2. User connects to socket and joins round
  const userClient = harness.createClientSocket();
  harness.namespace.trigger("connection", userClient);
  await userClient.trigger("join_round", { round_id: roundId, userid: 12 });

  const userEmits = userClient.getClientEmits();
  const joinedEvent = userEmits.find((e) => e.event === "joined_round");
  assert.ok(joinedEvent, "User must receive joined_round");
  assert.equal(joinedEvent.payload.round_id, roundId);
  assert.equal(joinedEvent.payload.bet_amount, 250);
  assert.equal(joinedEvent.payload.difficulty, "HARD");
  assert.equal(joinedEvent.payload.status, "PLAYING");

  // 3. Admin joins admin room and receives live active players list
  const adminClient = harness.createClientSocket();
  harness.namespace.trigger("connection", adminClient);
  await adminClient.trigger("admin_join", {});

  const adminEmits = adminClient.getClientEmits();
  const activeListEvent = adminEmits.find((e) => e.event === "active_players_list");
  assert.ok(activeListEvent, "Admin must receive active_players_list");
  assert.ok(activeListEvent.payload.players.length >= 1, "Player must appear in admin active list");
  const playerInAdminList = activeListEvent.payload.players.find((p) => p.round_id === roundId);
  assert.ok(playerInAdminList);
  assert.equal(playerInAdminList.bet_amount, 250);
  assert.equal(playerInAdminList.difficulty, "HARD");

  // 4. User builds floors: Floor 1, 2, 3, 4
  for (let floor = 1; floor <= 4; floor++) {
    await userClient.trigger("stack_block", {
      round_id: roundId,
      userid: 12,
      level: floor,
      multiplier: Number((1.0 + floor * 0.35).toFixed(2)),
    });
  }

  // Verify room received floor 4
  const roundRoomEvents = harness.roomEmissions.get(`round:${roundId}`) || [];
  const latestFloorEvent = roundRoomEvents.filter((e) => e.event === "block_stacked").pop();
  assert.equal(latestFloorEvent.payload.level, 4);

  // 5. Admin triggers force_stop for this player's round
  await adminClient.trigger("force_stop", { round_id: roundId });

  // 6. User drops NEXT floor (Floor 5) -> Tower TOPPLES!
  await userClient.trigger("stack_block", {
    round_id: roundId,
    userid: 12,
    level: 5,
    multiplier: 2.75,
  });

  // Verify tower toppled
  const toppledEvents = (harness.roomEmissions.get(`round:${roundId}`) || []).filter(
    (e) => e.event === "obstacle_dropped"
  );
  assert.ok(toppledEvents.length > 0, "Tower must topple on user's next block drop");
  assert.equal(toppledEvents[0].payload.toppled, true);
  assert.equal(toppledEvents[0].payload.payout, 0);

  socketService.stop();
  console.log("✅ Complete Admin Live Monitoring & Force Drop Flow tested and passed!");
  console.log("✅ ALL STACK TOWER SOCKET TESTS PASSED SUCCESSFULLY!");
});

