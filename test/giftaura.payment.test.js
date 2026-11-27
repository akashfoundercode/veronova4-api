"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { PaymentService } = require("../src/modules/payment/payment.service");

function createMockDb() {
  const users = new Map([[10, { id: 10, username: "john", email: "john@gmail.com", mobile: "1234567890", wallet: 500, recharge: 500, total_payin: 500, no_of_payin: 1 }]]);
  const payins = [];

  async function execute(sql, params = []) {
    const norm = sql.replace(/\s+/g, " ").trim();
    if (norm.startsWith("CREATE TABLE IF NOT EXISTS")) return [{ affectedRows: 0 }, []];
    if (norm.startsWith("SELECT id, username, email, mobile FROM users WHERE id = ?")) {
      const u = users.get(Number(params[0]));
      return [u ? [u] : [], []];
    }
    if (norm.startsWith("INSERT INTO payins")) {
      payins.push({
        id: payins.length + 1,
        user_id: Number(params[0]),
        cash: Number(params[1]),
        type: params[2],
        order_id: params[3],
        redirect_url: params[4],
        status: 1,
      });
      return [{ insertId: payins.length, affectedRows: 1 }, []];
    }
    if (norm.startsWith("DELETE FROM payins WHERE order_id = ?")) {
      const idx = payins.findIndex((p) => p.order_id === params[0]);
      if (idx >= 0) payins.splice(idx, 1);
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("SELECT * FROM payins WHERE order_id = ?")) {
      const p = payins.find((x) => x.order_id === params[0]);
      return [p ? [p] : [], []];
    }
    if (norm.startsWith("UPDATE payins SET status = 2")) {
      const p = payins.find((x) => x.id === Number(params[0]));
      if (p) p.status = 2;
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("UPDATE payins SET status = 3, updated_at = NOW() WHERE order_id = ?")) {
      const p = payins.find((x) => x.order_id === params[0]);
      if (p) p.status = 3;
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("UPDATE payins SET status = 3")) {
      const p = payins.find((x) => x.id === Number(params[0]));
      if (p) p.status = 3;
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("UPDATE users SET wallet = wallet + ?")) {
      const u = users.get(Number(params[3]));
      if (u) {
        u.wallet += Number(params[0]);
        u.recharge += Number(params[1]);
        u.total_payin += Number(params[2]);
        u.no_of_payin += 1;
      }
      return [{ affectedRows: 1 }, []];
    }
    return [[], []];
  }

  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    execute,
  };

  return {
    users,
    payins,
    pool: {
      execute,
      async getConnection() {
        return connection;
      },
    },
  };
}

test("GiftAura payin validates integer >= 10, sends all string params, and credits wallet on verified success status", async () => {
  const prevKey = process.env.GIFTAURA_MERCHANT_ID;
  process.env.GIFTAURA_MERCHANT_ID = "GIFTAURA_TEST_99";

  try {
    const db = createMockDb();
    const service = new PaymentService(() => db.pool);
    service.tablesEnsured = true;

    // 1. Reject decimal or < 1
    const badDecimal = await service.giftAuraPayin({ user_id: 10, amount: 10.5 });
    assert.equal(badDecimal.status, 400);
    const badLow = await service.giftAuraPayin({ user_id: 10, amount: 0 });
    assert.equal(badLow.status, 400);

    // 2. Successful Payin initiation
    let capturedBody = null;
    const payinRes = await service.giftAuraPayin({
      user_id: 10,
      amount: 100,
      fetchImpl: async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          async json() {
            return {
              status: "SUCCESS",
              amount: "100",
              order_id: capturedBody.orderid,
              payment_link: "https://pgapi.giftaura.shop/pay/abc123",
              gateway_txn: "TXN999",
            };
          },
        };
      },
    });

    assert.equal(payinRes.status, 200);
    assert.equal(payinRes.data.payment_link, "https://pgapi.giftaura.shop/pay/abc123");
    assert.equal(typeof capturedBody.merchantid, "string");
    assert.equal(capturedBody.merchantid, "GIFTAURA_TEST_99");
    assert.equal(typeof capturedBody.amount, "string");
    assert.equal(capturedBody.amount, "100");
    assert.ok(capturedBody.orderid.length >= 8);
    assert.ok(capturedBody.redirect_url.includes(`orderid=${capturedBody.orderid}`));

    // 3. Status check -> pending does not credit wallet
    const pendingRes = await service.giftAuraCheckStatus(capturedBody.orderid, {
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return { status: "pending", transactionid: capturedBody.orderid, amount: "100", utr: "" };
        },
      }),
    });
    assert.equal(pendingRes.payment_status, "pending");
    assert.equal(db.users.get(10).wallet, 500);

    // 4. Status check -> success credits wallet once
    const successRes = await service.giftAuraCheckStatus(capturedBody.orderid, {
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return { status: "success", transactionid: capturedBody.orderid, amount: "100", utr: "UTR12345" };
        },
      }),
    });
    assert.equal(successRes.status, 200);
    assert.equal(successRes.payment_status, "success");
    assert.equal(db.users.get(10).wallet, 600);
    assert.equal(db.payins[0].status, 2);

    // 5. Idempotent second check does not double-credit
    const repeatRes = await service.giftAuraCheckStatus(capturedBody.orderid, {
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return { status: "success", transactionid: capturedBody.orderid, amount: "100", utr: "UTR12345" };
        },
      }),
    });
    assert.equal(repeatRes.status, 200);
    assert.equal(db.users.get(10).wallet, 600);

    // 6. Failed payment initiation & failed status check are preserved in payins history with status = 3
    const failedInit = await service.giftAuraPayin({
      user_id: 10,
      amount: 200,
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return { status: 400, error: "Gateway error" };
        },
      }),
    });
    assert.equal(failedInit.status, 400);
    assert.equal(db.payins.length, 2);
    assert.equal(db.payins[1].status, 3);
  } finally {
    if (prevKey === undefined) delete process.env.GIFTAURA_MERCHANT_ID;
    else process.env.GIFTAURA_MERCHANT_ID = prevKey;
  }
});
