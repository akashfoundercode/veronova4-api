"use strict";

const config = require("../../../config");
const BetService = require("./bet.service");
const WalletService = require("./wallet.service");
const { raceEngine } = require("./raceEngine");
const { socketService } = require("./socket.service");

module.exports = {
  config,
  BetService,
  WalletService,
  raceEngine,
  socketService,
};

