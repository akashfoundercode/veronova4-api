"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./trx.controller");

const router = express.Router();

router.post(API_ROUTES.trx.blockHash, controller.trxResult);
router.get(API_ROUTES.trx.results, controller.fetchResults);
router.get(API_ROUTES.trx.resultList, controller.resultList);
router.get(API_ROUTES.trx.resultByPeriod, controller.getResultByPeriod);
router.get(API_ROUTES.trx.updateResults, controller.updateResults);

module.exports = router;
