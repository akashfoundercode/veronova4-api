"use strict";

const wingoController = require("../wingo/wingo.controller");
const trxController = require("../trx/trx.controller");
const { TRX_GAME_IDS } = require("../trx/trx.service");
const dragonTigerController = require("../dragonTiger/dragonTiger.controller");
const andarBaharController = require("../andarBahar/andarBahar.controller");
const sevenUpDownController = require("../sevenUpDown/sevenUpDown.controller");
const redBlackController = require("../redBlack/redBlack.controller");

function usesTrx(body) {
  return TRX_GAME_IDS.includes(Number(body?.game_id));
}

function usesBatchGame(body) {
  return [10, 13].includes(Number(body?.game_id));
}

function bet(req, res, next) {
  if (usesTrx(req.body)) return trxController.bet(req, res, next);
  if (Number(req.body?.game_id) === 13) return andarBaharController.placeSharedBet(req, res, next);
  if (Number(req.body?.game_id) === 15) return sevenUpDownController.placeSharedBet(req, res, next);
  if (Number(req.body?.game_id) === 16) return redBlackController.placeSharedBet(req, res, next);
  if (usesBatchGame(req.body)) return dragonTigerController.placeSharedBet(req, res, next);
  return wingoController.bet(req, res, next);
}

function betHistory(req, res, next) {
  if (usesTrx(req.body)) return trxController.betHistory(req, res, next);
  if (Number(req.body?.game_id) === 13) return andarBaharController.betHistory(req, res, next);
  if (Number(req.body?.game_id) === 15) return sevenUpDownController.betHistory(req, res, next);
  if (Number(req.body?.game_id) === 16) return redBlackController.betHistory(req, res, next);
  if (usesBatchGame(req.body)) return dragonTigerController.betHistory(req, res, next);
  return wingoController.betHistory(req, res, next);
}

module.exports = { bet, betHistory };
