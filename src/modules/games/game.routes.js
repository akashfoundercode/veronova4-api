"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const authenticate = require("../../middleware/authenticate");
const controller = require("./game.controller");
const dragonTigerController = require("../dragonTiger/dragonTiger.controller");
const andarBaharController = require("../andarBahar/andarBahar.controller");
const sevenUpDownController = require("../sevenUpDown/sevenUpDown.controller");
const redBlackController = require("../redBlack/redBlack.controller");

const router = express.Router();

router.post(API_ROUTES.games.bet, authenticate, controller.bet);
router.post(API_ROUTES.games.betHistory, authenticate.optional, controller.betHistory);
router.post(API_ROUTES.dragonTiger.batchBet, authenticate, (req, res, next) => {
  if (Number(req.body?.game_id) === 13) {
    return andarBaharController.placeBatchBet(req, res, next);
  }
  if (Number(req.body?.game_id) === 15) {
    return sevenUpDownController.placeBatchBet(req, res, next);
  }
  if (Number(req.body?.game_id) === 16) {
    return redBlackController.placeBatchBet(req, res, next);
  }
  return dragonTigerController.placeBatchBet(req, res, next);
});

module.exports = router;
