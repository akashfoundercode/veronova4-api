"use strict";

const express = require("express");
const healthRoutes = require("../modules/health/health.routes");
const { API_ROUTES } = require("../config/apiRoutes");

const router = express.Router();

router.use(API_ROUTES.health, healthRoutes);

module.exports = router;
