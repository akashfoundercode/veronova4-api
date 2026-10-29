"use strict";

const express = require("express");
const controller = require("./auth.controller");
const authenticate = require("../../middleware/authenticate");
const { API_ROUTES } = require("../../config/apiRoutes");

const router = express.Router();

router.post(API_ROUTES.auth.login, controller.login);
router.post("/admin/login", controller.login);
router.post(API_ROUTES.auth.register, controller.register);
router.get(API_ROUTES.auth.profile, authenticate.optional, controller.profile);
router.get("/user", authenticate.optional, controller.profile);
router.get("/me", authenticate.optional, controller.profile);
router.get(API_ROUTES.auth.wallet, authenticate.optional, controller.wallet);
router.post(API_ROUTES.auth.logout, authenticate, controller.logout);
router.post(API_ROUTES.auth.updateProfile, authenticate, controller.updateProfile);
router.post(
  API_ROUTES.auth.mainWalletTransfer,
  authenticate,
  controller.mainWalletTransfer,
);

router.get("/country", controller.getCountry);
router.post("/country", controller.getCountry);
router.get("/countries", controller.getCountry);
router.post("/countries", controller.getCountry);

module.exports = router;
