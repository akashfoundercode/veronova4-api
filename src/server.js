"use strict";

const { Server } = require("socket.io");
const app = require("./app");
const config = require("./config");
const { createAviatorSocket } = require("./modules/aviator/aviator.socket");
const { createWingoSocket } = require("./modules/wingo/wingo.socket");
const { socketService: horseRaceSocketService } = require("./modules/horseRace/services/socket.service");
const { raceEngine: horseRaceEngine } = require("./modules/horseRace/services/raceEngine");
const { isHorseDatabaseConfigured } = require("./modules/horseRace/config/database");

const httpServer = app.listen(config.port, () => {
  console.log(`Veronova API listening on port ${config.port}`);
});
const io = new Server(httpServer);
const aviatorSocket = createAviatorSocket(io);
const wingoSocket = createWingoSocket(io);
horseRaceSocketService.initialize(io);
if (isHorseDatabaseConfigured()) {
  horseRaceEngine.start();
} else {
  console.warn(
    "Horse-race socket is active, but the race engine is disabled: configure HORSE_DB_DATABASE to a separate schema and apply docs/horse-race-schema.sql.",
  );
}

httpServer.on("close", () => {
  aviatorSocket.stop();
  wingoSocket.stop();
  horseRaceSocketService.stop();
  horseRaceEngine.stop();
});
