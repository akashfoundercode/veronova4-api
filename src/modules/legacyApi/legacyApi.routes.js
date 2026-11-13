"use strict";

const express = require("express");
const controller = require("./legacyApi.controller");

const router = express.Router();
router.get("/gift_redeem_list", controller.giftRedeemList);
router.post("/gift_cart_apply", controller.applyGift);
router.get("/total_bet_details", controller.totalBetDetails);

module.exports = router;
