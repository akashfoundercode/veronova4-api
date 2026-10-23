"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { AdminService, formatOffer } = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockOffers = [
    {
      id: 1,
      title: "First Deposit Welcome Bonus",
      code: "WELCOME100",
      description: "Get 100% bonus on first deposit",
      offer_type: "welcome",
      bonus_amount: 500,
      bonus_percentage: 100,
      min_recharge: 200,
      max_bonus: 1000,
      banner_image: "https://example.com/banner1.jpg",
      start_date: "2026-10-01",
      end_date: "2026-10-31",
      usage_limit: 1000,
      used_count: 50,
      status: 1,
      created_at: new Date("2026-10-01T10:00:00.000Z"),
      updated_at: new Date("2026-10-01T10:00:00.000Z"),
    },
    {
      id: 2,
      title: "Weekend Cashback Offer",
      code: "WEEKEND10",
      description: "10% cashback on weekend losses",
      offer_type: "cashback",
      bonus_amount: 0,
      bonus_percentage: 10,
      min_recharge: 500,
      max_bonus: 5000,
      banner_image: "https://example.com/banner2.jpg",
      start_date: "2026-10-10",
      end_date: "2026-10-12",
      usage_limit: 500,
      used_count: 12,
      status: 0,
      created_at: new Date("2026-10-10T10:00:00.000Z"),
      updated_at: new Date("2026-10-10T10:00:00.000Z"),
    },
  ];

  return {
    calls,
    mockOffers,
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.includes("CREATE TABLE IF NOT EXISTS offers")) {
        return [{ affectedRows: 0 }, []];
      }

      if (sql.includes("COUNT(*) AS total_offers")) {
        const nonDeleted = mockOffers.filter((o) => o.status !== -1);
        return [[{
          total_offers: nonDeleted.length,
          active_offers: nonDeleted.filter((o) => o.status === 1).length,
          inactive_offers: nonDeleted.filter((o) => o.status === 0).length,
        }], []];
      }

      if (sql.includes("COUNT(*) AS total FROM offers")) {
        const nonDeleted = mockOffers.filter((o) => o.status !== -1);
        return [[{ total: nonDeleted.length }], []];
      }

      if (sql.includes("SELECT * FROM offers WHERE id = ? LIMIT 1")) {
        const targetId = Number(params[0]);
        const found = mockOffers.find((o) => o.id === targetId);
        return found ? [[found], []] : [[], []];
      }

      if (sql.includes("SELECT * FROM offers WHERE") && sql.includes("ORDER BY id DESC")) {
        const nonDeleted = mockOffers.filter((o) => o.status !== -1);
        return [nonDeleted, []];
      }

      if (sql.includes("UPDATE offers SET status = -1")) {
        const targetId = Number(params[0]);
        const target = mockOffers.find((o) => o.id === targetId);
        if (target) {
          target.status = -1;
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE offers")) {
        const targetId = Number(params[params.length - 1]);
        const target = mockOffers.find((o) => o.id === targetId);
        if (target) {
          target.title = params[0];
          target.code = params[1];
          target.description = params[2];
          target.offer_type = params[3];
          target.bonus_amount = params[4];
          target.bonus_percentage = params[5];
          target.min_recharge = params[6];
          target.max_bonus = params[7];
          target.banner_image = params[8];
          target.start_date = params[9];
          target.end_date = params[10];
          target.usage_limit = params[11];
          target.status = params[12];
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("INSERT INTO offers")) {
        const newId = mockOffers.length + 1;
        const inserted = {
          id: newId,
          title: params[0],
          code: params[1],
          description: params[2],
          offer_type: params[3],
          bonus_amount: params[4],
          bonus_percentage: params[5],
          min_recharge: params[6],
          max_bonus: params[7],
          banner_image: params[8],
          start_date: params[9],
          end_date: params[10],
          usage_limit: params[11],
          used_count: 0,
          status: params[12],
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockOffers.push(inserted);
        return [{ insertId: newId, affectedRows: 1 }, []];
      }

      return [[], []];
    },
  };
}

test("DASHBOARD_ROUTES and API_ROUTES expose offers and offerItem routes", () => {
  assert.equal(DASHBOARD_ROUTES.offers, "/admin/offers");
  assert.equal(DASHBOARD_ROUTES.offerItem, "/admin/offers/:id");

  assert.equal(API_ROUTES.admin.offers, "/admin/offers");
  assert.equal(API_ROUTES.admin.offerItem, "/admin/offers/:id");
});

test("formatOffer accurately formats offer object with actions", () => {
  const row = {
    id: 1,
    title: "Special VIP Bonus",
    code: "VIP50",
    description: "Extra 50% for VIPs",
    offer_type: "vip",
    bonus_amount: "500.00",
    bonus_percentage: "50.00",
    min_recharge: "1000.00",
    max_bonus: "2000.00",
    banner_image: "banner.jpg",
    status: 1,
    created_at: new Date("2026-10-15T00:00:00.000Z"),
  };

  const formatted = formatOffer(row);
  assert.equal(formatted.id, 1);
  assert.equal(formatted.title, "Special VIP Bonus");
  assert.equal(formatted.name, "Special VIP Bonus");
  assert.equal(formatted.code, "VIP50");
  assert.equal(formatted.bonus_amount, 500);
  assert.equal(formatted.amount, 500);
  assert.equal(formatted.bonus_percentage, 50);
  assert.equal(formatted.percentage, 50);
  assert.equal(formatted.min_recharge, 1000);
  assert.equal(formatted.status, 1);
  assert.equal(formatted.status_label, "Active");
  assert.deepEqual(formatted.actions, ["edit", "update", "delete"]);
});

test("AdminService.getOffers retrieves paginated offers and summary", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.getOffers({ limit: 10, offset: 0 });
  assert.ok(res.summary);
  assert.equal(res.summary.total_offers, 2);
  assert.equal(res.summary.active_offers, 1);
  assert.equal(res.summary.inactive_offers, 1);
  assert.equal(res.pagination.total, 2);
  assert.equal(res.offers.length, 2);
  assert.equal(res.offers[0].title, "First Deposit Welcome Bonus");
});

test("AdminService.getOffers retrieves single offer when id is provided", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.getOffers({ id: 1 });
  assert.ok(res.offer);
  assert.equal(res.offer.id, 1);
  assert.equal(res.offer.code, "WELCOME100");
});

test("AdminService.saveOffer creates a new offer", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveOffer({
    title: "Diwali Mega Offer",
    code: "DIWALI500",
    bonus_amount: 500,
    min_recharge: 1000,
    offer_type: "festival",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Offer added successfully");
  assert.equal(res.data.id, 3);
  assert.equal(res.data.title, "Diwali Mega Offer");
  assert.equal(res.data.code, "DIWALI500");
  assert.equal(res.data.bonus_amount, 500);
});

test("AdminService.saveOffer edits an existing offer", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveOffer({
    id: 1,
    title: "Updated Welcome Bonus",
    bonus_amount: 750,
    status: 1,
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Offer updated successfully");
  assert.equal(res.data.id, 1);
  assert.equal(res.data.title, "Updated Welcome Bonus");
  assert.equal(res.data.bonus_amount, 750);
});

test("AdminService.saveOffer deletes an offer when action=delete", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveOffer({
    id: 2,
    action: "delete",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Offer deleted successfully");
  assert.equal(res.data.id, 2);
  assert.equal(res.data.status, -1);
  assert.equal(res.data.status_label, "Deleted");
});

test("Controller getOffers and saveOffer handle requests with standard envelopes", async () => {
  const pool = createMockPool();
  controller.service.poolProvider = () => pool;
  controller.service.clock = () => new Date("2026-10-15T00:00:00.000Z");

  let resStatus = 0;
  let resJson = null;
  const mockRes = {
    status(s) {
      resStatus = s;
      return this;
    },
    json(j) {
      resJson = j;
      return this;
    },
  };

  // 1. GET list
  await controller.getOffers({ query: { limit: 10, offset: 0 } }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.ok(Array.isArray(resJson.data.offers));

  // 2. POST create
  await controller.saveOffer({
    body: { title: "Controller Offer", bonus_amount: 100 },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Offer added successfully");

  // 3. POST edit
  await controller.saveOffer({
    params: { id: "1" },
    body: { title: "Edited via Controller", bonus_amount: 300 },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Offer updated successfully");

  // 4. POST delete
  await controller.saveOffer({
    params: { id: "1" },
    body: { action: "delete" },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Offer deleted successfully");
});

