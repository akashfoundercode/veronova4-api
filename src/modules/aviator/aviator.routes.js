"use strict";

const express = require("express");
const controller = require("./aviator.controller");
const { API_ROUTES } = require("../../config/apiRoutes");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

router.use(authenticate.optional);

router.post(API_ROUTES.aviator.bet, controller.bet);
router.get(API_ROUTES.aviator.betNew, controller.betNew);
router.post(API_ROUTES.aviator.cashout, controller.cashout);
router.post(API_ROUTES.aviator.history, controller.history);
router.get(API_ROUTES.aviator.lastFiveResult, controller.lastFiveResult);
router.get(API_ROUTES.aviator.betCancel, controller.betCancel);
router.get(API_ROUTES.aviator.telemetry, controller.telemetry);
router.get(API_ROUTES.aviator.drops, controller.drops);
router.get("/aviator_telemetry", controller.telemetry);
router.get("/aviator_drop_history", controller.drops);
router.get("/aviator/overview", controller.telemetry);
router.get("/admin/aviator/telemetry", controller.telemetry);
router.get("/admin/aviator/drops", controller.drops);
router.get("/admin/aviator", controller.telemetry);
router.get("/admin/aviator-telemetry", controller.telemetry);
router.get("/admin/aviator-drops", controller.drops);
router.get("/admin/aviator/overview", controller.telemetry);
router.get("/result_half_new.php", controller.roundSettings);
router.post("/result_half_new.php", controller.roundSettings);
router.get("/Aviator/result_half_new.php", controller.roundSettings);
router.post("/Aviator/result_half_new.php", controller.roundSettings);
router.get("/aviator/result_half_new.php", controller.roundSettings);
router.post("/aviator/result_half_new.php", controller.roundSettings);
router.get("/round_settings", controller.roundSettings);

router.post("/result_insert_new.php", controller.insertResult);
router.get("/result_insert_new.php", controller.insertResult);
router.post("/Aviator/result_insert_new.php", controller.insertResult);
router.get("/Aviator/result_insert_new.php", controller.insertResult);
router.post("/aviator/result_insert_new.php", controller.insertResult);
router.get("/aviator/result_insert_new.php", controller.insertResult);
router.post("/result_insert", controller.insertResult);
router.get("/result_insert", controller.insertResult);

module.exports = router;
