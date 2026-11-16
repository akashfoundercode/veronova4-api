"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { PlinkoService } = require("../src/modules/plinko/plinko.service");

function createMockPool(respond) {
  const calls = [];
  let committed = false;
  let rolledBack = false;

  const connection = {
    calls,
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
    async beginTransaction() {},
    async execute(sql, params) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalizedSql, params });
      return [respond(normalizedSql, params), []];
    },
    async commit() {
      committed = true;
    },
    async rollback() {
      rolledBack = true;
    },
    release() {},
  };

  return {
    calls,
    connection,
    async execute(sql, params) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalizedSql, params });
      return [respond(normalizedSql, params), []];
    },
    getConnection: async () => connection,
  };
}

test("Plinko Arcade: sessionInit returns user profile and game state", async () => {
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("SELECT id, username, mobile, wallet, winning_wallet FROM users")) {
      return [{ id: 10, username: "Player_10", mobile: "9876543210", wallet: "1500.00", winning_wallet: "500.00" }];
    }
    if (sql.startsWith("SELECT * FROM plinko_game_state")) {
      return [{
        id: 1,
        userid: 10,
        coins: 1250,
        sp: 10,
        ascensions: 1,
        selected_tier: 0,
        slot_levels: JSON.stringify([1, 1, 1, 1, 1, 1, 1, 1, 1]),
        unify: JSON.stringify({ ballValue: 1 }),
        tier_balls: JSON.stringify({ 0: 30 }),
        investments: JSON.stringify(["inv1"]),
        stats: JSON.stringify({ drops: 15, totalEarned: 200, bestWin: 50, cashouts: 1, totalSpEarned: 10 }),
      }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.initSession({ userId: 10 });

  assert.equal(res.status, 200);
  assert.equal(res.data.user.id, 10);
  assert.equal(res.data.user.wallet, 1500);
  assert.equal(res.data.gameState.coins, 1250);
  assert.equal(res.data.gameState.sp, 10);
  assert.equal(res.data.config.baseBallCost, 5);
});

test("Plinko Arcade: dropBall deducts wallet and generates server seed & orderid", async () => {
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("SELECT id, wallet, winning_wallet FROM users")) {
      return [{ id: 10, wallet: "500.00", winning_wallet: "200.00" }];
    }
    if (sql.startsWith("INSERT INTO plinko_bets")) {
      return { insertId: 77 };
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.dropBall({ userId: 10, amount: 10, tier: 1 });

  assert.equal(res.status, 200);
  assert.equal(res.data.drop_id, 77);
  assert.equal(res.data.amount, 10);
  assert.equal(res.data.tier, 1);
  assert.ok(res.data.server_seed.length >= 16);
  assert.equal(res.data.wallet, 490);
  assert.equal(res.data.winning_wallet, 190);
  assert.equal(pool.connection.committed, true);

  const update = pool.calls.find(({ sql }) => sql.startsWith("UPDATE users SET wallet = ?, winning_wallet = ?"));
  assert.ok(update);
  assert.deepEqual(update.params, [490, 190, 10]);
});

test("Plinko Arcade: dropBall rejects if user has insufficient balance", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT id, wallet, winning_wallet FROM users")) {
      return [{ id: 10, wallet: "4.00", winning_wallet: "0.00" }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  await assert.rejects(
    service.dropBall({ userId: 10, amount: 10 }),
    { code: "INSUFFICIENT_FUNDS" },
  );
  assert.equal(pool.connection.rolledBack, true);
});

test("Plinko Arcade: settleBet credits winning wallet and updates game stats on win", async () => {
  const pool = createMockPool((sql, params) => {
    if (sql.startsWith("SELECT * FROM plinko_bets WHERE id = ?")) {
      return [{
        id: 77,
        orderid: "ORD12345",
        amount: "10.00",
        userid: 10,
        status: 0,
        tier: 1,
      }];
    }
    if (sql.startsWith("SELECT id, username, wallet, winning_wallet FROM users")) {
      return [{ id: 10, username: "Vikram", wallet: "490.00", winning_wallet: "190.00" }];
    }
    if (sql.startsWith("SELECT id, stats FROM plinko_game_state")) {
      return [{
        id: 1,
        stats: JSON.stringify({ drops: 2, totalEarned: 15, bestWin: 10 }),
      }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.settleBet({
    userId: 10,
    dropId: 77,
    slot: 0,
    mult: 1.7,
    payout: 17.0,
    isOut: false,
    tier: 1,
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.status, 1);
  assert.equal(res.data.payout, 17);
  assert.equal(res.data.wallet, 507);
  assert.equal(res.data.winning_wallet, 207);
  assert.equal(pool.connection.committed, true);

  const betUpdate = pool.calls.find(({ sql }) => sql.startsWith("UPDATE plinko_bets SET status = ?"));
  assert.ok(betUpdate);
  assert.equal(betUpdate.params[0], 1); // status 1: won
  assert.equal(betUpdate.params[3], "1.7"); // multipler
  assert.equal(betUpdate.params[4], 17); // win_amount

  const userUpdate = pool.calls.find(({ sql }) => sql.startsWith("UPDATE users SET wallet = ?, winning_wallet = ?"));
  assert.ok(userUpdate);
  assert.deepEqual(userUpdate.params, [507, 207, 10]);
});

test("Plinko Arcade: settleBet handles OUT outcome with 0 payout and status 2", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT * FROM plinko_bets WHERE id = ?")) {
      return [{
        id: 78,
        orderid: "ORD12346",
        amount: "10.00",
        userid: 10,
        status: 0,
      }];
    }
    if (sql.startsWith("SELECT id, username, wallet, winning_wallet FROM users")) {
      return [{ id: 10, username: "Vikram", wallet: "490.00", winning_wallet: "190.00" }];
    }
    if (sql.startsWith("SELECT id, stats FROM plinko_game_state")) {
      return [{ id: 1, stats: JSON.stringify({ drops: 0, totalEarned: 0, bestWin: 0 }) }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.settleBet({
    userId: 10,
    dropId: 78,
    isOut: true,
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.status, 2); // 2: out/loss
  assert.equal(res.data.payout, 0);
  assert.equal(res.data.is_out, true);
  assert.equal(pool.connection.committed, true);

  // Users wallet must NOT be updated for 0 payout
  const userUpdate = pool.calls.find(({ sql }) => sql.startsWith("UPDATE users SET wallet = ?"));
  assert.equal(userUpdate, undefined);
});

test("Plinko Arcade: settleBet is idempotent when called again on settled bet", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT * FROM plinko_bets WHERE id = ?")) {
      return [{
        id: 77,
        orderid: "ORD12345",
        amount: "10.00",
        userid: 10,
        status: 1, // already settled
        slot: 0,
        multipler: "1.7",
        win_amount: "17.00",
      }];
    }
    if (sql.startsWith("SELECT id, username, wallet, winning_wallet FROM users")) {
      return [{ id: 10, username: "Vikram", wallet: "507.00", winning_wallet: "207.00" }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.settleBet({
    userId: 10,
    dropId: 77,
    slot: 0,
    mult: 1.7,
  });

  assert.equal(res.status, 200);
  assert.equal(res.message, "Bet already settled");
  assert.equal(res.data.payout, 17);
  // Wallet update should NOT be executed
  const userUpdate = pool.calls.find(({ sql }) => sql.startsWith("UPDATE users SET wallet = ?"));
  assert.equal(userUpdate, undefined);
});

test("Plinko Arcade: settleBet falls back to pending bet when dropId/orderId is missing", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT id, username, wallet, winning_wallet FROM users")) {
      return [{ id: 10, username: "Vikram", wallet: "490.00", winning_wallet: "190.00" }];
    }
    if (sql.startsWith("SELECT * FROM plinko_bets WHERE userid = ? AND status = 0 ORDER BY id DESC LIMIT 1")) {
      return [{
        id: 99,
        orderid: "ORD99999",
        amount: "10.00",
        userid: 10,
        status: 0,
        tier: 0,
      }];
    }
    if (sql.startsWith("SELECT id, stats FROM plinko_game_state")) {
      return [{ id: 1, stats: JSON.stringify({ drops: 1, totalEarned: 0, bestWin: 0 }) }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.settleBet({
    userId: 10,
    slot: 2,
    mult: 1.2,
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.drop_id, 99);
  assert.equal(res.data.status, 1);
  assert.equal(res.data.payout, 12);
  assert.equal(res.data.wallet, 502);
  assert.equal(pool.connection.committed, true);
});

test("Plinko Arcade: settleBet auto-creates and settles when no pending bet exists", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT id, username, wallet, winning_wallet FROM users")) {
      return [{ id: 10, username: "Vikram", wallet: "500.00", winning_wallet: "200.00" }];
    }
    if (sql.startsWith("INSERT INTO plinko_bets")) {
      return { insertId: 105 };
    }
    if (sql.startsWith("SELECT * FROM plinko_bets WHERE id = ? FOR UPDATE")) {
      return [{
        id: 105,
        orderid: "AUTO_123",
        amount: "5.00",
        userid: 10,
        status: 0,
        tier: 0,
      }];
    }
    if (sql.startsWith("SELECT id, stats FROM plinko_game_state")) {
      return [{ id: 1, stats: JSON.stringify({ drops: 0, totalEarned: 0, bestWin: 0 }) }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.settleBet({
    userId: 10,
    slot: 0,
    mult: 1.7,
    amount: 5,
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.drop_id, 105);
  assert.equal(res.data.status, 1);
  assert.equal(res.data.payout, 8.5);
  assert.equal(pool.connection.committed, true);
});

test("Plinko Arcade: getMyHistory returns paginated bet history", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT COUNT(*) AS total FROM plinko_bets")) {
      return [{ total: 1 }];
    }
    if (sql.includes("FROM plinko_bets") && sql.includes("WHERE userid = ?") && sql.includes("LIMIT")) {
      return [{
        id: 1,
        orderid: "ORD001",
        amount: "5.00",
        win_amount: "8.50",
        multipler: "1.7",
        slot: 0,
        tier: 0,
        is_out: 0,
        status: 1,
        created_at: "2026-11-16 12:00:00",
        settled_at: "2026-11-16 12:00:05",
      }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.getMyHistory({ userId: 10, limit: 10 });

  assert.equal(res.status, 200);
  assert.equal(res.total, 1);
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].amount, 5);
  assert.equal(res.data[0].payout === undefined, true);
  assert.equal(res.data[0].win_amount, 8.5);
  assert.equal(res.data[0].multiplier, 1.7);
});

test("Plinko Arcade: getLiveBets returns live bets feed and online count", async () => {
  const pool = createMockPool((sql) => {
    if (sql.includes("FROM plinko_bets b")) {
      return [{
        id: 1,
        amount: "10.00",
        win_amount: "17.00",
        multipler: "1.7",
        tier: 0,
        is_out: 0,
        settled_at: new Date(),
        created_at: new Date(),
        username: "AcePlayer",
      }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.getLiveBets({ limit: 5 });

  assert.equal(res.status, 200);
  assert.equal(res.data.bets.length, 5);
  assert.ok(res.data.onlineCount > 2000);
  assert.equal(res.data.bets[0].player, "AcePlayer");
});

test("Plinko Arcade: handleGameAction executes cashout, sync_state and upgrades", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT * FROM plinko_game_state")) {
      return [{
        id: 5,
        userid: 10,
        coins: 1500, // 500 excess -> 500 / 25 = 20 SP
        sp: 5,
        ascensions: 0,
        selected_tier: 0,
        slot_levels: JSON.stringify([1, 1, 1, 1, 1, 1, 1, 1, 1]),
        unify: JSON.stringify({}),
        tier_balls: JSON.stringify({}),
        investments: JSON.stringify([]),
        stats: JSON.stringify({ cashouts: 0, totalSpEarned: 0 }),
      }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const cashoutRes = await service.handleGameAction({
    userId: 10,
    action: "cashout",
    payload: { coins: 1500 },
  });

  assert.equal(cashoutRes.status, 200);
  assert.equal(cashoutRes.data.gameState.sp, 25); // 5 + 20
  assert.equal(cashoutRes.data.gameState.coins, 1000); // reset to 1000
  assert.equal(cashoutRes.data.gameState.stats.cashouts, 1);
  assert.equal(pool.connection.committed, true);
});

test("Plinko Arcade: getConfig returns dynamic multipliers and chips", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT * FROM plinko_settings")) {
      return [{
        id: 1,
        slot_multipliers: JSON.stringify([1.7, 1.4, 1.2, 1.2, 1.0, 1.2, 1.2, 1.4, 1.7]),
        chips: JSON.stringify([5, 10, 20, 50, 100, 200, 500, 1000]),
        out_rate_percent: 40.0,
        min_bet: 5,
        max_bet: 5000,
        is_active: 1,
      }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.getConfig();

  assert.equal(res.status, 200);
  assert.deepEqual(res.data.slot_multipliers, [1.7, 1.4, 1.2, 1.2, 1.0, 1.2, 1.2, 1.4, 1.7]);
  assert.deepEqual(res.data.chips, [5, 10, 20, 50, 100, 200, 500, 1000]);
});

test("Plinko Arcade: dropBall lands on admin forced multiplier when set", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT id, wallet, winning_wallet FROM users")) {
      return [{ id: 10, wallet: "500.00", winning_wallet: "200.00" }];
    }
    if (sql.startsWith("SELECT * FROM plinko_settings")) {
      return [{
        id: 1,
        slot_multipliers: JSON.stringify([1.7, 1.4, 1.2, 1.2, 1.0, 1.2, 1.2, 1.4, 1.7]),
        chips: JSON.stringify([5, 10, 20, 50, 100, 200, 500, 1000]),
        control_mode: "forced",
        forced_target: "1.40", // Force 1.40x
        forced_rounds_left: 1,
      }];
    }
    if (sql.startsWith("INSERT INTO plinko_bets")) {
      return { insertId: 99 };
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.dropBall({ userId: 10, amount: 20 });

  assert.equal(res.status, 200);
  assert.equal(res.data.is_out, false);
  assert.equal(res.data.target_mult, 1.4);
  assert.ok(res.data.target_slot === 1 || res.data.target_slot === 7); // slot 1 or 7 has 1.40x
  assert.equal(res.data.expected_payout, 28); // 20 * 1.4 = 28
});

test("Plinko Arcade: dropBall lands on OUT when admin forces OUT", async () => {
  const pool = createMockPool((sql) => {
    if (sql.startsWith("SELECT id, wallet, winning_wallet FROM users")) {
      return [{ id: 10, wallet: "500.00", winning_wallet: "200.00" }];
    }
    if (sql.startsWith("SELECT * FROM plinko_settings")) {
      return [{
        id: 1,
        slot_multipliers: JSON.stringify([1.7, 1.4, 1.2, 1.2, 1.0, 1.2, 1.2, 1.4, 1.7]),
        control_mode: "forced",
        forced_target: "out",
        forced_rounds_left: 0,
      }];
    }
    if (sql.startsWith("INSERT INTO plinko_bets")) {
      return { insertId: 100 };
    }
    return [];
  });

  const service = new PlinkoService(() => pool);
  const res = await service.dropBall({ userId: 10, amount: 10 });

  assert.equal(res.status, 200);
  assert.equal(res.data.is_out, true);
  assert.equal(res.data.target_mult, 0);
  assert.equal(res.data.expected_payout, 0);
});

test("Plinko Arcade: admin APIs manage settings, controls and query bets", async () => {
  const pool = createMockPool((sql) => {
    if (sql.includes("FROM plinko_settings")) {
      return [{
        id: 1,
        slot_multipliers: JSON.stringify([1.7, 1.4, 1.2, 1.2, 1.0, 1.2, 1.2, 1.4, 1.7]),
        chips: JSON.stringify([5, 10, 20, 50, 100, 200, 500, 1000]),
        out_rate_percent: 30,
        control_mode: "auto",
        forced_target: null,
      }];
    }
    if (sql.includes("COUNT(*) AS total_bets") && !sql.includes("CURDATE()")) {
      return [{
        total_bets: 50,
        unique_players: 12,
        total_volume: 5000,
        total_payout: 3500,
        total_wins: 30,
        total_outs: 20,
      }];
    }
    if (sql.includes("CURDATE()")) {
      return [{
        today_bets: 10,
        today_players: 5,
        today_volume: 1000,
        today_payout: 600,
        today_wins: 6,
        today_outs: 4,
      }];
    }
    if (sql.startsWith("SELECT b.id, b.orderid")) {
      return [{
        id: 1,
        orderid: "ORD1001",
        userid: 10,
        username: "Vikram",
        mobile: "9876543210",
        amount: "50.00",
        win_amount: "70.00",
        multipler: "1.4",
        target_mult: "1.4",
        slot: 1,
        status: 1,
      }];
    }
    return [];
  });

  const service = new PlinkoService(() => pool);

  const getSetRes = await service.getAdminSettings();
  assert.equal(getSetRes.status, 200);
  assert.equal(getSetRes.data.settings.out_rate_percent, 30);

  const updateRes = await service.updateAdminSettings({
    out_rate_percent: 45,
    min_bet: 10,
  });
  assert.equal(updateRes.status, 200);

  const controlRes = await service.setAdminControl({
    control_mode: "forced",
    forced_target: "1.70",
    forced_rounds: 1,
  });
  assert.equal(controlRes.status, 200);
  assert.equal(controlRes.data.forced_target, "1.70");

  const betsRes = await service.getAdminBets({ limit: 10 });
  assert.equal(betsRes.status, 200);
  assert.equal(betsRes.data.length, 1);

  const dashRes = await service.getAdminDashboard();
  assert.equal(dashRes.status, 200);
  assert.equal(dashRes.data.metrics.allTime.volume, 5000);
  assert.equal(dashRes.data.metrics.allTime.ggr, 1500);
});
