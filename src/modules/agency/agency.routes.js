"use strict";

const express = require("express");
const controller = require("./agency.controller");

const router = express.Router();

// 1. Agency Promotion Data Routes
// Specifically matches /agency-promotion-data-13 or /agency-promotion-data-:id
router.get("/agency-promotion-data-:id", controller.getPromotionData);
router.post("/agency-promotion-data-:id", controller.getPromotionData);

router.get("/agency-promotion-data/:id", controller.getPromotionData);
router.post("/agency-promotion-data/:id", controller.getPromotionData);

router.get("/agency-promotion-data", controller.getPromotionData);
router.post("/agency-promotion-data", controller.getPromotionData);

router.get("/agency_promotion_data-:id", controller.getPromotionData);
router.post("/agency_promotion_data-:id", controller.getPromotionData);

router.get("/agency_promotion_data/:id", controller.getPromotionData);
router.post("/agency_promotion_data/:id", controller.getPromotionData);

router.get("/agency_promotion_data", controller.getPromotionData);
router.post("/agency_promotion_data", controller.getPromotionData);

router.get("/promotion-data-:id", controller.getPromotionData);
router.post("/promotion-data-:id", controller.getPromotionData);

router.get("/promotion-data/:id", controller.getPromotionData);
router.post("/promotion-data/:id", controller.getPromotionData);

router.get("/promotion-data", controller.getPromotionData);
router.post("/promotion-data", controller.getPromotionData);

router.get("/promotion_data-:id", controller.getPromotionData);
router.post("/promotion_data-:id", controller.getPromotionData);

router.get("/promotion_data/:id", controller.getPromotionData);
router.post("/promotion_data/:id", controller.getPromotionData);

router.get("/promotion_data", controller.getPromotionData);
router.post("/promotion_data", controller.getPromotionData);

// 2. New Subordinate Routes
router.get("/new-subordinate", controller.getNewSubordinates);
router.post("/new-subordinate", controller.getNewSubordinates);
router.get("/new_subordinate", controller.getNewSubordinates);
router.post("/new_subordinate", controller.getNewSubordinates);

// 3. Tier / MLM Levels Routes
router.get("/tier", controller.getTiers);
router.post("/tier", controller.getTiers);
router.get("/tiers", controller.getTiers);
router.get("/mlm-levels", controller.getTiers);
router.get("/mlm_levels", controller.getTiers);

// 4. Subordinate Data Routes
router.get("/subordinate-data", controller.getSubordinateData);
router.post("/subordinate-data", controller.getSubordinateData);
router.get("/subordinate_data", controller.getSubordinateData);
router.post("/subordinate_data", controller.getSubordinateData);

// 5. Turnovers Commission Calculation Routes
router.get("/turnovers", controller.calculateTurnovers);
router.post("/turnovers", controller.calculateTurnovers);
router.get("/turnover", controller.calculateTurnovers);
router.get("/turnover-new", controller.calculateTurnovers);
router.get("/turnover_new", controller.calculateTurnovers);

module.exports = router;

