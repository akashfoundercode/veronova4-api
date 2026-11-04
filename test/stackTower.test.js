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

  // 9. Frontend User Stats API (User ke mode-wise bets aur tower build stats)
  const userStatsRes = await testRoute("GET", "/api/stack-tower/user-stats?userid=1");
  assert.equal(userStatsRes.statusCode, 200);
  assert.equal(userStatsRes.body.success, true);
  assert.ok(userStatsRes.body.data.total_bets >= 2);
  assert.ok(userStatsRes.body.data.modes.MEDIUM);
  assert.ok(userStatsRes.body.data.modes.HARD);
  assert.ok(userStatsRes.body.data.modes.EASY);
  assert.ok("highest_tower_built" in userStatsRes.body.data);
  assert.ok("total_wagered" in userStatsRes.body.data);
  assert.ok("win_rate" in userStatsRes.body.data.modes.MEDIUM);
  console.log("✅ User stats API tested successfully:", userStatsRes.body.data.modes.MEDIUM);

  // 10. Admin Panel Stats API (Global summary, modes breakdown & top builders)
  const adminStatsRes = await testRoute("GET", "/api/stack-tower/admin/stats");
  assert.equal(adminStatsRes.statusCode, 200);
  assert.equal(adminStatsRes.body.success, true);
  assert.ok(adminStatsRes.body.data.overall.total_bets >= 2);
  assert.ok(Array.isArray(adminStatsRes.body.data.modes_breakdown));
  assert.ok(Array.isArray(adminStatsRes.body.data.top_tower_builders));
  console.log("✅ Admin stats API tested successfully:", adminStatsRes.body.data.overall);

  // 11. Admin Obstacle Drop API: Start Round 3 and Admin forces obstacle to topple tower
  const betRes3 = await testRoute("POST", "/api/stack-tower/bet", {}, {
    userid: 1,
    amount: 200,
    difficulty: "EASY",
  });
  assert.equal(betRes3.statusCode, 200);
  const round3Id = betRes3.body.data.round_id;

  // Admin drops obstacle on round 3
  const dropRes = await testRoute("POST", "/api/stack-tower/admin/drop-obstacle", {}, {
    round_id: round3Id,
    obstacle_type: "WRECKING_BALL",
    level: 7,
    reason: "Admin dropped obstacle to topple tower",
  });
  assert.equal(dropRes.statusCode, 200);
  assert.equal(dropRes.body.success, true);
  assert.equal(dropRes.body.data.obstacle_dropped, true);
  assert.equal(dropRes.body.data.obstacle_type, "WRECKING_BALL");
  console.log("✅ Admin obstacle drop API tested successfully:", dropRes.body.data);

  // User attempts cashout after obstacle drop - should be rejected!
  const cashoutFailRes = await testRoute("POST", "/api/stack-tower/cashout", {}, {
    userid: 1,
    round_id: round3Id,
    level: 7,
    multiplier: 1.84,
  });
  assert.equal(cashoutFailRes.statusCode, 400);
  assert.equal(cashoutFailRes.body.success, false);
  assert.match(cashoutFailRes.body.message, /obstacle/i);
  console.log("✅ Cashout correctly blocked by obstacle:", cashoutFailRes.body.message);

  // Check round status
  const statusRes = await testRoute("GET", `/api/stack-tower/round-status?round_id=${round3Id}`);
  assert.equal(statusRes.statusCode, 200);
  assert.equal(statusRes.body.data.obstacle_dropped, true);
  assert.equal(statusRes.body.data.status, "OBSTACLE_DROPPED");

  // 12. Test all Active Players, Active Bets & Live Rounds endpoints (matching frontend apiClient.js)
  const activeUrls = [
    "/api/stack-tower/admin/active-players",
    "/api/stack-tower/active-bets",
    "/admin/stack-tower/live",
    "/api/stack-tower/live",
    "/api/stack-tower/admin/rounds?status=0",
    "/admin/stack-tower/active",
  ];

  for (const url of activeUrls) {
    const res = await testRoute("GET", url);
    assert.equal(res.statusCode, 200, `Expected 200 OK for ${url}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), `Expected array data for ${url}`);
    console.log(`✅ ${url} returned 200 OK with ${res.body.data.length} records`);
  }

  console.log("✅ ALL STACK TOWER API TESTS (INCLUDING LIVE/ACTIVE PLAYER ENDPOINTS) PASSED SUCCESSFULLY!");
});

