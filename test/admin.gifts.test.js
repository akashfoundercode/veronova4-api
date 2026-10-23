"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  AdminService,
  formatGift,
  generate15DigitGiftCode,
} = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockGifts = [
    {
      id: 1,
      code: "112776372300489",
      amount: 200,
      number_people: 10,
      availed_num: 3,
      deposit_amount: 1000,
      campaign_tag: "Diwali Special",
      status: 1,
      datetime: new Date("2026-10-15T08:30:00.000Z"),
    },
    {
      id: 2,
      code: "512285806558097",
      amount: 50,
      number_people: 5,
      availed_num: 5,
      deposit_amount: 500,
      campaign_tag: "Weekend Bonus",
      status: 1,
      datetime: new Date("2026-10-14T09:15:00.000Z"),
    },
  ];

  return {
    calls,
    mockGifts,
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.includes("CREATE TABLE IF NOT EXISTS gift_cart") || sql.includes("ALTER TABLE gift_cart")) {
        return [{ affectedRows: 0 }, []];
      }

      if (sql.includes("COUNT(*) AS total_gifts")) {
        const nonDeleted = mockGifts.filter((g) => g.status !== -1);
        return [[{
          total_gifts: nonDeleted.length,
          total_claimed: 8,
          total_slots: 15,
          total_slots_remaining: 7,
          active_gifts: 1,
          exhausted_gifts: 1,
          total_distributed_amount: 850,
        }], []];
      }

      if (sql.includes("COUNT(*) AS total FROM gift_cart")) {
        const nonDeleted = mockGifts.filter((g) => g.status !== -1);
        return [[{ total: nonDeleted.length }], []];
      }

      if (sql.includes("SELECT * FROM gift_cart WHERE id = ? LIMIT 1")) {
        const targetId = Number(params[0]);
        const found = mockGifts.find((g) => g.id === targetId);
        return found ? [[found], []] : [[], []];
      }

      if (sql.includes("SELECT * FROM gift_cart WHERE code = ? LIMIT 1")) {
        const targetCode = String(params[0]);
        const found = mockGifts.find((g) => g.code === targetCode);
        return found ? [[found], []] : [[], []];
      }

      if (sql.includes("SELECT * FROM gift_cart WHERE") && sql.includes("ORDER BY id DESC")) {
        const nonDeleted = mockGifts.filter((g) => g.status !== -1);
        return [nonDeleted, []];
      }

      if (sql.includes("UPDATE gift_cart SET status = -1")) {
        const targetId = Number(params[0]);
        const target = mockGifts.find((g) => g.id === targetId);
        if (target) {
          target.status = -1;
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE gift_cart")) {
        const targetId = Number(params[params.length - 1]);
        const target = mockGifts.find((g) => g.id === targetId);
        if (target) {
          target.deposit_amount = params[0];
          target.amount = params[1];
          target.number_people = params[2];
          target.campaign_tag = params[3];
          target.status = params[4];
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("INSERT INTO gift_cart")) {
        const newId = mockGifts.length + 1;
        const inserted = {
          id: newId,
          code: params[0],
          amount: params[1],
          number_people: params[2],
          availed_num: 0,
          deposit_amount: params[3],
          campaign_tag: params[4],
          status: params[5],
          datetime: new Date(),
        };
        mockGifts.push(inserted);
        return [{ insertId: newId, affectedRows: 1 }, []];
      }

      return [[], []];
    },
  };
}

test("DASHBOARD_ROUTES and API_ROUTES expose gifts, giftItem, and giftHistory routes", () => {
  assert.equal(DASHBOARD_ROUTES.gifts, "/admin/gifts");
  assert.equal(DASHBOARD_ROUTES.giftItem, "/admin/gifts/:id");
  assert.equal(DASHBOARD_ROUTES.giftHistory, "/admin/gift-history");

  assert.equal(API_ROUTES.admin.gifts, "/admin/gifts");
  assert.equal(API_ROUTES.admin.giftItem, "/admin/gifts/:id");
  assert.equal(API_ROUTES.admin.giftHistory, "/admin/gift-history");
});

test("generate15DigitGiftCode generates a valid 15-digit numeric string", () => {
  const code = generate15DigitGiftCode();
  assert.equal(typeof code, "string");
  assert.equal(code.length, 15);
  assert.match(code, /^\d{15}$/);
});

test("formatGift formats all required history and add fields accurately", () => {
  const row = {
    id: 1,
    code: "112776372300489",
    amount: 200,
    number_people: 10,
    availed_num: 3,
    deposit_amount: 1000,
    campaign_tag: "Diwali Special",
    status: 1,
    datetime: new Date("2026-10-15T08:30:00.000Z"),
  };

  const formatted = formatGift(row);
  assert.equal(formatted["#ID"], 1);
  assert.equal(formatted["15-Digit Gift Code"], "112776372300489");
  assert.equal(formatted["Deposit Required"], 1000);
  assert.equal(formatted["Gift Reward Amount"], 200);
  assert.equal(formatted["Claim Progress"], "3/10 (30%)");
  assert.equal(formatted["Slots Remaining"], 7);
  assert.ok(formatted["Created Date"].includes("2026-10-15"));
  assert.deepEqual(formatted["Actions"], ["view", "edit", "status", "delete"]);

  // Standard properties check
  assert.equal(formatted.req_deposit, 1000);
  assert.equal(formatted.gift_amount, 200);
  assert.equal(formatted.max_claims, 10);
  assert.equal(formatted.campaign_tag, "Diwali Special");
  assert.equal(formatted.status_label, "Active");
});

test("AdminService.getGifts retrieves paginated gift history with summary", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.getGifts({ limit: 10, offset: 0 });
  assert.ok(res.summary);
  assert.equal(res.summary.total_gifts, 2);
  assert.equal(res.summary.total_claimed, 8);
  assert.equal(res.summary.total_slots, 15);
  assert.equal(res.summary.total_slots_remaining, 7);
  assert.equal(res.pagination.total, 2);
  assert.equal(res.gifts.length, 2);
  assert.equal(res.history.length, 2);
  assert.equal(res.gifts[0].code, "112776372300489");
});

test("AdminService.getGifts retrieves single gift by ID or Code", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const resById = await service.getGifts({ id: 1 });
  assert.ok(resById.gift);
  assert.equal(resById.gift.id, 1);
  assert.equal(resById.gift["15-Digit Gift Code"], "112776372300489");

  const resByCode = await service.getGifts({ code: "512285806558097" });
  assert.ok(resByCode.gift);
  assert.equal(resByCode.gift.id, 2);
  assert.equal(resByCode.gift.status_label, "Exhausted");
});

test("AdminService.saveGift adds a new gift with requested fields and auto 15-digit code", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveGift({
    req_deposit: 1000,
    gift_amount: 200,
    max_claims: 10,
    campaign_tag: "VIP Promo",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Gift added successfully");
  assert.equal(res.data.id, 3);
  assert.equal(res.data.req_deposit, 1000);
  assert.equal(res.data.gift_amount, 200);
  assert.equal(res.data.max_claims, 10);
  assert.equal(res.data.campaign_tag, "VIP Promo");
  assert.equal(res.data["15-Digit Gift Code"].length, 15);
  assert.match(res.data["15-Digit Gift Code"], /^\d{15}$/);
});

test("AdminService.saveGift edits an existing gift", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveGift({
    id: 1,
    deposit_amount: 1500,
    gift_amount: 300,
    max_claims: 20,
    campaign_tag: "Super Festival",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Gift updated successfully");
  assert.equal(res.data.id, 1);
  assert.equal(res.data.deposit_required, 1500);
  assert.equal(res.data.gift_amount, 300);
  assert.equal(res.data.max_claims, 20);
  assert.equal(res.data.campaign_tag, "Super Festival");
});

test("AdminService.saveGift deletes a gift when action=delete", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveGift({
    id: 2,
    action: "delete",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Gift deleted successfully");
  assert.equal(res.data.id, 2);
  assert.equal(res.data.status, -1);
  assert.equal(res.data.status_label, "Deleted");
});

test("Controller getGifts and saveGift handle requests with standard envelopes", async () => {
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

  // 1. GET list / history
  await controller.getGifts({ query: { limit: 10, offset: 0 } }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Gifts history fetched successfully");
  assert.ok(Array.isArray(resJson.data.gifts));

  // 2. POST create gift
  await controller.saveGift({
    body: {
      req_deposit: 1000,
      gift_amount: 200,
      max_claims: 10,
      campaign_tag: "Welcome Gift",
    },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Gift added successfully");
  assert.equal(resJson.data.req_deposit, 1000);
  assert.equal(resJson.data.gift_amount, 200);
  assert.equal(resJson.data.max_claims, 10);

  // 3. POST edit gift
  await controller.saveGift({
    params: { id: "1" },
    body: { gift_amount: 250 },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Gift updated successfully");

  // 4. POST delete gift
  await controller.saveGift({
    params: { id: "1" },
    body: { action: "delete" },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Gift deleted successfully");
});

