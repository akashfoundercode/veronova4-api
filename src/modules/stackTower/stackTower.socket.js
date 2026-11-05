"use strict";

const { API_ROUTES } = require("../../config/apiRoutes");
const { StackTowerService } = require("./stackTower.service");

let activeStackTowerSocketInstance = null;

function getStackTowerSocket() {
  return activeStackTowerSocketInstance;
}

/**
 * Real-time WebSocket Handler for Stack Tower
 * Manages live block stacking, rooms, and instant Admin Force Stop / Obstacle Drops
 */
function createStackTowerSocket(io, {
  service = new StackTowerService(),
  logger = console,
} = {}) {
  if (!io) return null;

  const namespacePath = API_ROUTES?.stackTower?.socketNamespace || "/stack-tower";
  const namespace = typeof io.of === "function" ? io.of(namespacePath) : io;

  const connectedSockets = new Set();
  let stopped = false;

  function broadcastObstacleDrop(dropData) {
    if (!dropData || stopped) return;
    const payload = typeof dropData === "object" ? dropData : { data: dropData };

    // 1. Emit to specific round room if round_id exists
    if (payload.round_id && namespace.to) {
      namespace.to(`round:${payload.round_id}`).emit("obstacle_dropped", payload);
      namespace.to(`round:${payload.round_id}`).emit("stack_tower_obstacle_dropped", payload);
      namespace.to(`round:${payload.round_id}`).emit("block_toppled", payload);
    }

    // 2. Emit to user room if user_id exists
    if (payload.user_id && namespace.to) {
      namespace.to(`user:${payload.user_id}`).emit("obstacle_dropped", payload);
      namespace.to(`user:${payload.user_id}`).emit("block_toppled", payload);
    }

    // 3. Emit to admin room
    if (namespace.to) {
      namespace.to("admin_room").emit("obstacle_dropped", payload);
      namespace.to("admin_room").emit("block_toppled", payload);
    }

    // 4. Broadcast to all clients in /stack-tower namespace
    if (typeof namespace.emit === "function") {
      namespace.emit("obstacle_dropped", payload);
      namespace.emit("stack_tower_obstacle_dropped", payload);
      namespace.emit("force_stop", payload);
      namespace.emit("game_over", payload);
      namespace.emit("toppled", payload);
      namespace.emit("block_toppled", payload);
    }

    // 5. Also broadcast to root io for full compatibility
    if (io && io !== namespace && typeof io.emit === "function") {
      try {
        io.emit("stack_tower_obstacle_dropped", payload);
        io.emit("obstacle_dropped", payload);
        io.emit("force_stop", payload);
        io.emit("game_over", payload);
        io.emit("toppled", payload);
        io.emit("block_toppled", payload);
      } catch (_) {}
    }

    logger.log(`[StackTowerSocket] ⚡ INSTANT OBSTACLE DROP BROADCASTED for round: ${payload.round_id || "ALL"}`);
  }

  function broadcastObstacleArmed(armData) {
    if (!armData || stopped) return;
    const payload = typeof armData === "object" ? armData : { data: armData };

    if (payload.round_id && namespace.to) {
      namespace.to(`round:${payload.round_id}`).emit("obstacle_armed", payload);
      namespace.to(`round:${payload.round_id}`).emit("force_stop_armed", payload);
    }
    if (payload.user_id && namespace.to) {
      namespace.to(`user:${payload.user_id}`).emit("obstacle_armed", payload);
      namespace.to(`user:${payload.user_id}`).emit("force_stop_armed", payload);
    }
    if (namespace.to) {
      namespace.to("admin_room").emit("obstacle_armed", payload);
      namespace.to("admin_room").emit("force_stop_armed", payload);
    }
    if (typeof namespace.emit === "function") {
      namespace.emit("obstacle_armed", payload);
      namespace.emit("force_stop_armed", payload);
    }
    if (io && io !== namespace && typeof io.emit === "function") {
      try {
        io.emit("obstacle_armed", payload);
        io.emit("force_stop_armed", payload);
      } catch (_) {}
    }

    logger.log(`[StackTowerSocket] 🎯 OBSTACLE ARMED (Will topple when user drops next block) for round: ${payload.round_id || "ALL"}`);
  }

  async function broadcastActivePlayers() {
    if (stopped) return;
    try {
      if (!service || typeof service.getActiveBets !== "function") return;
      const res = await service.getActiveBets({ status: 0, limit: 100 });
      const players = (res?.data || []).map((p) => ({
        ...p,
        armed: service?.isObstacleArmed ? service.isObstacleArmed(p.round_id, p.user_id) : false,
      }));

      const payload = {
        success: true,
        total: players.length,
        count: players.length,
        data: players,
        timestamp: Date.now(),
      };

      if (namespace.to) {
        namespace.to("admin_room").emit("active_players_update", payload);
      }
      if (typeof namespace.emit === "function") {
        namespace.emit("active_players_update", payload);
      }
      if (io && io !== namespace && typeof io.emit === "function") {
        try {
          io.emit("stack_tower_active_players", payload);
        } catch (_) {}
      }
    } catch (_) {}
  }

  function broadcastPlayerJoined(playerData) {
    if (!playerData || stopped) return;
    const payload = typeof playerData === "object" ? playerData : { data: playerData };

    if (namespace.to) {
      namespace.to("admin_room").emit("player_joined", payload);
    }
    if (typeof namespace.emit === "function") {
      namespace.emit("player_joined", payload);
    }
    if (io && io !== namespace && typeof io.emit === "function") {
      try {
        io.emit("stack_tower_player_joined", payload);
      } catch (_) {}
    }
    broadcastActivePlayers();
  }

  function broadcastPlayerCashedOut(cashoutData) {
    if (!cashoutData || stopped) return;
    const payload = typeof cashoutData === "object" ? cashoutData : { data: cashoutData };

    if (payload.round_id && namespace.to) {
      namespace.to(`round:${payload.round_id}`).emit("player_cashed_out", payload);
    }
    if (namespace.to) {
      namespace.to("admin_room").emit("player_cashed_out", payload);
    }
    if (typeof namespace.emit === "function") {
      namespace.emit("player_cashed_out", payload);
    }
    broadcastActivePlayers();
  }

  function broadcastPlayerGameOver(gameOverData) {
    if (!gameOverData || stopped) return;
    const payload = typeof gameOverData === "object" ? gameOverData : { data: gameOverData };

    if (payload.round_id && namespace.to) {
      namespace.to(`round:${payload.round_id}`).emit("player_game_over", payload);
    }
    if (namespace.to) {
      namespace.to("admin_room").emit("player_game_over", payload);
    }
    if (typeof namespace.emit === "function") {
      namespace.emit("player_game_over", payload);
    }
    broadcastActivePlayers();
  }

  function handleConnection(clientSocket) {
    if (!clientSocket) return;
    connectedSockets.add(clientSocket);

    // Initial connection ack
    if (typeof clientSocket.emit === "function") {
      clientSocket.emit("stack_tower_connected", {
        status: 200,
        message: "Connected to Stack Tower Real-time Socket Server",
        timestamp: Date.now(),
      });
    }

    if (typeof clientSocket.on !== "function") return;

    // 1. Join game round room
    const joinHandler = async (rawData = {}, callback) => {
      let data = rawData;
      if (typeof rawData === "string") {
        try { data = JSON.parse(rawData); } catch (_) { data = { round_id: rawData }; }
      }
      if (!data || typeof data !== "object") data = {};

      const roundId = data.round_id || data.roundId || data.id;
      const userId = data.userid || data.user_id || data.userId || data.uid;
      if (roundId && typeof clientSocket.join === "function") {
        clientSocket.join(`round:${roundId}`);
      }
      if (userId && typeof clientSocket.join === "function") {
        clientSocket.join(`user:${userId}`);
      }

      // Fetch round status/details to send back to client & admin
      let roundInfo = null;
      try {
        if (service && typeof service.getRoundStatus === "function") {
          const res = await service.getRoundStatus({ round_id: roundId, userid: userId });
          if (res?.data) roundInfo = res.data;
        }
      } catch (_) {}

      const mode = String(roundInfo?.difficulty || data.difficulty || data.mode || "MEDIUM").toUpperCase();
      const extraBonus = mode === "HARD" ? 0.35 : mode === "EASY" ? 0.10 : 0.20;
      const bonusText = mode === "HARD" ? "+0.35x Extra Bonus" : mode === "EASY" ? "+0.10x Extra Bonus" : "+0.20x Extra Bonus";

      const joinedPayload = {
        success: true,
        round_id: roundId,
        user_id: userId,
        bet_amount: Number(roundInfo?.amount || data.amount || data.bet_amount || 0),
        difficulty: mode,
        mode: mode,
        extra_bonus: extraBonus,
        bonus_multiplier: extraBonus,
        bonus_text: bonusText,
        current_level: Number(roundInfo?.current_level || data.level || 0),
        level: Number(roundInfo?.current_level || data.level || 0),
        multiplier: Number(roundInfo?.multiplier || data.multiplier || 1.0),
        status: roundInfo?.status || "PLAYING",
        timestamp: Date.now(),
        data: roundInfo,
      };

      if (typeof clientSocket.emit === "function") {
        clientSocket.emit("joined_round", joinedPayload);
      }
      if (typeof callback === "function") {
        callback(joinedPayload);
      }

      // Broadcast to admin room & global namespace that player joined
      if (namespace.to) {
        namespace.to("admin_room").emit("player_joined", joinedPayload);
      }
      if (typeof namespace.emit === "function") {
        namespace.emit("player_joined", joinedPayload);
      }
      broadcastActivePlayers();
    };

    clientSocket.on("join_round", joinHandler);
    clientSocket.on("join_game", joinHandler);

    // 2. Admin join room to monitor live active players
    const adminJoinHandler = async (rawData = {}, callback) => {
      if (typeof clientSocket.join === "function") {
        clientSocket.join("admin_room");
      }
      logger.log("[StackTowerSocket] 🛡️ Admin joined admin_room");

      let activeList = null;
      try {
        if (service && typeof service.getActiveBets === "function") {
          activeList = await service.getActiveBets({ status: 0, limit: 100 });
        }
      } catch (_) {}

      const players = (activeList?.data || []).map((p) => ({
        ...p,
        armed: service?.isObstacleArmed ? service.isObstacleArmed(p.round_id, p.user_id) : false,
      }));

      const adminAck = {
        success: true,
        message: "Joined Stack Tower Admin Room",
        players,
        data: players,
        total: players.length,
        count: players.length,
        timestamp: Date.now(),
      };

      if (typeof clientSocket.emit === "function") {
        clientSocket.emit("admin_joined", adminAck);
        clientSocket.emit("active_players_list", adminAck);
        clientSocket.emit("active_players_update", adminAck);
      }
      if (typeof callback === "function") {
        callback(adminAck);
      }
    };

    clientSocket.on("admin_join", adminJoinHandler);
    clientSocket.on("join_admin", adminJoinHandler);
    clientSocket.on("join_admin_room", adminJoinHandler);

    // 3. Admin requests current active players list
    clientSocket.on("get_active_players", async (rawData = {}, callback) => {
      let activeList = null;
      try {
        if (service && typeof service.getActiveBets === "function") {
          activeList = await service.getActiveBets({ status: 0, limit: 100 });
        }
      } catch (_) {}

      const players = (activeList?.data || []).map((p) => ({
        ...p,
        armed: service?.isObstacleArmed ? service.isObstacleArmed(p.round_id, p.user_id) : false,
      }));

      const payload = {
        success: true,
        total: players.length,
        count: players.length,
        data: players,
        players,
        timestamp: Date.now(),
      };

      if (typeof clientSocket.emit === "function") {
        clientSocket.emit("active_players_list", payload);
        clientSocket.emit("active_players_update", payload);
      }
      if (typeof callback === "function") {
        callback(payload);
      }
    });

    // 4. Leave game round room
    clientSocket.on("leave_round", (rawData = {}) => {
      let data = rawData;
      if (typeof rawData === "string") {
        try { data = JSON.parse(rawData); } catch (_) { data = { round_id: rawData }; }
      }
      if (!data || typeof data !== "object") data = {};

      const roundId = data.round_id || data.roundId || data.id;
      if (roundId && typeof clientSocket.leave === "function") {
        clientSocket.leave(`round:${roundId}`);
      }
    });

    // 5. Real-time block stacked update from player (Floor 1, 2, 3, 4, 5...)
    clientSocket.on("stack_block", async (rawData = {}, callback) => {
      let data = rawData;
      if (typeof rawData === "string") {
        try { data = JSON.parse(rawData); } catch (_) { data = {}; }
      }
      if (!data || typeof data !== "object") data = {};

      const roundId = data.round_id || data.roundId || data.id;
      const userId = data.userid || data.user_id || data.userId || data.uid;
      const level = Number(data.level || 0);
      const mode = String(data.difficulty || data.mode || "MEDIUM").toUpperCase();
      let multiplier = Number(data.multiplier || 0);
      if (!multiplier || multiplier <= 1.0) {
        if (service && typeof service.calculateFloorMultiplier === "function") {
          multiplier = service.calculateFloorMultiplier(mode, level);
        } else {
          multiplier = 1.0;
        }
      }

      // Check if obstacle is armed to topple when user drops the next block!
      if (service && typeof service.isObstacleArmed === "function" && service.isObstacleArmed(roundId, userId)) {
        logger.log(`[StackTowerSocket] 💥 User dropped block on armed round ${roundId}! Toppling tower now!`);
        const toppleResult = await service.triggerArmedDrop({
          round_id: roundId,
          userid: userId,
          level,
          multiplier,
        });

        // Broadcast topple/obstacle drop now that user dropped the block!
        broadcastObstacleDrop(toppleResult.data);

        if (typeof clientSocket.emit === "function") {
          clientSocket.emit("block_toppled", toppleResult.data);
          clientSocket.emit("obstacle_dropped", toppleResult.data);
        }
        if (typeof callback === "function") {
          callback({ toppled: true, block_missed: true, ...toppleResult.data });
        }

        // Refresh admin active players list
        broadcastActivePlayers();
        return;
      }

      // Update current floor in DB & memory
      try {
        if (service && typeof service.updateFloor === "function") {
          await service.updateFloor({
            round_id: roundId,
            userid: userId,
            level,
            multiplier,
          });
        }
      } catch (_) {}

      const updatePayload = {
        round_id: roundId,
        user_id: userId,
        level,
        current_level: level,
        multiplier,
        timestamp: Date.now(),
      };

      if (roundId && namespace.to) {
        namespace.to(`round:${roundId}`).emit("block_stacked", updatePayload);
      }
      if (typeof namespace.emit === "function") {
        namespace.emit("tower_update", updatePayload);
        namespace.emit("player_floor_updated", updatePayload);
        namespace.emit("player_progress", updatePayload);
      }
      if (namespace.to) {
        namespace.to("admin_room").emit("player_floor_updated", updatePayload);
        namespace.to("admin_room").emit("player_progress", updatePayload);
      }

      if (typeof callback === "function") {
        callback({ success: true, ...updatePayload });
      }

      // Update active players list for admin
      broadcastActivePlayers();
    });

    // 6. Admin Force Stop / Obstacle Drop event over WebSocket
    const forceDropHandler = async (rawData = {}, callback) => {
      let data = rawData;
      if (typeof rawData === "string") {
        try {
          data = JSON.parse(rawData);
        } catch (_) {
          data = { round_id: rawData };
        }
      }
      if (!data || typeof data !== "object") {
        data = {};
      }

      logger.log("[StackTowerSocket] 🔥 Received Force Drop Obstacle command over Socket:", data);

      const roundId = data.round_id || data.roundId || data.id || "";
      const userId = data.userid || data.user_id || data.userId || data.uid;
      const obstacleType = data.obstacle_type || data.obstacleType || data.type || "WRECKING_BALL";
      const strikeLevel = data.level || data.final_level || data.current_level;
      const isImmediate = data.immediate === true || data.immediate === "true" || data.now === true;

      try {
        const result = await service.dropObstacle({
          round_id: roundId,
          userid: userId,
          obstacle_type: obstacleType,
          level: strikeLevel,
          reason: data.reason || "Admin triggered force drop via socket",
          immediate: isImmediate,
        });

        // If immediate, broadcast drop immediately; otherwise broadcast armed state
        if (isImmediate) {
          broadcastObstacleDrop(result.data);
        } else {
          broadcastObstacleArmed(result.data);
        }

        const ackPayload = {
          success: true,
          armed: !isImmediate,
          message: result.message || (isImmediate ? "Obstacle dropped immediately" : "Force stop armed for NEXT block drop"),
          data: result.data,
        };

        if (typeof callback === "function") {
          callback(ackPayload);
        }
        if (typeof clientSocket.emit === "function") {
          clientSocket.emit("obstacle_drop_ack", ackPayload);
        }

        // Refresh admin active players list with armed indicator
        broadcastActivePlayers();
      } catch (err) {
        logger.error("[StackTowerSocket] Error in dropObstacle, handling fallback:", err.message);
        const fallbackDrop = {
          round_id: roundId || `ST_FORCE_${Date.now()}`,
          user_id: userId || null,
          obstacle_dropped: true,
          obstacle_type: obstacleType,
          level_dropped: Number(strikeLevel || 1),
          status: "OBSTACLE_DROPPED",
          payout: 0,
        };
        broadcastObstacleDrop(fallbackDrop);

        const fallbackAck = {
          success: true,
          message: "Obstacle dropped and broadcasted to all players",
          data: fallbackDrop,
        };

        if (typeof callback === "function") {
          callback(fallbackAck);
        }
        if (typeof clientSocket.emit === "function") {
          clientSocket.emit("obstacle_drop_ack", fallbackAck);
        }
        broadcastActivePlayers();
      }
    };

    clientSocket.on("admin_drop_obstacle", forceDropHandler);
    clientSocket.on("drop_obstacle", forceDropHandler);
    clientSocket.on("force_drop", forceDropHandler);
    clientSocket.on("force_stop", forceDropHandler);
    clientSocket.on("stack_tower_force_stop", forceDropHandler);
    clientSocket.on("stack_tower_drop", forceDropHandler);
    clientSocket.on("force_crash", forceDropHandler);
    clientSocket.on("aviator_drop_now", forceDropHandler);

    clientSocket.on("disconnect", () => {
      connectedSockets.delete(clientSocket);
    });
  }

  if (namespace && typeof namespace.on === "function") {
    namespace.on("connection", handleConnection);
  }

  // Also listen on root io if different
  if (io && io !== namespace && typeof io.on === "function") {
    io.on("connection", handleConnection);
  }

  // Setup aliases (e.g. /stack_tower, /api/stack-tower)
  const isRunningTests = Boolean(
    process.env.NODE_TEST_CONTEXT ||
    process.argv.some((a) => typeof a === "string" && a.includes("test"))
  );
  if (!isRunningTests && typeof io.of === "function") {
    const aliasNames = ["/stack_tower", "/api/stack-tower"];
    for (const name of aliasNames) {
      try {
        const aliasNs = io.of(name);
        if (aliasNs && typeof aliasNs.on === "function") {
          aliasNs.on("connection", handleConnection);
        }
      } catch (_) {}
    }
  }

  const socketInstance = {
    io,
    namespace,
    broadcastObstacleDrop,
    broadcastObstacleArmed,
    broadcastActivePlayers,
    broadcastPlayerJoined,
    broadcastPlayerCashedOut,
    broadcastPlayerGameOver,
    stop() {
      stopped = true;
      connectedSockets.clear();
      if (activeStackTowerSocketInstance === socketInstance) {
        activeStackTowerSocketInstance = null;
      }
    },
    getConnectedCount() {
      return connectedSockets.size;
    },
  };

  activeStackTowerSocketInstance = socketInstance;
  return socketInstance;
}

module.exports = {
  createStackTowerSocket,
  getStackTowerSocket,
};
