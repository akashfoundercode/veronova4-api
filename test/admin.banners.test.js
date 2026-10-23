"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  AdminService,
  formatBanner,
} = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockBanners = [
    {
      id: 18,
      title: "Welcome To Bdg Cassino",
      image: "https://root.veronova.co.in/uploads/sliders/1754071518_IMG-20250710-WA0113.jpg",
      activity_image: "https://root.veronova.co.in/uploads/sliders/image_1.jpeg",
      activity_image_url: "https://root.veronova.co.in/uploads/sliders/url_1.pdf",
      status: 1,
      created_at: new Date("2025-02-26T23:36:55.000Z"),
      updated_at: new Date("2025-08-01T18:05:18.000Z"),
    },
    {
      id: 19,
      title: "Invitation Bonus",
      image: "https://root.veronova.co.in/uploads/sliders/1754068851_IMG-20250710-WA0112.jpg",
      activity_image: "https://root.veronova.co.in/uploads/sliders/image_2.jpeg",
      activity_image_url: "https://root.veronova.co.in/uploads/sliders/url_2.jpeg",
      status: 0,
      created_at: new Date("2025-02-26T23:36:55.000Z"),
      updated_at: new Date("2025-08-18T20:03:04.000Z"),
    },
  ];

  return {
    calls,
    mockBanners,
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.includes("CREATE TABLE IF NOT EXISTS sliders")) {
        return [{ affectedRows: 0 }, []];
      }

      if (sql.includes("COUNT(*) AS total_banners")) {
        const nonDeleted = mockBanners.filter((b) => b.status !== -1);
        return [[{
          total_banners: nonDeleted.length,
          active_banners: nonDeleted.filter((b) => b.status === 1).length,
          inactive_banners: nonDeleted.filter((b) => b.status === 0).length,
        }], []];
      }

      if (sql.includes("COUNT(*) AS total FROM sliders")) {
        const nonDeleted = mockBanners.filter((b) => b.status !== -1);
        return [[{ total: nonDeleted.length }], []];
      }

      if (sql.includes("SELECT * FROM sliders WHERE id = ? LIMIT 1")) {
        const targetId = Number(params[0]);
        const found = mockBanners.find((b) => b.id === targetId);
        return found ? [[found], []] : [[], []];
      }

      if (sql.includes("SELECT * FROM sliders WHERE") && sql.includes("ORDER BY id DESC")) {
        const nonDeleted = mockBanners.filter((b) => b.status !== -1);
        return [nonDeleted, []];
      }

      if (sql.includes("UPDATE sliders SET status = -1")) {
        const targetId = Number(params[0]);
        const target = mockBanners.find((b) => b.id === targetId);
        if (target) {
          target.status = -1;
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE sliders")) {
        const targetId = Number(params[params.length - 1]);
        const target = mockBanners.find((b) => b.id === targetId);
        if (target) {
          target.title = params[0];
          target.image = params[1];
          target.activity_image = params[2];
          target.activity_image_url = params[3];
          target.status = params[4];
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("INSERT INTO sliders")) {
        const newId = mockBanners.length + 20;
        const inserted = {
          id: newId,
          title: params[0],
          image: params[1],
          activity_image: params[2],
          activity_image_url: params[3],
          status: params[4],
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockBanners.push(inserted);
        return [{ insertId: newId, affectedRows: 1 }, []];
      }

      return [[], []];
    },
  };
}

test("DASHBOARD_ROUTES and API_ROUTES expose banners and activityBanners routes", () => {
  assert.equal(DASHBOARD_ROUTES.banners, "/admin/banners");
  assert.equal(DASHBOARD_ROUTES.bannerItem, "/admin/banners/:id");
  assert.equal(DASHBOARD_ROUTES.activityBanners, "/admin/activity-banners");
  assert.equal(DASHBOARD_ROUTES.activityBannerItem, "/admin/activity-banners/:id");

  assert.equal(API_ROUTES.admin.banners, "/admin/banners");
  assert.equal(API_ROUTES.admin.activityBanners, "/admin/activity-banners");
});

test("formatBanner accurately formats all required table columns", () => {
  const row = {
    id: 18,
    title: "Welcome To Bdg Cassino",
    image: "https://root.veronova.co.in/uploads/sliders/banner1.jpg",
    activity_image: "https://root.veronova.co.in/uploads/sliders/image_1.jpeg",
    activity_image_url: "https://root.veronova.co.in/uploads/sliders/url_1.pdf",
    status: 1,
    created_at: new Date("2025-02-26T23:36:55.000Z"),
    updated_at: new Date("2025-08-01T18:05:18.000Z"),
  };

  const formatted = formatBanner(row);
  assert.equal(formatted["#"], 18);
  assert.equal(formatted.id, 18);
  assert.equal(formatted.Title, "Welcome To Bdg Cassino");
  assert.equal(formatted.title, "Welcome To Bdg Cassino");
  assert.equal(formatted["Banner Image"], "https://root.veronova.co.in/uploads/sliders/banner1.jpg");
  assert.equal(formatted.banner_image, "https://root.veronova.co.in/uploads/sliders/banner1.jpg");
  assert.equal(formatted["Activity Image"], "https://root.veronova.co.in/uploads/sliders/image_1.jpeg");
  assert.equal(formatted.activity_image, "https://root.veronova.co.in/uploads/sliders/image_1.jpeg");
  assert.equal(formatted.Status, 1);
  assert.equal(formatted.status_label, "Active");
  assert.deepEqual(formatted.Actions, ["edit", "update", "delete", "status"]);
});

test("AdminService.getBanners retrieves paginated banners and summary", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.getBanners({ limit: 10, offset: 0 });
  assert.ok(res.summary);
  assert.equal(res.summary.total_banners, 2);
  assert.equal(res.summary.active_banners, 1);
  assert.equal(res.summary.inactive_banners, 1);
  assert.equal(res.pagination.total, 2);
  assert.equal(res.banners.length, 2);
  assert.equal(res.banners[0].title, "Welcome To Bdg Cassino");
});

test("AdminService.getBanners retrieves single banner when id is provided", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.getBanners({ id: 18 });
  assert.ok(res.banner);
  assert.equal(res.banner.id, 18);
  assert.equal(res.banner["Title"], "Welcome To Bdg Cassino");
});

test("AdminService.saveBanner adds a new banner validating Title *, Banner Image *, Activity Image *", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  // Failure case: missing required field
  await assert.rejects(
    async () => {
      await service.saveBanner({ title: "Only Title" });
    },
    { message: "Title, Banner Image, and Activity Image are required." }
  );

  // Success case: all 3 required fields provided
  const res = await service.saveBanner({
    title: "IPL Mega Cashback",
    banner_image: "https://root.veronova.co.in/uploads/sliders/ipl_banner.jpg",
    activity_image: "https://root.veronova.co.in/uploads/sliders/ipl_activity.jpeg",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Activity banner added successfully");
  assert.equal(res.data.title, "IPL Mega Cashback");
  assert.equal(res.data.banner_image, "https://root.veronova.co.in/uploads/sliders/ipl_banner.jpg");
  assert.equal(res.data.activity_image, "https://root.veronova.co.in/uploads/sliders/ipl_activity.jpeg");
  assert.equal(res.data.status, 1);
});

test("AdminService.saveBanner edits an existing banner", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveBanner({
    id: 18,
    title: "Updated Bdg Casino Title",
    banner_image: "https://root.veronova.co.in/uploads/sliders/new_banner.jpg",
    status: 1,
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Activity banner updated successfully");
  assert.equal(res.data.id, 18);
  assert.equal(res.data.title, "Updated Bdg Casino Title");
  assert.equal(res.data.banner_image, "https://root.veronova.co.in/uploads/sliders/new_banner.jpg");
});

test("AdminService.saveBanner deletes a banner when action=delete", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveBanner({
    id: 19,
    action: "delete",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Activity banner deleted successfully");
  assert.equal(res.data.id, 19);
  assert.equal(res.data.status, -1);
  assert.equal(res.data.status_label, "Deleted");
});

test("Controller getBanners and saveBanner handle requests with standard envelopes", async () => {
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
  await controller.getBanners({ query: { limit: 10, offset: 0 } }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.ok(Array.isArray(resJson.data.banners));

  // 2. POST create
  await controller.saveBanner({
    body: {
      title: "Controller Title",
      banner_image: "https://example.com/banner.jpg",
      activity_image: "https://example.com/act.jpg",
    },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Activity banner added successfully");

  // 3. POST edit
  await controller.saveBanner({
    params: { id: "18" },
    body: { title: "Edited Title" },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Activity banner updated successfully");

  // 4. POST delete via params
  await controller.saveBanner({
    params: { id: "18" },
    body: { action: "delete" },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Activity banner deleted successfully");

  // 5. POST delete with id in body directly
  await controller.saveBanner({
    body: { id: 18, action: "delete" },
  }, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "Activity banner deleted successfully");
});

