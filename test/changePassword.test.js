"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const app = require("../src/app");
const { AuthService } = require("../src/modules/auth/auth.service");

function createMockPool() {
  const users = [
    {
      id: 13,
      username: "player13",
      mobile: "9876543210",
      password: "oldpassword123",
      status: 1,
    },
  ];

  return {
    users,
    async execute(sql, params = []) {
      const normalizedSql = sql.trim();

      if (normalizedSql.includes("SELECT id, password, status FROM users WHERE id = ?")) {
        const id = Number(params[0]);
        const user = users.find((u) => u.id === id);
        return [user ? [user] : [], []];
      }

      if (normalizedSql.includes("SELECT id, password, status FROM users WHERE mobile = ?")) {
        const mobile = String(params[0]);
        const user = users.find((u) => u.mobile === mobile);
        return [user ? [user] : [], []];
      }

      if (normalizedSql.startsWith("UPDATE users SET password = ?")) {
        const newPass = String(params[0]);
        const id = Number(params[1]);
        const user = users.find((u) => u.id === id);
        if (user) {
          user.password = newPass;
        }
        return [{ affectedRows: user ? 1 : 0 }, []];
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
      headers: { host: "api.wingo4all.site", ...headers },
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

test("AuthService.changePassword validates inputs and updates password", async () => {
  const mockPool = createMockPool();
  const authService = new AuthService(() => mockPool);

  // 1. Missing userid
  const r1 = await authService.changePassword({ old_password: "old", new_password: "new", confirm_password: "new" });
  assert.equal(r1.status, 400);
  assert.ok(r1.msg.includes("userid"));

  // 2. Missing old_password
  const r2 = await authService.changePassword({ userid: 13, new_password: "new", confirm_password: "new" });
  assert.equal(r2.status, 400);
  assert.ok(r2.msg.includes("old password"));

  // 3. Missing new_password
  const r3 = await authService.changePassword({ userid: 13, old_password: "old", confirm_password: "new" });
  assert.equal(r3.status, 400);
  assert.ok(r3.msg.includes("new password"));

  // 4. Missing confirm_password
  const r4 = await authService.changePassword({ userid: 13, old_password: "old", new_password: "new" });
  assert.equal(r4.status, 400);
  assert.ok(r4.msg.includes("confirm password"));

  // 5. Mismatched confirm_password
  const r5 = await authService.changePassword({
    userid: 13,
    old_password: "oldpassword123",
    new_password: "newpass123",
    confirm_password: "wrongpass",
  });
  assert.equal(r5.status, 400);
  assert.ok(r5.msg.includes("must match"));

  // 6. User not found
  const r6 = await authService.changePassword({
    userid: 9999,
    old_password: "oldpassword123",
    new_password: "newpass123",
    confirm_password: "newpass123",
  });
  assert.equal(r6.status, 404);
  assert.equal(r6.msg, "User not found");

  // 7. Incorrect old password
  const r7 = await authService.changePassword({
    userid: 13,
    old_password: "wrongoldpassword",
    new_password: "newpass123",
    confirm_password: "newpass123",
  });
  assert.equal(r7.status, 400);
  assert.equal(r7.msg, "Incorrect old password");

  // 8. Successful change
  const r8 = await authService.changePassword({
    userid: 13,
    old_password: "oldpassword123",
    new_password: "newpass123",
    confirm_password: "newpass123",
  });
  assert.equal(r8.status, 200);
  assert.equal(r8.msg, "Password changed successfully!");
  assert.equal(mockPool.users[0].password, "newpass123");

  // 9. Now old password no longer works
  const r9 = await authService.changePassword({
    userid: 13,
    old_password: "oldpassword123",
    new_password: "anotherpass",
    confirm_password: "anotherpass",
  });
  assert.equal(r9.status, 400);
  assert.equal(r9.msg, "Incorrect old password");
});

test("HTTP Route POST /api/changePassword handles validation through express", async () => {
  // Test missing userid through HTTP route
  const resNoUser = await testRoute("POST", "/api/changePassword", {}, {
    old_password: "old",
    new_password: "new",
    confirm_password: "new",
  });
  assert.equal(resNoUser.statusCode, 400);
  assert.ok(resNoUser.body.msg.includes("userid"));

  // Test missing old_password
  const resNoOld = await testRoute("POST", "/api/changePassword", {}, {
    userid: 13,
    new_password: "new",
    confirm_password: "new",
  });
  assert.equal(resNoOld.statusCode, 400);
  assert.ok(resNoOld.body.msg.includes("old password"));

  // Test mismatch
  const resMismatch = await testRoute("POST", "/api/changePassword", {}, {
    userid: 13,
    old_password: "old",
    new_password: "new1",
    confirm_password: "new2",
  });
  assert.equal(resMismatch.statusCode, 400);
  assert.ok(resMismatch.body.msg.includes("must match"));
});
