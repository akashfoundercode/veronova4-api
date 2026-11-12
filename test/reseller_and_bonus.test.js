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

    app(req, res);
  });
}

test("GET /api/get_reseller_info returns 200 and reseller details", async () => {
  const res = await testRoute("GET", "/api/get_reseller_info");
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert(data.status === true || data.status === 200);
  assert(data.data !== undefined);
  assert.equal(data.data.status, "Active");
});

test("GET /api/get-reseller-info (kebab-case) returns 200", async () => {
  const res = await testRoute("GET", "/api/get-reseller-info");
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert(data.status === true || data.status === 200);
  assert(data.data !== undefined);
});

test("GET /get_reseller_info (root alias) returns 200", async () => {
  const res = await testRoute("GET", "/get_reseller_info");
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert(data.status === true || data.status === 200);
});

test("GET /api/extra_first_deposit_bonus?userid=7 returns 200 and bonus list", async () => {
  const res = await testRoute("GET", "/api/extra_first_deposit_bonus?userid=7");
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.status, 200);
  assert.equal(data.msg, "Successfully...!");
  assert(Array.isArray(data.data));
  assert(data.data.length > 0);

  const first = data.data[0];
  assert(first.first_deposit_ammount !== undefined);
  assert(first.bonus !== undefined);
  assert(first.label !== undefined);
});

test("GET /extra_first_deposit_bonus?userid=7 (root alias) returns 200", async () => {
  const res = await testRoute("GET", "/extra_first_deposit_bonus?userid=7");
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.status, 200);
  assert.equal(data.msg, "Successfully...!");
  assert(Array.isArray(data.data));
});

test("GET /api/extra_first_deposit_bonus without userid returns 400", async () => {
  const res = await testRoute("GET", "/api/extra_first_deposit_bonus");
  assert.equal(res.statusCode, 400);
  const data = JSON.parse(res.body);
  assert.equal(data.status, 400);
  assert(data.message.includes("userid"));
});

