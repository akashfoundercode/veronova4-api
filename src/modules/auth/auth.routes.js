"use strict";

const express = require("express");
const controller = require("./auth.controller");
const authenticate = require("../../middleware/authenticate");
const { API_ROUTES } = require("../../config/apiRoutes");

const router = express.Router();

router.post(API_ROUTES.auth.login, controller.login);
router.post("/admin/login", controller.login);
router.post(API_ROUTES.auth.register, controller.register);
router.get(API_ROUTES.auth.profile, authenticate, controller.profile);
router.get(API_ROUTES.auth.wallet, authenticate, controller.wallet);
router.post(API_ROUTES.auth.logout, authenticate, controller.logout);
router.post(
  API_ROUTES.auth.mainWalletTransfer,
  authenticate,
  controller.mainWalletTransfer,
);

module.exports = router;
