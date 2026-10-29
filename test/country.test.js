"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");

function testRoute(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resBody = null;
    const responseHeaders = {};
    const req = {
      method,
      url,
      headers: { host: "api.wingo4all.site", ...headers },
      get(header) {
        return this.headers[header.toLowerCase()];
      },
      body: body || {},
    };
    const res = {
      statusCode: 200,
      setHeader(name, value) {
        responseHeaders[name.toLowerCase()] = value;
      },
      getHeader(name) {
        return responseHeaders[name.toLowerCase()];
      },
      status(code) {
        statusCode = code;
        return this;
      },
      sendStatus(code) {
        statusCode = code;
        resolve({ statusCode, headers: responseHeaders, body: null });
      },
      json(data) {
        resBody = data;
        resolve({ statusCode, headers: responseHeaders, body: resBody });
      },
      send(data) {
        resBody = data;
        resolve({ statusCode, headers: responseHeaders, body: resBody });
      },
      end() {
        resolve({ statusCode, headers: responseHeaders, body: resBody });
      },
    };
    app.handle(req, res, (err) => {
      resolve({ statusCode: 500, headers: responseHeaders, error: err });
    });
  });
}

test("OPTIONS preflight from http://localhost:3000 returns 204 and CORS headers", async () => {
  const res = await testRoute("OPTIONS", "/api/country", {
    origin: "http://localhost:3000",
  });
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["access-control-allow-origin"], "http://localhost:3000");
  assert.equal(res.headers["access-control-allow-credentials"], "true");
});

test("POST /api/country returns 200 OK with country list and CORS headers for localhost:3000", async () => {
  const res = await testRoute(
    "POST",
    "/api/country",
    { origin: "http://localhost:3000" },
    {}
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["access-control-allow-origin"], "http://localhost:3000");
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.equal(res.body.data[0].country_code, "91");
  assert.equal(res.body.country_code, "91");
});

test("GET /api/country and GET /country also return 200 OK", async () => {
  const resApi = await testRoute("GET", "/api/country");
  assert.equal(resApi.statusCode, 200);
  assert.equal(resApi.body.status, 200);
  assert.ok(Array.isArray(resApi.body.data));

  const resRoot = await testRoute("GET", "/country");
  assert.equal(resRoot.statusCode, 200);
  assert.equal(resRoot.body.status, 200);
  assert.ok(Array.isArray(resRoot.body.data));
});

