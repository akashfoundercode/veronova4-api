"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const app = require("../src/app");
const { LegacyApiService } = require("../src/modules/legacyApi/legacyApi.service");
const adminController = require("../src/modules/admin/admin.controller");

function createMockPool() {
  const feedbacks = [];
  let nextId = 1;

  return {
    feedbacks,
    async execute(sql, params = []) {
      const normalizedSql = sql.trim();

      if (normalizedSql.includes("CREATE TABLE IF NOT EXISTS feedbacks")) {
        return [{ affectedRows: 0 }, []];
      }

      if (normalizedSql.startsWith("INSERT INTO feedbacks")) {
        const [userid, description] = params;
        const newFeedback = {
          id: nextId++,
          userid: Number(userid),
          description: String(description),
          status: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        feedbacks.push(newFeedback);
        return [{ insertId: newFeedback.id, affectedRows: 1 }, []];
      }

      if (normalizedSql.includes("COUNT(*) AS total FROM feedbacks")) {
        return [[{ total: feedbacks.length }], []];
      }

      if (normalizedSql.includes("FROM feedbacks") && normalizedSql.includes("WHERE f.id = ?")) {
        const id = Number(params[0]);
        const found = feedbacks.find((f) => f.id === id);
        return [found ? [{ ...found, uname: "testuser", username: "testuser", mobile: "9876543210", email: "test@example.com" }] : [], []];
      }

      if (normalizedSql.includes("SELECT id FROM feedbacks WHERE id = ?")) {
        const id = Number(params[0]);
        const found = feedbacks.find((f) => f.id === id);
        return [found ? [{ id: found.id }] : [], []];
      }

      if (normalizedSql.startsWith("UPDATE feedbacks SET")) {
        const id = Number(params[params.length - 1]);
        const found = feedbacks.find((f) => f.id === id);
        if (found) {
          if (params.length === 3) {
            found.status = Number(params[0]);
            found.description = String(params[1]);
          } else if (params.length === 2) {
            found.status = Number(params[0]);
          }
          found.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: found ? 1 : 0 }, []];
      }

      if (normalizedSql.startsWith("DELETE FROM feedbacks WHERE id = ?")) {
        const id = Number(params[0]);
        const idx = feedbacks.findIndex((f) => f.id === id);
        if (idx !== -1) feedbacks.splice(idx, 1);
        return [{ affectedRows: 1 }, []];
      }

      if (normalizedSql.includes("FROM feedbacks")) {
        const rows = feedbacks.map((f) => ({
          ...f,
          uname: "testuser",
          username: "testuser",
          mobile: "9876543210",
          email: "test@example.com",
        }));
        return [rows, []];
      }

      return [[], []];
    },
  };
}

function testRoute(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resBody = null;
    const req = {
      method,
      url,
      headers: { host: "root.veronova.co.in", ...headers },
      body: body || {},
    };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v;
      },
      getHeader(k) {
        return this.headers[k.toLowerCase()];
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resBody = data;
        resolve({ statusCode, body: resBody });
      },
      send(data) {
        resBody = data;
        resolve({ statusCode, body: resBody, headers: this.headers });
      },
      end(data) {
        resolve({ statusCode, body: data || resBody, headers: this.headers });
      },
    };
    app.handle(req, res, (err) => {
      resolve({ statusCode: 500, error: err });
    });
  });
}

test("User Feedback API validation and submission", async () => {
  const mockPool = createMockPool();
  const legacyController = require("../src/modules/legacyApi/legacyApi.controller");
  const testService = new LegacyApiService(() => mockPool);

  // Directly test service
  const resValid = await testService.addFeedback({ userid: 13, description: "Great game!" });
  assert.equal(resValid.status, 200);
  assert.equal(resValid.message, "Successfully");
  assert.equal(resValid.data, true);
  assert.equal(mockPool.feedbacks.length, 1);

  // Validation tests
  await assert.rejects(
    () => testService.addFeedback({ description: "No user id" }),
    { statusCode: 400, message: "The userid field is required." }
  );

  await assert.rejects(
    () => testService.addFeedback({ userid: 13 }),
    { statusCode: 400, message: "The description field is required." }
  );

  // Test getFeedback
  const getRes = await testService.getFeedback({ userid: 13 });
  assert.equal(getRes.status, 200);
  assert.equal(getRes.message, "Successfully");
  assert.equal(getRes.data.length, 1);
  assert.equal(getRes.data[0].description, "Great game!");
});

test("Admin Feedback Management (list, update, delete)", async () => {
  const mockPool = createMockPool();
  // Seed initial feedbacks
  mockPool.feedbacks.push(
    { id: 1, userid: 10, description: "First feedback", status: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, userid: 11, description: "Second feedback", status: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  );

  const { AdminService } = require("../src/modules/admin/admin.service");
  const adminService = new AdminService(() => mockPool);

  // 1. List feedbacks
  const listRes = await adminService.getFeedbacks();
  assert.equal(listRes.status, 200);
  assert.equal(listRes.total, 2);
  assert.equal(listRes.data.length, 2);

  // 2. Fetch single feedback
  const singleRes = await adminService.getFeedbacks({ id: 1 });
  assert.equal(singleRes.status, 200);
  assert.equal(singleRes.data.id, 1);
  assert.equal(singleRes.data.description, "First feedback");

  // 3. Update feedback
  const updateRes = await adminService.updateFeedback(1, { status: 0, description: "Resolved feedback" });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.message, "Feedback updated successfully");
  assert.equal(updateRes.data.status, 0);

  // 4. Delete feedback
  const deleteRes = await adminService.deleteFeedback(1);
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.message, "Feedback deleted successfully");

  // Verify it is gone
  await assert.rejects(
    () => adminService.getFeedbacks({ id: 1 }),
    { statusCode: 404 }
  );
});

test("HTTP Route integration for feedback", async () => {
  // Test missing userid through HTTP route
  const noUserRes = await testRoute("POST", "/api/feedback", {}, { description: "Great game!" });
  assert.equal(noUserRes.statusCode, 400);
  assert.ok(noUserRes.body.message.includes("userid"));

  // Test missing description through HTTP route
  const noDescRes = await testRoute("POST", "/api/feedback", {}, { userid: 13 });
  assert.equal(noDescRes.statusCode, 400);
  assert.ok(noDescRes.body.message.includes("description"));
});
