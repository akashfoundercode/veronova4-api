"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { JiliService } = require("../src/modules/jili/jili.service");
const { DASHBOARD_ROUTES, JILI_CONFIG } = require("../src/config/dashboardConfig");

test("DASHBOARD_ROUTES exposes Jili endpoints and JILI_CONFIG is defined", () => {
  assert.equal(DASHBOARD_ROUTES.jiliGames, "/getjilligame");
  assert.equal(DASHBOARD_ROUTES.jiliLaunch, "/jilligame");
  assert.equal(JILI_CONFIG.brand, "JILI");
});

test("JiliService.games fetches and formats game list", async () => {
  const fakeGames = [
    {
      gameNameEn: "Boxing King",
      gameCode: "jili-001",
      imgUrl: "https://example.com/boxing.png",
      category: "SLOT",
    },
    {
      gameNameEn: "Fortune Gems",
      gameCode: "jili-002",
      imgUrl: "https://example.com/fortune.png",
      category: "CASINO",
    },
  ];

  const mockFetch = async (url) => {
    assert.ok(url.includes("brand=JILI"));
    return {
      ok: true,
      status: 200,
      json: async () => fakeGames,
    };
  };

  const service = new JiliService(() => {}, mockFetch);
  const result = await service.games();

  assert.equal(result.status, 200);
  assert.equal(result.message, "Success");
  assert.equal(result.count, 2);
  assert.equal(result.data[0].gameNameEn, "Boxing King");
  assert.equal(result.data[0].gameId, "jili-001");
});

test("JiliService.games filters by category if provided", async () => {
  const fakeGames = [
    { gameNameEn: "Boxing King", gameCode: "1", category: "SLOT" },
    { gameNameEn: "Baccarat", gameCode: "2", category: "CASINO" },
  ];

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => fakeGames,
  });

  const service = new JiliService(() => {}, mockFetch);
  const result = await service.games({ category: "slot" });

  assert.equal(result.count, 1);
  assert.equal(result.data[0].gameNameEn, "Boxing King");
});

test("JiliService.launch generates launch URL with encrypted payload", async () => {
  process.env.JILI_SECRET_ID = "test_secret_id_123";
  process.env.JILI_SECRET_KEY = "12345678901234567890123456789012"; // 32 bytes
  process.env.JILI_TOKEN = "test_token_abc";

  const pool = {
    async execute(sql, params) {
      assert.equal(params[0], 101);
      return [
        [
          {
            id: 101,
            mobile: "9876543210",
            wallet: 500,
            account_type: 0,
          },
        ],
        [],
      ];
    },
  };

  const service = new JiliService(() => pool);
  const result = await service.launch({
    user_id: 101,
    game_id: "boxing_king",
    amount: 100,
  });

  assert.equal(result.status, 200);
  assert.equal(result.gameid, "boxing_king");
  assert.equal(result.userPhone, "9876543210");
  assert.equal(result.balance, 100);
  assert.ok(result.gameUrl.startsWith("https://nuxapi.space/client.php?"));
  assert.ok(result.gameUrl.includes("secret_id=test_secret_id_123"));
  assert.ok(result.gameUrl.includes("payload="));
});

test("JiliService.launch uses user.wallet if amount is omitted", async () => {
  process.env.JILI_SECRET_ID = "test_secret_id_123";
  process.env.JILI_SECRET_KEY = "12345678901234567890123456789012";
  process.env.JILI_TOKEN = "test_token_abc";

  const pool = {
    async execute() {
      return [
        [
          {
            id: 202,
            mobile: "9123456780",
            wallet: 250.75,
            account_type: 0,
          },
        ],
        [],
      ];
    },
  };

  const service = new JiliService(() => pool);
  const result = await service.launch({
    user_id: 202,
    game_id: "fortune_gems",
  });

  assert.equal(result.status, 200);
  assert.equal(result.balance, 250); // Math.trunc(250.75) = 250
});

test("JiliService.launch rejects demo accounts", async () => {
  const pool = {
    async execute() {
      return [
        [
          {
            id: 303,
            mobile: "9999999999",
            wallet: 1000,
            account_type: 1, // Demo account
          },
        ],
        [],
      ];
    },
  };

  const service = new JiliService(() => pool);
  await assert.rejects(
    () => service.launch({ user_id: 303, game_id: "test_game" }),
    (err) => {
      assert.equal(err.code, "DEMO_ACCOUNT_UNAVAILABLE");
      return true;
    },
  );
});

test("JiliService.launch validates required fields", async () => {
  const service = new JiliService(() => {});

  await assert.rejects(
    () => service.launch({}),
    (err) => {
      assert.equal(err.code, "VALIDATION_ERROR");
      return true;
    },
  );

  await assert.rejects(
    () => service.launch({ user_id: 1 }),
    (err) => {
      assert.equal(err.code, "VALIDATION_ERROR");
      return true;
    },
  );
});

