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

// 6. Invitation Milestone Bonus Routes
router.get("/invitation_bonus_list", controller.getInvitationBonusList);
router.post("/invitation_bonus_list", controller.getInvitationBonusList);
router.get("/invitation-bonus-list", controller.getInvitationBonusList);
router.post("/invitation-bonus-list", controller.getInvitationBonusList);
router.get("/invitation_bonus_list_old", controller.getInvitationBonusList);

// 7. Invitation Milestone Bonus Claim Routes
router.post("/invitation_bonus_claim", controller.claimInvitationBonus);
router.get("/invitation_bonus_claim", controller.claimInvitationBonus);
router.post("/claim_invite_bonus", controller.claimInvitationBonus);
router.get("/claim_invite_bonus", controller.claimInvitationBonus);
router.post("/invitation-bonus-claim", controller.claimInvitationBonus);

module.exports = router;

