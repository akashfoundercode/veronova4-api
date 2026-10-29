"use strict";

const express = require("express");
const { API_ROUTES } = require("../../config/apiRoutes");
const c = require("./balloon.controller");
const authenticate = require("../../middleware/authenticate");

const r = express.Router();

r.post(API_ROUTES.balloon.bet, authenticate, c.bet);
r.post(API_ROUTES.balloon.history, authenticate, c.history);
r.get(API_ROUTES.balloon.lastResult, c.last);
r.post(API_ROUTES.balloon.cancel, authenticate, c.cancel);
r.get(API_ROUTES.balloon.image, c.images);
r.post(API_ROUTES.balloon.cashout, authenticate, c.cashout);
r.post(API_ROUTES.balloon.updateImage, authenticate, c.updateImage);

module.exports = r;
