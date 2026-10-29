"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../src/app");

function testRoute(method, url, bodyData = null) {
  return new Promise((resolve) => {
    const req = new http.IncomingMessage();
    req.method = method;
    req.url = url;
    req.headers = { host: "localhost", "content-type": "application/json" };

    const res = new http.ServerResponse(req);
    let body = "";
    res.write = (chunk) => {
      body += chunk;
    };
    res.end = (chunk) => {
      if (chunk) body += chunk;
      resolve({ statusCode: res.statusCode, body });
    };

    if (bodyData) {
      req.push(JSON.stringify(bodyData));
      req.push(null);
    } else {
      req.push(null);
    }

    app.handle(req, res);
  });
}

test("Payment Routes Integration Tests", async (t) => {
  await t.test("GET /api/get_usdt returns USDT config", async () => {
    const res = await testRoute("GET", "/api/get_usdt");
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.status, 200);
    assert.ok(Array.isArray(parsed.data));
  });

  await t.test("GET /get_usdt (root alias) returns USDT config", async () => {
    const res = await testRoute("GET", "/get_usdt");
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.status, 200);
  });

  await t.test("GET /api/payment-limits returns payment limits map", async () => {
    const res = await testRoute("GET", "/api/payment-limits");
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.status, 200);
    assert.ok(parsed.data);
  });

  await t.test("GET /getPaymentLimits (Laravel alias) returns payment limits", async () => {
    const res = await testRoute("GET", "/getPaymentLimits");
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.status, 200);
  });

  await t.test("GET /api/pay_modes returns pay modes array", async () => {
    const res = await testRoute("GET", "/api/pay_modes?userid=1");
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.ok(Array.isArray(parsed.data));
  });

  await t.test("POST /api/innersoulcares validates user_id and cash", async () => {
    const res = await testRoute("POST", "/api/innersoulcares", {});
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.status, 400);
  });

  await t.test("POST /api/payin validates cash minimum", async () => {
    const res = await testRoute("POST", "/api/payin", { user_id: 1, cash: 50, type: 2 });
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.status, "400");
  });

  await t.test("POST /api/lg-pay-payin validates inputs", async () => {
    const res = await testRoute("POST", "/api/lg-pay-payin", {});
    assert.strictEqual(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.status, "400");
  });

  await t.test("POST /api/withdraw validates withdrawal constraints", async () => {
    const res = await testRoute("POST", "/api/withdraw", { user_id: 1, account_id: 1, amount: 50 });
    assert.strictEqual(res.statusCode, 400);
    const parsed = JSON.parse(res.body);
    assert.strictEqual(parsed.status, 400);
  });

  await t.test("GET /api/deposit_history handles query with graceful response", async () => {
    const res = await testRoute("GET", "/api/deposit_history?user_id=1");
    assert.ok([200, 400].includes(res.statusCode));
  });

  await t.test("GET /api/withdraw_history handles query with graceful response", async () => {
    const res = await testRoute("GET", "/api/withdraw_history?user_id=1");
    assert.ok([200, 400].includes(res.statusCode));
  });

  await t.test("GET /api/Account_view handles query with graceful response", async () => {
    const res = await testRoute("GET", "/api/Account_view?user_id=1");
    assert.ok([200, 400].includes(res.statusCode));
  });

  await t.test("GET /api/usdt_account_view handles query with graceful response", async () => {
    const res = await testRoute("GET", "/api/usdt_account_view?user_id=1");
    assert.strictEqual(res.statusCode, 200);
  });
});

