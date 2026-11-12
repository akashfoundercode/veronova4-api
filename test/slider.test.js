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

test("GET /api/slider_image_view returns 200 and list of slider images", async () => {
  const res = await testRoute("GET", "/api/slider_image_view");
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.status, 200);
  assert.equal(data.message, "Successfully");
  assert(Array.isArray(data.data));
  assert(data.data.length > 0);

  const first = data.data[0];
  assert(typeof first.name === "string" && first.name.length > 0);
  assert(typeof first.image === "string" && first.image.length > 0);
  assert(typeof first.activity_image === "string" && first.activity_image.length > 0);
  assert(typeof first.activity_image_url === "string" && first.activity_image_url.length > 0);
  assert(first.image.startsWith("http://") || first.image.startsWith("https://"));
});

test("GET /slider_image_view (root alias) returns 200 with same structure", async () => {
  const res = await testRoute("GET", "/slider_image_view");
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.status, 200);
  assert.equal(data.message, "Successfully");
  assert(Array.isArray(data.data));
  assert(data.data.length > 0);
});

test("POST /api/slider_image_view works as well", async () => {
  const res = await testRoute("POST", "/api/slider_image_view");
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.status, 200);
  assert(Array.isArray(data.data));
});

