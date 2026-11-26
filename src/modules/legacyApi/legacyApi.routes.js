"use strict";

const express = require("express");
const multer = require("multer");
const controller = require("./legacyApi.controller");

const router = express.Router();
const parseMultipartFields = multer().none();

function acceptFormData(req, res, next) {
  if (typeof req.is === "function" && req.is("multipart/form-data")) {
    return parseMultipartFields(req, res, next);
  }
  return next();
}
router.get("/gift_redeem_list", controller.giftRedeemList);
router.post("/gift_redeem_list", acceptFormData, controller.giftRedeemList);
router.get("/gift-redeem-list", controller.giftRedeemList);
router.post("/gift-redeem-list", acceptFormData, controller.giftRedeemList);
router.get("/claim_list", controller.giftRedeemList);
router.post("/claim_list", acceptFormData, controller.giftRedeemList);

router.post("/gift_cart_apply", acceptFormData, controller.applyGift);
router.post("/gift-cart-apply", acceptFormData, controller.applyGift);
router.post("/apply_gift", acceptFormData, controller.applyGift);
router.post("/apply-gift", acceptFormData, controller.applyGift);
router.get("/total_bet_details", controller.totalBetDetails);
router.get("/beginner_guide", controller.beginnerGuide);
router.post("/beginner_guide", controller.beginnerGuide);
router.get("/beginner-guide", controller.beginnerGuide);
router.post("/beginner-guide", controller.beginnerGuide);
router.get("/about_us", controller.aboutUs);
router.get("/announcement", controller.announcements);
router.post("/feedback", controller.feedback);
router.get("/feedback", controller.getFeedback);
router.get("/support", controller.support);
router.get("/contact_us", controller.contactUs);
router.get("/contact-us", controller.contactUs);

module.exports = router;
