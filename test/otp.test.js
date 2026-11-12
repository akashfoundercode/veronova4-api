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

test("OTP Service - Complete Send & Verify Cycle", async () => {
  const testMobile = "9876543210";

  // 1. Send OTP (POST /api/otp/send)
  const sendRes = await testRoute("POST", "/api/otp/send", {}, {
    mobile: testMobile,
    digit: 6,
  });
  assert.equal(sendRes.statusCode, 200);
  assert.equal(sendRes.body.success, true);
  assert.equal(sendRes.body.data.mobile, testMobile);
  assert.equal(sendRes.body.data.digit, 6);
  assert.ok(sendRes.body.data.expires_in_seconds > 0);

  const otpCode = sendRes.body.data.debug_otp;
  assert.ok(otpCode, "OTP code must be generated/returned in debug mode for test");

  // 2. Reject wrong OTP (POST /api/otp/verify)
  const wrongRes = await testRoute("POST", "/api/otp/verify", {}, {
    mobile: testMobile,
    otp: "000000",
  });
  assert.equal(wrongRes.statusCode, 400);
  assert.equal(wrongRes.body.success, false);

  // 3. Verify with correct OTP (POST /api/otp/verify)
  const verifyRes = await testRoute("POST", "/api/otp/verify", {}, {
    mobile: testMobile,
    otp: otpCode,
  });
  assert.equal(verifyRes.statusCode, 200);
  assert.equal(verifyRes.body.success, true);
  assert.equal(verifyRes.body.data.verified, true);
  assert.equal(verifyRes.body.data.mobile, testMobile);

  // 4. Duplicate verify should fail (OTP already consumed)
  const dupVerify = await testRoute("POST", "/api/otp/verify", {}, {
    mobile: testMobile,
    otp: otpCode,
  });
  assert.equal(dupVerify.statusCode, 400);
  assert.equal(dupVerify.body.success, false);

  // 5. Test Invalid Mobile Number
  const invalidMobileRes = await testRoute("POST", "/api/otp/send", {}, {
    mobile: "123",
  });
  assert.equal(invalidMobileRes.statusCode, 400);
  assert.equal(invalidMobileRes.body.success, false);

  // 6. Test GET Route Aliases (IndoPay format compatibility)
  const getRes = await testRoute("GET", `/api/send-otp?mobile_no=9123456789&digit=4`);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.success, true);
  assert.equal(getRes.body.data.digit, 4);

  const getOtp = getRes.body.data.debug_otp;
  const getVerify = await testRoute("POST", `/api/verify-otp`, {}, {
    mobile_no: "9123456789",
    otp: getOtp,
  });
  assert.equal(getVerify.statusCode, 200);
  assert.equal(getVerify.body.success, true);

  // 7. Test exact route: POST /api/verify with { mobile, otp }
  const testSend = await testRoute("POST", "/api/send", {}, {
    mobile: "7991877018",
    digit: 4,
  });
  assert.equal(testSend.statusCode, 200);
  const testOtp = testSend.body.data.debug_otp;

  const exactVerifyRes = await testRoute("POST", "/api/verify", {}, {
    mobile: "7991877018",
    otp: testOtp,
  });
  assert.equal(exactVerifyRes.statusCode, 200);
  assert.equal(exactVerifyRes.body.success, true);
  assert.equal(exactVerifyRes.body.data.verified, true);
  assert.equal(exactVerifyRes.body.data.mobile, "7991877018");

  // 8. Test exact standard URL: POST /api/verify-otp with { mobile, otp }
  const testSend2 = await testRoute("POST", "/api/send-otp", {}, {
    mobile: "7991877019",
    digit: 4,
  });
  assert.equal(testSend2.statusCode, 200);
  const testOtp2 = testSend2.body.data.debug_otp;

  const verifyOtpRes = await testRoute("POST", "/api/verify-otp", {}, {
    mobile: "7991877019",
    otp: testOtp2,
  });
  assert.equal(verifyOtpRes.statusCode, 200);
  assert.equal(verifyOtpRes.body.success, true);
  assert.equal(verifyOtpRes.body.data.verified, true);
  assert.equal(verifyOtpRes.body.data.mobile, "7991877019");

  console.log("✅ ALL OTP SEND & VERIFY TESTS PASSED SUCCESSFULLY!");
});

