"use strict";

const express = require("express");
const controller = require("./legacyApi.controller");

const router = express.Router();
router.get("/gift_redeem_list", controller.giftRedeemList);
router.post("/gift_redeem_list", controller.giftRedeemList);
router.get("/gift-redeem-list", controller.giftRedeemList);
router.post("/gift-redeem-list", controller.giftRedeemList);
router.get("/claim_list", controller.giftRedeemList);
router.post("/claim_list", controller.giftRedeemList);

router.post("/gift_cart_apply", controller.applyGift);
router.post("/gift-cart-apply", controller.applyGift);
router.post("/apply_gift", controller.applyGift);
router.post("/apply-gift", controller.applyGift);
router.get("/total_bet_details", controller.totalBetDetails);
router.get("/beginner_guide", controller.beginnerGuide);
router.post("/beginner_guide", controller.beginnerGuide);
router.get("/beginner-guide", controller.beginnerGuide);
router.post("/beginner-guide", controller.beginnerGuide);
router.get("/about_us", controller.aboutUs);
router.get("/announcement", controller.announcements);
router.post("/feedback", controller.feedback);
router.get("/feedback", controller.getFeedback);

module.exports = router;
