"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./jili.controller");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

router.get(API_ROUTES.jili.games, controller.games);
router.get(API_ROUTES.jili.launch, authenticate, controller.launch);
router.post(API_ROUTES.jili.launch, authenticate, controller.launch);

// Reseller Info (Laravel ZiliApiController@get_reseller_info)
router.get("/get_reseller_info", controller.getResellerInfo);
router.post("/get_reseller_info", controller.getResellerInfo);
router.get("/get-reseller-info", controller.getResellerInfo);
router.post("/get-reseller-info", controller.getResellerInfo);
router.get("/get_reseller_info/:manager_key", controller.getResellerInfo);
router.get("/get-reseller-info/:manager_key", controller.getResellerInfo);

module.exports = router;
