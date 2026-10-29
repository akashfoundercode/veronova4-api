"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const controller = require("./jili.controller");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

router.get(API_ROUTES.jili.games, controller.games);
router.get(API_ROUTES.jili.launch, authenticate, controller.launch);
router.post(API_ROUTES.jili.launch, authenticate, controller.launch);

module.exports = router;
