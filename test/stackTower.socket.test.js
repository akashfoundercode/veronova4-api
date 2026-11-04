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

  // 2. Join Round
  client.trigger("join_round", { round_id: "ST_TEST_101", userid: 5 });
  assert.ok(client.joinedRooms.has("round:ST_TEST_101"));
  assert.ok(client.joinedRooms.has("user:5"));

  // 3. Player stacks block live
  client.trigger("stack_block", { round_id: "ST_TEST_101", level: 4, multiplier: 1.72 });
  const roomEvents = harness.roomEmissions.get("round:ST_TEST_101") || [];
  assert.ok(roomEvents.some((e) => e.event === "block_stacked" && e.payload.level === 4));

  socketService.stop();
});

test("Stack Tower Socket - Admin Force Stop / Obstacle Drop", async () => {
  const harness = createMockSocketHarness();
  const service = new StackTowerService();

  // Create an active bet in service first
  const betRes = await service.placeBet({ userid: 8, amount: 150, difficulty: "HARD" });
  const roundId = betRes.data.round_id;

  const socketService = createStackTowerSocket(harness.io, { service, logger: { log() {}, error() {} } });
  const adminClient = harness.createClientSocket();
  harness.namespace.trigger("connection", adminClient);

  // Admin triggers force_stop / admin_drop_obstacle over socket
  await adminClient.trigger("force_stop", {
    round_id: roundId,
    userid: 8,
    obstacle_type: "METEOR",
    level: 6,
  });

  // Verify ack sent back to admin socket
  const adminEmits = adminClient.getClientEmits();
  const ack = adminEmits.find((e) => e.event === "obstacle_drop_ack");
  assert.ok(ack, "Admin should receive obstacle_drop_ack");
  assert.equal(ack.payload.success, true);
  assert.equal(ack.payload.data.status, "OBSTACLE_DROPPED");
  assert.equal(ack.payload.data.obstacle_type, "METEOR");

  // Verify room broadcasted
  const roundRoomEvents = harness.roomEmissions.get(`round:${roundId}`) || [];
  assert.ok(roundRoomEvents.some((e) => e.event === "obstacle_dropped" && e.payload.obstacle_type === "METEOR"));

  // Verify global namespace broadcasted
  assert.ok(harness.globalEmissions.some((e) => e.event === "obstacle_dropped"));

  // Verify that subsequent cashout on this round fails because it was toppled
  await assert.rejects(
    async () => {
      await service.cashout({ userid: 8, round_id: roundId, level: 6, multiplier: 2.1 });
    },
    /obstacle/i
  );

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
  assert.equal(ack.payload.data.obstacle_dropped, true);

  // Verify that obstacle_dropped was broadcasted to namespace
  assert.ok(harness.globalEmissions.some((e) => e.event === "obstacle_dropped"));

  socketService.stop();
  console.log("✅ ALL STACK TOWER SOCKET TESTS PASSED SUCCESSFULLY!");
});

