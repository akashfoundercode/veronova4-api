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

test("Stack Tower - Complete Game Loop APIs", async () => {
  // 1. Get Game Config
  const configRes = await testRoute("GET", "/api/stack-tower/config");
  assert.equal(configRes.statusCode, 200);
  assert.equal(configRes.body.success, true);
  assert.ok(configRes.body.data.min_bet >= 1);
  assert.ok(configRes.body.data.difficulties.EASY);
  assert.ok(configRes.body.data.difficulties.MEDIUM);
  assert.ok(configRes.body.data.difficulties.HARD);

  // 2. Place Bet (Start Round 1)
  const betRes = await testRoute("POST", "/api/stack-tower/bet", {}, {
    userid: 1,
    amount: 100,
    difficulty: "MEDIUM",
  });
  assert.equal(betRes.statusCode, 200);
  assert.equal(betRes.body.success, true);
  assert.ok(betRes.body.data.round_id, "round_id must be generated");
  assert.equal(betRes.body.data.bet_amount, 100);
  assert.equal(betRes.body.data.difficulty, "MEDIUM");
  assert.equal(betRes.body.data.status, "PLAYING");

  const round1Id = betRes.body.data.round_id;

  // 3. Cash Out Round 1 at Level 5, Multiplier 2.5X
  const cashoutRes = await testRoute("POST", "/api/stack-tower/cashout", {}, {
    userid: 1,
    round_id: round1Id,
    level: 5,
    multiplier: 2.5,
  });
  assert.equal(cashoutRes.statusCode, 200);
  assert.equal(cashoutRes.body.success, true);
  assert.equal(cashoutRes.body.data.win_amount, 250);
  assert.equal(cashoutRes.body.data.profit, 150);
  assert.equal(cashoutRes.body.data.status, "CASHED_OUT");

  // 4. Duplicate Cashout should be rejected
  const dupCashout = await testRoute("POST", "/api/stack-tower/cashout", {}, {
    userid: 1,
    round_id: round1Id,
    level: 5,
    multiplier: 2.5,
  });
  assert.equal(dupCashout.statusCode, 400);
  assert.equal(dupCashout.body.success, false);

  // 5. Place Bet (Start Round 2)
  const betRes2 = await testRoute("POST", "/api/stack-tower/bet", {}, {
    userid: 1,
    amount: 50,
    difficulty: "HARD",
  });
  assert.equal(betRes2.statusCode, 200);
  assert.ok(betRes2.body.data.round_id);

  const round2Id = betRes2.body.data.round_id;

  // 6. Game Over on Round 2 (Toppled / Missed)
  const gameOverRes = await testRoute("POST", "/api/stack-tower/game-over", {}, {
    userid: 1,
    round_id: round2Id,
    final_level: 3,
    final_multiplier: 1.6,
  });
  assert.equal(gameOverRes.statusCode, 200);
  assert.equal(gameOverRes.body.success, true);
  assert.equal(gameOverRes.body.data.payout, 0);
  assert.equal(gameOverRes.body.data.status, "LOST");

  // 7. Get History for User 1
  const historyRes = await testRoute("GET", "/api/stack-tower/history?userid=1");
  assert.equal(historyRes.statusCode, 200);
  assert.equal(historyRes.body.success, true);
  assert.ok(Array.isArray(historyRes.body.data));
  assert.ok(historyRes.body.data.length >= 2, "History must have at least 2 rounds");

  const latestHistory = historyRes.body.data[0];
  assert.ok(latestHistory.id);
  assert.ok(latestHistory.timestamp);
  assert.ok("betAmount" in latestHistory);
  assert.ok("payout" in latestHistory);
  assert.ok("multiplier" in latestHistory);
  assert.ok(["CASHED_OUT", "LOST"].includes(latestHistory.status));

  // 8. Test Route Aliases
  const aliasBet = await testRoute("POST", "/stack_tower_bet", {}, {
    userid: 1,
    amount: 10,
  });
  assert.equal(aliasBet.statusCode, 200);
  assert.equal(aliasBet.body.success, true);

  console.log("✅ ALL STACK TOWER API TESTS PASSED SUCCESSFULLY!");
});

