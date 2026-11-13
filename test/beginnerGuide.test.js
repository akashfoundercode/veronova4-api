"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const app = require("../src/app");

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
      sendFile(filePath) {
        resolve({ statusCode, filePath, headers: this.headers });
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

test("GET /api/beginner_guide returns beginner guide data with status 200", async () => {
  const res = await testRoute("GET", "/api/beginner_guide");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 200);
  assert.equal(res.body.message, "Beginner guide data fetched successfully");
  assert.ok(Array.isArray(res.body.data));
  assert.equal(res.body.data.length, 11);

  const first = res.body.data[0];
  assert.equal(first.name, "How to Register");
  assert.ok(first.description.includes("1. How to Register"));
  assert.ok(first.image.includes("/images/beginner_guide/register.png"));

  const last = res.body.data[10];
  assert.equal(last.name, "Gift");
  assert.ok(last.description.includes("11. Gift"));
  assert.ok(last.image.includes("/images/beginner_guide/gift.png"));
});

test("POST /api/beginner_guide and alias /beginner_guide return the same data", async () => {
  const postRes = await testRoute("POST", "/api/beginner_guide", {}, {});
  assert.equal(postRes.statusCode, 200);
  assert.equal(postRes.body.status, 200);
  assert.equal(postRes.body.data.length, 11);

  const aliasRes = await testRoute("GET", "/beginner_guide");
  assert.equal(aliasRes.statusCode, 200);
  assert.equal(aliasRes.body.status, 200);
  assert.equal(aliasRes.body.data.length, 11);
});
