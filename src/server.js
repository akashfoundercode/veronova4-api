"use strict";

const { Server } = require("socket.io");
const app = require("./app");
const config = require("./config");
const { createAviatorSocket } = require("./modules/aviator/aviator.socket");
const { createWingoSocket } = require("./modules/wingo/wingo.socket");
const { socketService: horseRaceSocketService } = require("./modules/horseRace/services/socket.service");
const { raceEngine: horseRaceEngine } = require("./modules/horseRace/services/raceEngine");
const { isHorseDatabaseConfigured } = require("./modules/horseRace/config/database");
const { ensureAllTables } = require("./config/schemaBootstrap");

const httpServer = app.listen(config.port, async () => {
  console.log(`Veronova API listening on port ${config.port}`);
  await ensureAllTables();
  horseRaceEngine.start();
});
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const aviatorSocket = createAviatorSocket(io);
const wingoSocket = createWingoSocket(io);
horseRaceSocketService.initialize(io);

httpServer.on("close", () => {
  aviatorSocket.stop();
  wingoSocket.stop();
  horseRaceSocketService.stop();
  horseRaceEngine.stop();
});
