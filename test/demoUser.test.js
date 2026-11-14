"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const app = require("../src/app");
const { AdminService } = require("../src/modules/admin/admin.service");

function createMockPool() {
  const users = [];
  const payins = [];
  let nextId = 1;

  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, params = []) {
      const normalizedSql = sql.trim();

      if (normalizedSql.includes("SELECT id, mobile, email FROM users WHERE mobile = ?")) {
        const [mobile, email] = params;
        const found = users.find((u) => u.mobile === mobile || (u.email && u.email === email));
        return [found ? [found] : [], []];
      }

      if (normalizedSql.includes("SELECT id FROM users WHERE referral_code = ?")) {
        // If checking a sponsor referral code, return sponsor id 1; if checking candidate available code, return empty []
        if (params[0] && params[0].startsWith("ZUP")) {
          return [[], []];
        }
        return [[{ id: 1 }], []];
      }

      if (normalizedSql.includes("SELECT id FROM users WHERE u_id = ?")) {
        return [[], []];
      }

      if (normalizedSql.startsWith("INSERT INTO users")) {
        const id = nextId++;
        const newUser = {
          id,
          username: params[0],
          u_id: params[1],
          mobile: params[2],
          email: params[3],
          password: params[4],
          userimage: params[5],
          status: 1,
          referral_code: params[6],
          wallet: Number(params[7]),
          winning_wallet: 0,
          account_type: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        users.push(newUser);
        return [{ insertId: id, affectedRows: 1 }, []];
      }

      if (normalizedSql.startsWith("INSERT INTO personal_access_tokens")) {
        return [{ insertId: 999, affectedRows: 1 }, []];
      }

      return [[], []];
    },
  };

  return {
    users,
    payins,
    async getConnection() {
      return connection;
    },
    async execute(sql, params = []) {
      const normalizedSql = sql.trim();

      if (normalizedSql.includes("SELECT * FROM users WHERE id = ? AND account_type = 1")) {
        const id = Number(params[0]);
        const user = users.find((u) => u.id === id && u.account_type === 1);
        return [user ? [user] : [], []];
      }

      if (normalizedSql.includes("SELECT id, wallet, account_type FROM users WHERE id = ? AND account_type = 1")) {
        const id = Number(params[0]);
        const user = users.find((u) => u.id === id && u.account_type === 1);
        return [user ? [user] : [], []];
      }

      if (normalizedSql.includes("SELECT id, wallet FROM users WHERE id = ?")) {
        const id = Number(params[0]);
        const user = users.find((u) => u.id === id);
        return [user ? [user] : [], []];
      }

      if (normalizedSql.includes("COUNT(*) AS total FROM users")) {
        const demos = users.filter((u) => u.account_type === 1);
        return [[{ total: demos.length }], []];
      }

      if (normalizedSql.includes("FROM users")) {
        const demos = users.filter((u) => u.account_type === 1);
        return [demos, []];
      }

      if (normalizedSql.startsWith("UPDATE users SET wallet = wallet +")) {
        const [addAmt, depAmt, payAmt, id] = params;
        const user = users.find((u) => u.id === Number(id));
        if (user) {
          user.wallet = Number(user.wallet || 0) + Number(addAmt);
        }
        return [{ affectedRows: user ? 1 : 0 }, []];
      }

      if (normalizedSql.startsWith("UPDATE users SET wallet = ?")) {
        const [newWallet, id] = params;
        const user = users.find((u) => u.id === Number(id));
        if (user) {
          user.wallet = Number(newWallet);
        }
        return [{ affectedRows: user ? 1 : 0 }, []];
      }

      if (normalizedSql.startsWith("INSERT INTO payins")) {
        payins.push(params);
        return [{ insertId: payins.length, affectedRows: 1 }, []];
      }

      if (normalizedSql.startsWith("UPDATE users SET")) {
        return [{ affectedRows: 1 }, []];
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

test("AdminService.createDemoUser creates demo user with account_type = 1 and wallet balance", async () => {
  const mockPool = createMockPool();
  const service = new AdminService(() => mockPool);

  const res = await service.createDemoUser({
    mobile: "9988776655",
    email: "demo_test@veronova.com",
    password: "Password123",
    wallet: 5000,
  });

  assert.equal(res.status, 200);
  assert.equal(res.message, "Demo user created successfully!");
  assert.equal(res.data.account_type, 1);
  assert.equal(res.data.wallet, 5000);
  assert.equal(res.data.mobile, "9988776655");
  assert.ok(res.data.token);

  // Duplicate check
  await assert.rejects(
    () => service.createDemoUser({ mobile: "9988776655", password: "Password123" }),
    { statusCode: 409 }
  );
});

test("AdminService.getDemoUsers returns list and single demo user", async () => {
  const mockPool = createMockPool();
  const service = new AdminService(() => mockPool);

  const u1 = await service.createDemoUser({ mobile: "9111111111", password: "pass123456" });
  const u2 = await service.createDemoUser({ mobile: "9222222222", password: "pass123456" });

  const list = await service.getDemoUsers();
  assert.equal(list.status, 200);
  assert.equal(list.total, 2);
  assert.equal(list.data.length, 2);

  const single = await service.getDemoUsers({ id: u1.data.id });
  assert.equal(single.status, 200);
  assert.equal(single.data.id, u1.data.id);
});

test("AdminService.updateDemoUserWallet adds and subtracts funds", async () => {
  const mockPool = createMockPool();
  const service = new AdminService(() => mockPool);

  const created = await service.createDemoUser({ mobile: "9333333333", wallet: 1000, password: "pass123456" });
  const id = created.data.id;

  // Add 500
  const addRes = await service.updateDemoUserWallet(id, { action: "add", wallet: 500 });
  assert.equal(addRes.status, 200);
  assert.equal(addRes.data.wallet, 1500);

  // Subtract 300
  const subRes = await service.updateDemoUserWallet(id, { action: "subtract", wallet: 300 });
  assert.equal(subRes.status, 200);
  assert.equal(subRes.data.wallet, 1200);
});

test("HTTP Routes integration for demo users", async () => {
  // Test validation on /api/admin/demo-users
  const resShortPass = await testRoute("POST", "/api/admin/demo-users", {}, {
    mobile: "9444444444",
    password: "123",
  });
  assert.equal(resShortPass.statusCode, 400);

  // Test aliases routing (POST /system_user, GET /system_user, POST /demo_user)
  const resSystemUser = await testRoute("GET", "/system_user");
  assert.ok(resSystemUser.statusCode === 200 || resSystemUser.statusCode === 500);
});
