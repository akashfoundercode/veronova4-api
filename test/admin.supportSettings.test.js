"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  AdminService,
  formatSupportSetting,
} = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockSettings = [
    {
      id: 1,
      name: "Telegram",
      socialmedia: "https://t.me/veronova_official",
      status: 1,
      datetime: new Date("2024-06-04T06:38:14.000Z"),
    },
    {
      id: 2,
      name: "Channel",
      socialmedia: "https://t.me/veronova_channel",
      status: 1,
      datetime: new Date("2024-06-04T06:38:14.000Z"),
    },
    {
      id: 3,
      name: "Email",
      socialmedia: "mailto:support@veronova.co.in",
      status: 1,
      datetime: new Date("2024-06-04T06:38:14.000Z"),
    },
  ];

  return {
    calls,
    mockSettings,
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.includes("CREATE TABLE IF NOT EXISTS support_setting")) {
        return [{ affectedRows: 0 }, []];
      }

      if (sql.includes("COUNT(*) AS total_support")) {
        const nonDeleted = mockSettings.filter((s) => s.status !== -1);
        return [[{
          total_support: nonDeleted.length,
          active_support: nonDeleted.filter((s) => s.status === 1).length,
          inactive_support: nonDeleted.filter((s) => s.status === 0).length,
        }], []];
      }

      if (sql.includes("COUNT(*) AS total") && sql.includes("FROM support_setting")) {
        let items = mockSettings.filter((s) => s.status !== -1);
        if (sql.includes("name LIKE ?")) {
          const s = String(params[0]).replace(/%/g, "").toLowerCase();
          items = items.filter((item) => item.name.toLowerCase().includes(s) || item.socialmedia.toLowerCase().includes(s));
        }
        return [[{ total: items.length }], []];
      }

      if (sql.includes("SELECT * FROM support_setting WHERE id = ? LIMIT 1")) {
        const targetId = Number(params[0]);
        const found = mockSettings.find((s) => s.id === targetId);
        return found ? [[found], []] : [[], []];
      }

      if (sql.includes("SELECT * FROM support_setting WHERE") && sql.includes("ORDER BY id ASC")) {
        let items = mockSettings.filter((s) => s.status !== -1);
        if (sql.includes("name LIKE ?")) {
          const s = String(params[0]).replace(/%/g, "").toLowerCase();
          items = items.filter((item) => item.name.toLowerCase().includes(s) || item.socialmedia.toLowerCase().includes(s));
        }
        return [items, []];
      }

      if (sql.includes("UPDATE support_setting SET status = -1")) {
        const targetId = Number(params[0]);
        const target = mockSettings.find((s) => s.id === targetId);
        if (target) {
          target.status = -1;
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE support_setting")) {
        const targetId = Number(params[params.length - 1]);
        const target = mockSettings.find((s) => s.id === targetId);
        if (target) {
          target.name = params[0];
          target.socialmedia = params[1];
          target.status = params[2];
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("INSERT INTO support_setting")) {
        const newId = mockSettings.length + 10;
        const inserted = {
          id: newId,
          name: params[0],
          socialmedia: params[1],
          status: params[2],
          datetime: new Date(),
        };
        mockSettings.push(inserted);
        return [{ insertId: newId, affectedRows: 1 }, []];
      }

      return [[], []];
    },
  };
}

test("DASHBOARD_ROUTES and API_ROUTES expose supportSettings and supportSettingItem routes", () => {
  assert.equal(DASHBOARD_ROUTES.supportSettings, "/admin/support-settings");
  assert.equal(DASHBOARD_ROUTES.supportSettingItem, "/admin/support-settings/:id");
  assert.equal(API_ROUTES.admin.supportSettings, "/admin/support-settings");
  assert.equal(API_ROUTES.admin.supportSettingItem, "/admin/support-settings/:id");
});

test("formatSupportSetting accurately formats Id, name, Social Media, Action", () => {
  const row = {
    id: 1,
    name: "Telegram",
    socialmedia: "https://t.me/veronova_official",
    status: 1,
    datetime: new Date("2024-06-04T06:38:14.000Z"),
  };

  const formatted = formatSupportSetting(row);
  assert.equal(formatted.Id, 1);
  assert.equal(formatted.id, 1);
  assert.equal(formatted.name, "Telegram");
  assert.equal(formatted["Social Media"], "https://t.me/veronova_official");
  assert.equal(formatted.social_media, "https://t.me/veronova_official");
  assert.equal(formatted.Status, 1);
  assert.equal(formatted.status_label, "Active");
  assert.ok(formatted.Date);
  assert.ok(Array.isArray(formatted.Action));
  assert.ok(formatted.Action.includes("edit"));
  assert.ok(formatted.Action.includes("delete"));
});

test("AdminService.getSupportSettings retrieves list with 3 entries and summary", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getSupportSettings({ limit: 10, offset: 0 });
  assert.ok(res.summary);
  assert.equal(res.summary.total_support, 3);
  assert.equal(res.summary.active_support, 3);
  assert.equal(res.pagination.total, 3);
  assert.equal(res.support_settings.length, 3);

  assert.equal(res.support_settings[0].name, "Telegram");
  assert.equal(res.support_settings[1].name, "Channel");
  assert.equal(res.support_settings[2].name, "Email");
});

test("AdminService.getSupportSettings retrieves single setting by id", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.getSupportSettings({ id: 2 });
  assert.ok(res.support_setting);
  assert.equal(res.support_setting.Id, 2);
  assert.equal(res.support_setting.name, "Channel");
  assert.equal(res.support_setting["Social Media"], "https://t.me/veronova_channel");
});

test("AdminService.saveSupportSetting creates a new support setting", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  await assert.rejects(
    () => service.saveSupportSetting({ socialmedia: "https://wa.me/12345" }),
    { message: "Support name is required." }
  );

  const res = await service.saveSupportSetting({
    name: "WhatsApp",
    social_media: "https://wa.me/919999999999",
    status: 1,
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Support setting added successfully");
  assert.equal(res.data.name, "WhatsApp");
  assert.equal(res.data["Social Media"], "https://wa.me/919999999999");
});

test("AdminService.saveSupportSetting edits an existing support setting", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.saveSupportSetting({
    id: 1,
    name: "Telegram Support",
    social_media: "https://t.me/veronova_support_new",
    status: 1,
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Support setting updated successfully");
  assert.equal(res.data.Id, 1);
  assert.equal(res.data.name, "Telegram Support");
  assert.equal(res.data["Social Media"], "https://t.me/veronova_support_new");
});

test("AdminService.saveSupportSetting deletes a support setting when action=delete", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  const res = await service.saveSupportSetting({
    id: 3,
    action: "delete",
  });

  assert.equal(res.success, true);
  assert.equal(res.message, "Support setting deleted successfully");
  assert.equal(res.data.id, 3);
  assert.equal(res.data.status, -1);
});

test("Controller getSupportSettings and saveSupportSetting handle requests with standard envelopes", async () => {
  const pool = createMockPool();
  const originalProvider = controller.service.poolProvider;
  controller.service.poolProvider = () => pool;

  try {
    let statusCode;
    let jsonResponse;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };

    // 1. GET list
    await controller.getSupportSettings({ query: { limit: "10" } }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Support settings fetched successfully");
    assert.ok(Array.isArray(jsonResponse.data.support_settings));

    // 2. GET single
    await controller.getSupportSettings({ params: { id: "1" }, query: {} }, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Support setting fetched successfully");
    assert.equal(jsonResponse.data.support_setting.Id, 1);

    // 3. POST save
    await controller.saveSupportSetting(
      { body: { name: "Live Chat", social_media: "https://tawk.to/chat" } },
      res
    );
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.status, 200);
    assert.equal(jsonResponse.message, "Support setting added successfully");
    assert.equal(jsonResponse.data.name, "Live Chat");
  } finally {
    controller.service.poolProvider = originalProvider;
  }
});

