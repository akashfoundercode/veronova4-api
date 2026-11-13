"use strict";

const express = require("express");
const controller = require("./legacyApi.controller");

const router = express.Router();
router.get("/gift_redeem_list", controller.giftRedeemList);
router.post("/gift_cart_apply", controller.applyGift);
router.get("/total_bet_details", controller.totalBetDetails);
router.get("/beginner_guide", controller.beginnerGuide);
router.get("/about_us", controller.aboutUs);
router.get("/announcement", controller.announcements);

module.exports = router;
