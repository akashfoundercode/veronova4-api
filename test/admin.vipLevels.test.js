"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { AdminService, formatVipLevel } = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockVipLevels = [
    {
      id: 1,
      name: "vip 1",
      betting_range: "3000",
      deposit_range: "3000",
      level_up_rewards: 60,
      monthly_rewards: 30,
      rebate_rate: 0.06,
      safe_income: 0.2,
      days_count: 30,
      status: 1,
      created_at: new Date("2026-10-14T00:00:00.000Z"),
      updated_at: new Date("2026-10-14T00:00:00.000Z"),
    },
    {
      id: 2,
      name: "vip 2",
      betting_range: "10000",
      deposit_range: "10000",
      level_up_rewards: 180,
      monthly_rewards: 90,
      rebate_rate: 0.07,
      safe_income: 0.22,
      days_count: 30,
      status: 0,
      created_at: new Date("2026-10-14T00:00:00.000Z"),
      updated_at: new Date("2026-10-14T00:00:00.000Z"),
    },
  ];

  return {
    calls,
    mockVipLevels,
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("CREATE TABLE IF NOT EXISTS vip_levels")) {
        return [{ affectedRows: 0 }, []];
      }
      if (sql.includes("SELECT COUNT(*) AS total FROM vip_levels")) {
        return [[{ total: mockVipLevels.length }], []];
      }
      if (sql.includes("FROM vip_levels") && sql.includes("ORDER BY id ASC")) {
        return [mockVipLevels, []];
      }
      if (sql.includes("UPDATE vip_levels")) {
        const targetId = params[params.length - 1];
        const record = mockVipLevels.find((v) => v.id === targetId);
        if (record) {
          record.name = params[0];
          record.betting_range = params[1];
          record.deposit_range = params[2];
          record.level_up_rewards = params[3];
          record.monthly_rewards = params[4];
          record.rebate_rate = params[5];
          record.safe_income = params[6];
          record.days_count = params[7];
          record.status = params[8];
        }
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("INSERT INTO vip_levels")) {
        const newRecord = {
          id: 3,
          name: params[0],
          betting_range: params[1],
          deposit_range: params[2],
          level_up_rewards: params[3],
          monthly_rewards: params[4],
          rebate_rate: params[5],
          safe_income: params[6],
          days_count: params[7],
          status: params[8],
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockVipLevels.push(newRecord);
        return [{ insertId: 3 }, []];
      }
      if (sql.includes("WHERE id = ?")) {
        const found = mockVipLevels.find((v) => v.id === params[0]);
        return [found ? [found] : [], []];
      }
      throw new Error(`Unhandled VIP level mock SQL: ${sql}`);
    },
  };
}

test("dashboardConfig and API_ROUTES include VIP level routes", () => {
  assert.equal(DASHBOARD_ROUTES.vipLevels, "/admin/vip-levels");
  assert.equal(DASHBOARD_ROUTES.vipLevelItem, "/admin/vip-levels/:id");
  assert.equal(API_ROUTES.admin.vipLevels, "/admin/vip-levels");
  assert.equal(API_ROUTES.admin.vipLevelItem, "/admin/vip-levels/:id");
});

test("formatVipLevel formats all expected fields correctly", () => {
  const row = {
    id: 1,
    name: "vip 1",
    betting_range: "3000",
    level_up_rewards: 60,
    monthly_rewards: 30,
    status: 1,
  };
  const formatted = formatVipLevel(row);
  assert.deepEqual(formatted, {
    id: 1,
    name: "vip 1",
    betting_range: "3000",
    level_up_rewards: 60,
    monthly_rewards: 30,
    action: ["edit", "update"],
  });
});

test("AdminService.getVipLevels retrieves VIP list with limit and offset", async () => {
  const mockPool = createMockPool();
  const service = new AdminService({ poolProvider: () => mockPool });

  const result = await service.getVipLevels({ limit: 10, offset: 0 });
  assert.equal(result.pagination.total, 2);
  assert.equal(result.pagination.limit, 10);
  assert.equal(result.pagination.offset, 0);
  assert.equal(result.list.length, 2);
  assert.equal(result.history.length, 2);
  assert.equal(result.list[0].name, "vip 1");
  assert.equal(result.list[0].betting_range, "3000");
  assert.equal(result.list[0].level_up_rewards, 60);
  assert.equal(result.list[0].monthly_rewards, 30);
  assert.deepEqual(result.list[0].action, ["edit", "update"]);
});

test("AdminService.getVipLevels retrieves single VIP level when id is provided", async () => {
  const mockPool = createMockPool();
  const service = new AdminService({ poolProvider: () => mockPool });

  const result = await service.getVipLevels({ id: 1 });
  assert.equal(result.id, 1);
  assert.equal(result.name, "vip 1");
  assert.equal(result.betting_range, "3000");
  assert.equal(result.level_up_rewards, 60);
});

test("AdminService.saveVipLevel updates existing VIP level", async () => {
  const mockPool = createMockPool();
  const service = new AdminService({ poolProvider: () => mockPool });

  const result = await service.saveVipLevel({
    id: 1,
    name: "vip 1 updated",
    betting_range: "3500",
    level_up_rewards: 80,
    monthly_rewards: 40,
  });

  assert.equal(result.message, "VIP level updated successfully");
  assert.equal(result.data.name, "vip 1 updated");
  assert.equal(result.data.betting_range, "3500");
  assert.equal(result.data.level_up_rewards, 80);
  assert.equal(result.data.monthly_rewards, 40);
});

test("AdminService.saveVipLevel creates a new VIP level", async () => {
  const mockPool = createMockPool();
  const service = new AdminService({ poolProvider: () => mockPool });

  const result = await service.saveVipLevel({
    name: "vip 3",
    betting_range: "50000",
    level_up_rewards: 500,
    monthly_rewards: 250,
  });

  assert.equal(result.message, "VIP level created successfully");
  assert.equal(result.data.id, 3);
  assert.equal(result.data.name, "vip 3");
  assert.equal(result.data.betting_range, "50000");
  assert.equal(result.data.level_up_rewards, 500);
  assert.equal(result.data.monthly_rewards, 250);
  assert.deepEqual(result.data.action, ["edit", "update"]);
});

test("admin.controller getVipLevels and saveVipLevel respond with standard envelope", async () => {
  const mockPool = createMockPool();
  controller.service.poolProvider = () => mockPool;

  // GET
  let resStatus = 0;
  let resJson = null;
  const mockResGet = {
    status(s) {
      resStatus = s;
      return this;
    },
    json(j) {
      resJson = j;
      return this;
    },
  };

  await controller.getVipLevels({ query: { limit: 10, offset: 0 } }, mockResGet);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "VIP levels fetched successfully");
  assert.ok(Array.isArray(resJson.data.list));

  // POST (Create)
  await controller.saveVipLevel({
    body: {
      name: "vip 4",
      betting_range: "100000",
      level_up_rewards: 1000,
      monthly_rewards: 500,
    },
  }, mockResGet);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "VIP level created successfully");
  assert.equal(resJson.data.name, "vip 4");

  // POST (Update)
  await controller.saveVipLevel({
    body: {
      id: 1,
      name: "vip 1 modified",
      betting_range: "4000",
      level_up_rewards: 100,
      monthly_rewards: 50,
    },
  }, mockResGet);
  assert.equal(resStatus, 200);
  assert.equal(resJson.status, 200);
  assert.equal(resJson.message, "VIP level updated successfully");
  assert.equal(resJson.data.name, "vip 1 modified");
});

