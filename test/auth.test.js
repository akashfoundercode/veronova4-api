"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { AuthService, USER_TOKEN_TYPE } = require("../src/modules/auth/auth.service");
const authenticate = require("../src/middleware/authenticate");

function createConnection(respond) {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  let released = false;
  return {
    calls,
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
    get released() {
      return released;
    },
    async beginTransaction() {},
    async execute(sql, params) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalizedSql, params });
      return [respond(normalizedSql, params), []];
    },
    async commit() {
      committed = true;
    },
    async rollback() {
      rolledBack = true;
    },
    release() {
      released = true;
    },
  };
}

test("login issues a Sanctum-compatible bearer token and stores only its SHA-256 digest", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, password, status FROM users")) {
      return [{ id: 42, password: "legacy-password", status: 1 }];
    }
    if (sql.startsWith("INSERT INTO personal_access_tokens")) {
      return { insertId: 123 };
    }
    return [];
  });
  const service = new AuthService(() => ({
    getConnection: async () => connection,
  }));

  const login = await service.login({
    identity: "player@example.test",
    password: "legacy-password",
    login_token: "device-token",
  });

  assert.equal(login.id, 42);
  assert.match(login.token, /^123\|[a-f0-9]{80}$/);
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  assert.equal(connection.released, true);

  const tokenWrite = connection.calls.find(({ sql }) =>
    sql.startsWith("INSERT INTO personal_access_tokens"),
  );
  const [tokenableType, tokenableId, tokenHash] = tokenWrite.params;
  assert.equal(tokenableType, USER_TOKEN_TYPE);
  assert.equal(tokenableId, 42);
  assert.equal(
    tokenHash,
    crypto.createHash("sha256").update(login.token.split("|")[1]).digest("hex"),
  );
  assert.equal(tokenHash.includes(login.token.split("|")[1]), false);
});

test("login rejects an invalid password without issuing or storing a token", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id, password, status FROM users")) {
      return [{ id: 42, password: "different-password", status: 1 }];
    }
    return [];
  });
  const service = new AuthService(() => ({
    getConnection: async () => connection,
  }));

  const login = await service.login({
    identity: "player@example.test",
    password: "legacy-password",
  });

  assert.equal(login, null);
  assert.equal(connection.committed, false);
  assert.equal(connection.rolledBack, true);
  assert.equal(
    connection.calls.some(({ sql }) =>
      sql.startsWith("INSERT INTO personal_access_tokens"),
    ),
    false,
  );
});

test("registration creates a shared user and Sanctum token in one transaction", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT id FROM users WHERE mobile = ?")) {
      return [];
    }
    if (sql.startsWith("SELECT id FROM users WHERE u_id = ?")) {
      return [];
    }
    if (sql.startsWith("SELECT id FROM users WHERE referral_code = ?")) {
      return [];
    }
    if (sql.startsWith("INSERT INTO users")) {
      return { insertId: 42 };
    }
    if (sql.startsWith("INSERT INTO personal_access_tokens")) {
      return { insertId: 124 };
    }
    return [];
  });
  const service = new AuthService(() => ({
    getConnection: async () => connection,
  }));

  const registration = await service.register({
    country_code: "+1",
    mobile: "1234567890",
    password: "legacy-password",
  });

  assert.equal(registration.userId, 42);
  assert.match(registration.token, /^124\|[a-f0-9]{80}$/);
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  assert.ok(
    connection.calls.every(({ params }) => params.every((value) => value !== undefined)),
  );
  assert.ok(
    connection.calls.some(({ sql }) =>
      sql.startsWith("INSERT INTO users") &&
      sql.includes("username, u_id, mobile, email, password"),
    ),
  );
  assert.ok(
    connection.calls.some(({ sql }) =>
      sql.startsWith("INSERT INTO personal_access_tokens"),
    ),
  );
});

test("bearer-token parsing matches Sanctum token ID and plaintext format", () => {
  const plainToken = "ab".repeat(40);
  assert.deepEqual(
    authenticate.parseBearerToken(`Bearer 123|${plainToken}`),
    {
      tokenId: 123,
      tokenHash: crypto.createHash("sha256").update(plainToken).digest("hex"),
    },
  );
  assert.equal(authenticate.parseBearerToken("Bearer invalid"), null);
  assert.equal(authenticate.parseBearerToken(`Bearer 0|${plainToken}`), null);
});

test("wallet transfer moves third-party balance into the existing main wallet field", async () => {
  const connection = createConnection((sql) => {
    if (sql.startsWith("SELECT status, wallet, third_party_wallet FROM users")) {
      return [{ status: 1, wallet: 25, third_party_wallet: 7 }];
    }
    return [];
  });
  const service = new AuthService(() => ({
    getConnection: async () => connection,
  }));

  const result = await service.transferThirdPartyWallet(42);

  assert.equal(result, true);
  assert.equal(connection.committed, true);
  assert.equal(connection.rolledBack, false);
  assert.ok(
    connection.calls.some(({ sql }) =>
      sql.includes("wallet = wallet + third_party_wallet"),
    ),
  );
  assert.ok(
    connection.calls.some(({ sql }) =>
      sql.includes("third_party_wallet = 0"),
    ),
  );
});

test("getUserForToken logs out inactive user (status != 1) and revokes token", async () => {
  let executedSql = [];
  const pool = {
    async execute(sql, params) {
      executedSql.push({ sql, params });
      if (sql.includes("FROM personal_access_tokens")) {
        return [[{ id: 1, status: 0, access_token_id: 99 }]];
      }
      return [[]];
    },
  };
  const service = new AuthService(() => pool);
  const result = await service.getUserForToken(99, "dummyhash");
  assert.deepEqual(result, { inactive: true });
  assert.ok(executedSql.some(e => e.sql.includes("DELETE FROM personal_access_tokens")));
});

test("getUserForToken logs out user when inactive for more than timeout minutes", async () => {
  let executedSql = [];
  const oldDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  const pool = {
    async execute(sql, params) {
      executedSql.push({ sql, params });
      if (sql.includes("FROM personal_access_tokens")) {
        return [[{ id: 1, status: 1, access_token_id: 101, last_used_at: oldDate }]];
      }
      return [[]];
    },
  };
  const service = new AuthService(() => pool);
  const result = await service.getUserForToken(101, "dummyhash");
  assert.deepEqual(result, { expired: true });
  assert.ok(executedSql.some(e => e.sql.includes("DELETE FROM personal_access_tokens")));
});
