"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { AdminService, formatSalaryRecord } = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockLevels = [
    { id: 1, name: "Level 1", count: 1, commission: 0.6, cashback: 0, status: 1 },
    { id: 2, name: "Level 2", count: 2, commission: 0.18, cashback: 0, status: 1 },
    { id: 3, name: "Level 3", count: 3, commission: 0.054, cashback: 0, status: 1 },
    { id: 4, name: "Level 4", count: 4, commission: 0.016, cashback: 0, status: 1 },
    { id: 5, name: "Level 5", count: 5, commission: 0.0048, cashback: 0, status: 1 },
    { id: 6, name: "Level 6", count: 6, commission: 0.0014, cashback: 0, status: 1 },
  ];

  const mockUsers = [
    { id: 1, u_id: "UID_1", username: "AgentOne", mobile: "9999900001", referral_user_id: null, wallet: 500, status: 1 },
    { id: 2, u_id: "UID_2", username: "UserTwo", mobile: "9999900002", referral_user_id: 1, wallet: 100, status: 1 },
    { id: 3, u_id: "UID_3", username: "UserThree", mobile: "9999900003", referral_user_id: 2, wallet: 50, status: 1 },
  ];

  const mockSalaryRecords = [
    {
      id: 1,
      user_id: 1,
      salary_amount: 1500,
      remark: "Monthly Agent Salary",
      status: 1,
      created_at: new Date("2026-10-14T10:00:00.000Z"),
      updated_at: new Date("2026-10-14T10:00:00.000Z"),
      u_id: "UID_1",
      username: "AgentOne",
      mobile: "9999900001",
      email: null,
      wallet: 2000,
      active_players: 2,
      downline_levels: 6,
      salary_type: "daily",
      daily_deposit: 5000,
      daily_withdrawal: 2000,
      daily_profit_loss: 3000,
      monthly_deposit: 50000,
      monthly_withdrawal: 20000,
      monthly_profit_loss: 30000,
    },
  ];

  return {
    calls,
    mockLevels,
    mockUsers,
    mockSalaryRecords,
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.includes("CREATE TABLE IF NOT EXISTS mlm_levels") || sql.includes("CREATE TABLE IF NOT EXISTS all_users_salary_record") || sql.includes("CREATE TABLE IF NOT EXISTS user_salary")) {
        return [{ affectedRows: 0 }, []];
      }

      if (sql.includes("SELECT * FROM mlm_levels WHERE id = ?")) {
        const found = mockLevels.find((l) => l.id === Number(params[0])) || mockLevels[0];
        return [[found], []];
      }

      if (sql.includes("FROM mlm_levels")) {
        return [mockLevels, []];
      }

      if (sql.includes("UPDATE mlm_levels")) {
        const id = Number(params[params.length - 1]);
        const target = mockLevels.find((l) => l.id === id);
        if (target) {
          target.name = params[0];
          target.commission = Number(params[1]);
          target.cashback = params[2];
          target.status = Number(params[3]);
        }
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes("COUNT(DISTINCT referral_user_id) AS total_agents")) {
        return [[{ total_agents: 1, total_network_members: 2 }], []];
      }

      if (sql.includes("COUNT(r.id) AS direct_referrals_count")) {
        return [[{
          id: 1,
          u_id: "UID_1",
          username: "AgentOne",
          mobile: "9999900001",
          referral_code: "REF123",
          wallet: 500,
          turnover: 15000,
          status: 1,
          direct_referrals_count: 1,
        }], []];
      }

      if (sql.includes("FROM users") && (sql.includes("u_id = ?") || sql.includes("id = ?"))) {
        const p0 = params ? params[0] : 1;
        const target = mockUsers.find((u) => u.id === Number(p0) || u.u_id === p0) || mockUsers[0];
        return [[target], []];
      }

      if (sql.includes("referral_user_id IN")) {
        const parentId = params && params.length ? Number(params[0]) : null;
        if (parentId === 1) {
          return [[mockUsers[1]], []];
        }
        if (parentId === 2) {
          return [[mockUsers[2]], []];
        }
        return [[], []];
      }

      if (sql.includes("SUM(amount) AS total_turnover FROM bets")) {
        return [[{ total_turnover: 12000 }], []];
      }

      if (sql.includes("SUM(money) AS total_recharge FROM recharge")) {
        return [[{ total_recharge: 5000 }], []];
      }

      if (sql.includes("COUNT(*) AS total_records") && sql.includes("FROM user_salary")) {
        return [[{
          total_salary_amount: 1500,
          total_records: 1,
          unique_users: 1,
          daily_salary_count: 1,
          monthly_salary_count: 0,
        }], []];
      }

      if (sql.includes("COUNT(*) AS total") && sql.includes("FROM user_salary")) {
        return [[{ total: 1 }], []];
      }

      if (sql.includes("FROM user_salary s") && sql.includes("ORDER BY s.id DESC")) {
        return [mockSalaryRecords, []];
      }

      if (sql.includes("WHERE s.id = ?")) {
        return [[{
          ...mockSalaryRecords[0],
          id: params[0],
          salary: params[0] === 2 ? 1000 : 1500,
          salary_amount: params[0] === 2 ? 1000 : 1500,
        }], []];
      }

      if (sql.includes("INSERT INTO all_users_salary_record")) {
        return [{ insertId: 2, affectedRows: 1 }, []];
      }

      if (sql.includes("INSERT INTO user_salary")) {
        return [{ insertId: 2, affectedRows: 1 }, []];
      }

      if (sql.includes("UPDATE users SET wallet = wallet + ? WHERE id = ?")) {
        return [{ affectedRows: 1 }, []];
      }

      return [[], []];
    },
  };
}

test("DASHBOARD_ROUTES and API_ROUTES expose mlmLevels and salaryList routes", () => {
  assert.equal(DASHBOARD_ROUTES.mlmLevels, "/admin/mlm-levels");
  assert.equal(DASHBOARD_ROUTES.mlmLevelUser, "/admin/mlm-levels/:userId");
  assert.equal(DASHBOARD_ROUTES.salaryList, "/admin/salary-list");
  assert.equal(DASHBOARD_ROUTES.salaryUser, "/admin/salary-list/:userId");

  assert.equal(API_ROUTES.admin.mlmLevels, "/admin/mlm-levels");
  assert.equal(API_ROUTES.admin.salaryList, "/admin/salary-list");
});

test("formatSalaryRecord accurately shapes salary row", () => {
  const row = {
    id: 1,
    user_id: 10,
    u_id: "UID_99",
    username: "TestUser",
    mobile: "9876543210",
    email: "test@example.com",
    salary_amount: "5000.00",
    remark: "Monthly bonus",
    status: 1,
    wallet: "12500.50",
    active_players: 5,
    downline_levels: 6,
    salary_type: "daily",
    daily_deposit: "10000",
    daily_withdrawal: "4000",
    daily_profit_loss: "6000",
    monthly_deposit: "100000",
    monthly_withdrawal: "40000",
    monthly_profit_loss: "60000",
    created_at: new Date("2026-10-15T00:00:00.000Z"),
  };

  const formatted = formatSalaryRecord(row);
  assert.equal(formatted.id, 1);
  assert.equal(formatted.user_id, 10);
  assert.equal(formatted.u_id, "UID_99");
  assert.equal(formatted.salary_amount, 5000);
  assert.equal(formatted.remark, "Monthly bonus");
  assert.equal(formatted.salary_type, 1);
  assert.equal(formatted.salary_type_label, "Daily Salary");
  assert.equal(formatted.status_label, "Paid");
  assert.equal(formatted.active_players, 5);
  assert.equal(formatted.daily_deposit, 10000);
});

test("AdminService.getMlmLevels returns global configuration when no user_id is provided", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.getMlmLevels({ limit: 10, offset: 0 });
  assert.ok(res);
  assert.equal(res.levels.length, 6);
  assert.equal(res.levels[0].name, "Level 1");
  assert.equal(res.levels[0].commission_percent, 60);
  assert.ok(Array.isArray(res.agents));
  assert.equal(res.pagination.limit, 10);
  assert.equal(res.pagination.offset, 0);
});

test("AdminService.getMlmLevels computes downline hierarchy when user_id is provided", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.getMlmLevels({ user_id: 1 });
  assert.ok(res.user);
  assert.equal(res.user.id, 1);
  assert.equal(res.user.u_id, "UID_1");
  assert.equal(res.summary.total_levels, 6);
  assert.equal(res.summary.total_team_members, 2); // 1 on L1, 1 on L2
  assert.equal(res.levels[0].level, 1);
  assert.equal(res.levels[0].members_count, 1);
  assert.equal(res.levels[1].level, 2);
  assert.equal(res.levels[1].members_count, 1);
});

test("AdminService.saveMlmLevel updates commission rate successfully", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveMlmLevel({ id: 1, commission: 0.65, status: 1 });
  assert.equal(res.success, true);
  assert.equal(res.data.commission, 0.65);
});

test("AdminService.getSalaryList fetches paginated records and summary", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.getSalaryList({ limit: 10, offset: 0 });
  assert.ok(res.summary);
  assert.equal(res.summary.total_records, 1);
  assert.equal(res.summary.total_amount, 1500);
  assert.equal(res.records.length, 1);
  assert.equal(res.records[0].user_id, 1);
  assert.equal(res.pagination.total, 1);
});

test("AdminService.saveSalary validates and grants salary to user wallet", async () => {
  const pool = createMockPool();
  const service = new AdminService(pool);

  const res = await service.saveSalary({
    user_id: 1,
    amount: 1000,
    salary_type: "daily",
    remark: "Daily performance salary",
  });

  assert.equal(res.success, true);
  assert.equal(res.data.salary_amount, 1000);
  assert.equal(res.data.user_id, 1);
});

test("Controller getMlmLevels and getSalaryList return standardized envelopes", async () => {
  const pool = createMockPool();
  controller.service.poolProvider = () => pool;
  controller.service.clock = () => new Date("2026-10-15T00:00:00.000Z");

  let responseData = null;
  let responseStatus = null;
  const mockRes = {
    status(code) {
      responseStatus = code;
      return {
        json(body) {
          responseData = body;
          return body;
        },
      };
    },
  };

  await controller.getMlmLevels({ query: { user_id: 1 } }, mockRes);
  assert.equal(responseStatus, 200);
  assert.equal(responseData.status, 200);
  assert.ok(responseData.data.levels);

  await controller.getSalaryList({ query: { search: "AgentOne", limit: 5 } }, mockRes);
  assert.equal(responseStatus, 200);
  assert.equal(responseData.status, 200);
  assert.ok(responseData.data.records);
});
