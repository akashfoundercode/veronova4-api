"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { LegacyApiService } = require("../src/modules/legacyApi/legacyApi.service");
const controller = require("../src/modules/legacyApi/legacyApi.controller");

function createMockPool() {
  const claims = [];
  const walletHistory = [];
  const user = { id: 10, wallet: 500, bonus: 0, status: 1 };
  const gift = {
    id: 1,
    code: "123456789012345",
    amount: 100,
    number_people: 5,
    availed_num: 0,
    deposit_amount: 200,
    status: 1,
  };

  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, params) {
      if (sql.includes("FROM users WHERE id = ?")) {
        return [[user], []];
      }
      if (sql.includes("FROM gift_cart WHERE code = ?")) {
        if (params[0] === gift.code) {
          return [[gift], []];
        }
        return [[], []];
      }
      if (sql.includes("FROM gift_claim WHERE userid = ? AND gift_code = ?")) {
        const found = claims.filter((c) => c.userid === params[0] && c.gift_code === params[1]);
        return [found, []];
      }
      if (sql.includes("SELECT COUNT(*) AS total FROM gift_claim WHERE userid = ?")) {
        const count = claims.filter((c) => c.userid === params[0]).length;
        return [[{ total: count }], []];
      }
      if (sql.includes("SELECT COALESCE(SUM(cash), 0) AS total FROM payins")) {
        // eligible deposit: 500 >= 200
        return [[{ total: 500 }], []];
      }
      if (sql.includes("UPDATE users SET wallet = wallet + ?")) {
        user.wallet += params[0];
        user.bonus += params[1];
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("UPDATE gift_cart SET availed_num = availed_num + 1")) {
        gift.availed_num += 1;
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("INSERT INTO gift_claim")) {
        claims.push({ id: claims.length + 1, userid: params[0], gift_code: params[1], amount: params[2] });
        return [{ affectedRows: 1, insertId: claims.length }, []];
      }
      if (sql.includes("INSERT INTO wallet_history")) {
        walletHistory.push({ userid: params[0], amount: params[1], subtypeid: 20 });
        return [{ affectedRows: 1 }, []];
      }
      return [[], []];
    },
  };

  return {
    claims,
    walletHistory,
    user,
    gift,
    async execute(sql, params) {
      if (sql.includes("CREATE TABLE IF NOT EXISTS")) {
        return [{ affectedRows: 0 }, []];
      }
      if (sql.includes("SELECT * FROM gift_claim WHERE userid = ?")) {
        const userClaims = claims.filter((c) => c.userid === params[0]);
        return [userClaims, []];
      }
      return [[], []];
    },
    async getConnection() {
      return connection;
    },
  };
}

test("LegacyApiService.applyGift successfully claims gift", async () => {
  const mockPool = createMockPool();
  const service = new LegacyApiService(() => mockPool);

  const res = await service.applyGift({ userid: 10, code: "123456789012345" });
  assert.equal(res.status, 200);
  assert.equal(res.message, "Gift of ₹100 added to your wallet successfully!");
  assert.equal(mockPool.user.wallet, 600);
  assert.equal(mockPool.user.bonus, 100);
  assert.equal(mockPool.gift.availed_num, 1);
  assert.equal(mockPool.claims.length, 1);

  // Trying to claim again throws already claimed or daily limit
  await assert.rejects(
    async () => {
      await service.applyGift({ userid: 10, code: "123456789012345" });
    },
    { message: "You have already availed this offer!" },
  );
});

test("LegacyApiService.giftRedeemList returns claim history", async () => {
  const mockPool = createMockPool();
  mockPool.claims.push({ id: 1, userid: 10, gift_code: "123456789012345", amount: 100 });
  const service = new LegacyApiService(() => mockPool);

  const res = await service.giftRedeemList(10);
  assert.equal(res.status, 200);
  assert.equal(res.message, "Successfully");
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].gift_code, "123456789012345");
});

test("LegacyApiController handles gift endpoints", async () => {
  const mockPool = createMockPool();
  const origPoolProvider = controller.service.poolProvider;
  controller.service.poolProvider = () => mockPool;

  try {
    let statusCode = 200;
    let jsonBody = null;
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    // User applies gift via POST
    await controller.applyGift(
      {
        body: { userid: 10, code: "123456789012345" },
      },
      mockRes,
    );

    assert.equal(statusCode, 200);
    assert.equal(jsonBody.status, 200);
    assert.equal(jsonBody.message, "Gift of ₹100 added to your wallet successfully!");

    // User views claim list
    await controller.giftRedeemList(
      {
        query: { userid: 10 },
      },
      mockRes,
    );

    assert.equal(statusCode, 200);
    assert.equal(jsonBody.status, 200);
    assert.equal(jsonBody.data.length, 1);
  } finally {
    controller.service.poolProvider = origPoolProvider;
  }
});
