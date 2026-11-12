process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");

function testRoute(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resBody = null;
    const req = {
      method,
      url,
      headers: { host: "localhost:3010", ...headers },
      body: body || {},
      query: method === "GET" && url.includes("?")
        ? Object.fromEntries(new URLSearchParams(url.split("?")[1]))
        : {},
    };
    const res = {
      statusCode: 200,
      setHeader() {},
      getHeader() {},
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
        resolve({ statusCode, body: resBody });
      },
      end() {
        resolve({ statusCode, body: resBody });
      },
    };
    app.handle(req, res, (err) => {
      if (err) resolve({ statusCode: 500, body: { error: err.message } });
      else resolve({ statusCode: 404, body: null });
    });
  });
}

test("Agency Promotion Data - Exact URL: GET /api/agency-promotion-data-13", async () => {
  const res = await testRoute("GET", "/api/agency-promotion-data-13");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.status, 200);

  // Statistics properties
  assert.ok("yesterday_total_commission" in res.body);
  assert.ok("register" in res.body);
  assert.ok("deposit_number" in res.body);
  assert.ok("deposit_amount" in res.body);
  assert.ok("first_deposit" in res.body);
  assert.ok("subordinates_register" in res.body);
  assert.ok("subordinates_deposit_number" in res.body);
  assert.ok("subordinates_deposit_amount" in res.body);
  assert.ok("subordinates_first_deposit" in res.body);
  assert.ok("direct_subordinate" in res.body);
  assert.ok("total_commission" in res.body);
  assert.ok("team_subordinate" in res.body);

  // Invite Link properties
  assert.ok(res.body.referral_code, "referral_code must be present");
  assert.ok(res.body.referral_code_url, "referral_code_url must be present");
  assert.ok(res.body.invitation_link, "invitation_link must be present");
  assert.ok(res.body.invite_link, "invite_link must be present");
  assert.ok(res.body.invite_link.includes(res.body.referral_code), "invite_link must contain referral_code");
  assert.ok(res.body.invite_link.startsWith("https://veronova.co.in/register/"), "invite_link must use configured baseUrl");

  // Also verify nested data for axios/vanilla unpack compatibility
  assert.equal(res.body.data.referral_code, res.body.referral_code);
  assert.equal(res.body.data.invite_link, res.body.invite_link);
});

test("Agency Promotion Data - URL Aliases & Variations", async () => {
  // Alias 1: root route /agency-promotion-data-13
  const res1 = await testRoute("GET", "/agency-promotion-data-13");
  assert.equal(res1.statusCode, 200);
  assert.ok(res1.body.invite_link);

  // Alias 2: /api/agency-promotion-data/13
  const res2 = await testRoute("GET", "/api/agency-promotion-data/13");
  assert.equal(res2.statusCode, 200);
  assert.ok(res2.body.invite_link);

  // Alias 3: /api/agency-promotion-data?id=13
  const res3 = await testRoute("GET", "/api/agency-promotion-data?id=13");
  assert.equal(res3.statusCode, 200);
  assert.ok(res3.body.invite_link);
});

test("Agency Promotion - GET /api/tier", async () => {
  const res = await testRoute("GET", "/api/tier");
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 1);
  assert.equal(res.body.data[0].name, "level 1");
});

test("Agency Promotion - GET /api/new-subordinate", async () => {
  const res = await testRoute("GET", "/api/new-subordinate?id=13&type=1");
  assert.ok([200, 400].includes(res.statusCode));
});

test("Agency Promotion - GET /api/subordinate-data", async () => {
  const res = await testRoute("GET", "/api/subordinate-data?id=13");
  assert.equal(res.statusCode, 200);
  assert.ok("bet_amount" in res.body.data);
  assert.ok("payin_amount" in res.body.data);
  assert.ok("subordinates_data" in res.body.data);
});

test("Agency Promotion - GET /api/turnovers", async () => {
  const res = await testRoute("GET", "/api/turnovers");
  assert.ok([200, 400].includes(res.statusCode));
});

