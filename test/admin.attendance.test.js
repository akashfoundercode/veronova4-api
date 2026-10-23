"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { AdminService, formatAttendance } = require("../src/modules/admin/admin.service");
const { DASHBOARD_ROUTES } = require("../src/config/dashboardConfig");
const { API_ROUTES } = require("../src/config/apiRoutes");
const controller = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const calls = [];
  const mockAttendances = [
    {
      id: 1,
      accumulated_amount: "500.00",
      attendance_bonus: "20.00",
      date: "2026-10-14",
      status: 1,
      created_at: new Date("2026-10-14T00:00:00.000Z"),
      updated_at: new Date("2026-10-14T00:00:00.000Z"),
    },
    {
      id: 2,
      accumulated_amount: "1000.00",
      attendance_bonus: "50.00",
      date: "2026-10-15",
      status: 1,
      created_at: new Date("2026-10-15T00:00:00.000Z"),
      updated_at: new Date("2026-10-15T00:00:00.000Z"),
    },
  ];

  return {
    calls,
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("CREATE TABLE IF NOT EXISTS attendances")) {
        return [{ affectedRows: 0 }, []];
      }
      if (sql.includes("SELECT COUNT(*) AS total FROM attendances")) {
        return [[{ total: mockAttendances.length }], []];
      }
      if (sql.includes("FROM attendances") && sql.includes("ORDER BY id ASC")) {
        return [mockAttendances, []];
      }
      if (sql.includes("UPDATE attendances")) {
        const targetId = params[4];
        const record = mockAttendances.find((a) => a.id === targetId);
        if (record) {
          record.accumulated_amount = params[0];
          record.attendance_bonus = params[1];
          record.date = params[2];
          record.status = params[3];
        }
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("INSERT INTO attendances")) {
        const newRecord = {
          id: 3,
          accumulated_amount: params[0],
          attendance_bonus: params[1],
          date: params[2],
          status: params[3],
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockAttendances.push(newRecord);
        return [{ insertId: 3 }, []];
      }
      if (sql.includes("WHERE id = ?")) {
        const found = mockAttendances.find((a) => a.id === params[0]);
        return [found ? [found] : [], []];
      }
      throw new Error(`Unhandled attendance mock SQL: ${sql}`);
    },
  };
}

test("dashboardConfig and API_ROUTES include attendance routes", () => {
  assert.equal(DASHBOARD_ROUTES.attendance, "/admin/attendance");
  assert.equal(DASHBOARD_ROUTES.attendanceItem, "/admin/attendance/:id");
  assert.equal(API_ROUTES.admin.attendance, "/admin/attendance");
  assert.equal(API_ROUTES.admin.attendanceItem, "/admin/attendance/:id");
});

test("formatAttendance formats required columns correctly", () => {
  const row = {
    id: 1,
    accumulated_amount: "500.00",
    attendance_bonus: "20.00",
    date: "2026-10-14",
    status: 1,
  };
  const formatted = formatAttendance(row);
  assert.equal(formatted.id, 1);
  assert.equal(formatted.accumulated_amount, 500);
  assert.equal(formatted.attendance_bonus, 20);
  assert.equal(formatted.date, "2026-10-14");
  assert.equal(formatted.status, 1);
  assert.equal(formatted.status_label, "Active");
  assert.deepEqual(formatted.action, ["edit", "update"]);
  assert.deepEqual(formatted.actions, ["edit", "update"]);
});

test("AdminService.getAttendance supports limit, offset, and single id query", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  // 1. Directory with limit and offset
  const res = await service.getAttendance({ limit: 10, offset: 0 });
  assert.equal(res.pagination.total, 2);
  assert.equal(res.pagination.limit, 10);
  assert.equal(res.pagination.offset, 0);
  assert.equal(res.list.length, 2);
  assert.equal(res.list[0].id, 1);
  assert.equal(res.list[0].accumulated_amount, 500);
  assert.equal(res.list[0].attendance_bonus, 20);
  assert.equal(res.list[0].date, "2026-10-14");
  assert.equal(res.list[0].status, 1);

  // 2. Querying single ID directly via same endpoint
  const single = await service.getAttendance({ id: 1 });
  assert.equal(single.id, 1);
  assert.equal(single.accumulated_amount, 500);
});

test("AdminService.saveAttendance handles both create and edit/update in one method", async () => {
  const pool = createMockPool();
  const service = new AdminService(() => pool);

  // 1. Create new record
  const created = await service.saveAttendance({
    accumulated_amount: 2000,
    attendance_bonus: 100,
    date: "2026-10-16",
    status: 1,
  });
  assert.equal(created.message, "Attendance created successfully");
  assert.equal(created.data.id, 3);
  assert.equal(created.data.accumulated_amount, 2000);
  assert.equal(created.data.attendance_bonus, 100);

  // 2. Edit / Update existing record
  const updated = await service.saveAttendance({
    id: 1,
    accumulated_amount: 600,
    attendance_bonus: 25,
  });
  assert.equal(updated.message, "Attendance updated successfully");
  assert.equal(updated.data.id, 1);
  assert.equal(updated.data.accumulated_amount, 600);
  assert.equal(updated.data.attendance_bonus, 25);
});

test("admin.controller getAttendance and saveAttendance work via HTTP endpoints", async () => {
  const pool = createMockPool();
  controller.service.poolProvider = () => pool;

  function createMockResponse() {
    return {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
  }

  // GET attendance
  const res1 = createMockResponse();
  await controller.getAttendance({ query: { limit: "10", offset: "0" } }, res1);
  assert.equal(res1.statusCode, 200);
  assert.equal(res1.body.message, "Attendance data fetched successfully");
  assert.ok(res1.body.data.list);

  // POST attendance (create)
  const res2 = createMockResponse();
  await controller.saveAttendance(
    { body: { accumulated_amount: 3000, attendance_bonus: 150, date: "2026-10-17" } },
    res2,
  );
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body.message, "Attendance created successfully");

  // POST attendance (edit / update with id)
  const res3 = createMockResponse();
  await controller.saveAttendance(
    { params: { id: "1" }, body: { attendance_bonus: 30 } },
    res3,
  );
  assert.equal(res3.statusCode, 200);
  assert.equal(res3.body.message, "Attendance updated successfully");
  assert.equal(res3.body.data.attendance_bonus, 30);
});
