"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  MinesNewService,
  calculateMinesMultiplier,
  generateMinePositions,
} = require("../src/modules/minesNew/minesNew.service");
const controller = require("../src/modules/minesNew/minesNew.controller");

function createMockDb(initialWallet = 1000) {
  const users = new Map([[10, { id: 10, username: "alice", mobile: "1234567890", wallet: initialWallet, winning_wallet: 0, bonus: 0, status: 1 }]]);
  const rounds = [];
  const walletHistory = [];

  async function execute(sql, params = []) {
    const norm = sql.replace(/\s+/g, " ").trim();
    if (norm.startsWith("CREATE TABLE IF NOT EXISTS mines_new_rounds")) {
      return [{ affectedRows: 0 }, []];
    }
    if (norm.startsWith("SELECT id, wallet, status FROM users WHERE id = ?")) {
      const u = users.get(Number(params[0]));
      return [u ? [u] : [], []];
    }
    if (norm.startsWith("SELECT id, wallet FROM users WHERE id = ?")) {
      const u = users.get(Number(params[0]));
      return [u ? [{ id: u.id, wallet: u.wallet }] : [], []];
    }
    if (norm.startsWith("SELECT wallet FROM users WHERE id = ?")) {
      const u = users.get(Number(params[0]));
      return [u ? [{ wallet: u.wallet }] : [], []];
    }
    if (norm.startsWith("SELECT id, username, u_id, mobile, email, userimage, wallet, winning_wallet, bonus FROM users WHERE id = ?")) {
      const u = users.get(Number(params[0]));
      return [u ? [u] : [], []];
    }
    if (norm.startsWith("SELECT round_id FROM mines_new_rounds WHERE user_id = ? AND status = 'playing'")) {
      const found = rounds.filter((r) => r.user_id === Number(params[0]) && r.status === "playing");
      return [found.map((r) => ({ round_id: r.round_id })), []];
    }
    if (norm.startsWith("SELECT round_id, bet_amount, mines_count, revealed_json, multiplier, status FROM mines_new_rounds WHERE user_id = ? AND status = 'playing'")) {
      const found = rounds.filter((r) => r.user_id === Number(params[0]) && r.status === "playing");
      return [found.slice(-1), []];
    }
    if (norm.startsWith("UPDATE users SET wallet = wallet - ?")) {
      const u = users.get(Number(params[1]));
      u.wallet -= Number(params[0]);
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("UPDATE users SET wallet = wallet + ?, winning_wallet")) {
      const u = users.get(Number(params[2]));
      u.wallet += Number(params[0]);
      u.winning_wallet += Number(params[1]);
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("UPDATE users SET wallet = wallet + ?, recharge")) {
      const u = users.get(Number(params[2]));
      u.wallet += Number(params[0]);
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("INSERT INTO mines_new_rounds")) {
      const row = {
        id: rounds.length + 1,
        round_id: params[0],
        user_id: Number(params[1]),
        bet_amount: Number(params[2]),
        mines_count: Number(params[3]),
        mines_json: params[4],
        revealed_json: "[]",
        multiplier: 1,
        payout: 0,
        profit: 0,
        status: "playing",
        created_at: new Date(),
      };
      rounds.push(row);
      return [{ insertId: row.id, affectedRows: 1 }, []];
    }
    if (norm.startsWith("SELECT * FROM mines_new_rounds WHERE round_id = ? AND user_id = ?")) {
      const found = rounds.filter((r) => r.round_id === params[0] && r.user_id === Number(params[1]));
      return [found, []];
    }
    if (norm.startsWith("UPDATE mines_new_rounds SET revealed_json = ?, multiplier = 0.0000")) {
      const r = rounds.find((x) => x.id === Number(params[2]));
      r.revealed_json = params[0];
      r.multiplier = 0;
      r.payout = 0;
      r.profit = Number(params[1]);
      r.status = "lost";
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("UPDATE mines_new_rounds SET revealed_json = ?, multiplier = ?, payout = ?, profit = ?, status = 'won'")) {
      const r = rounds.find((x) => x.id === Number(params[4]));
      r.revealed_json = params[0];
      r.multiplier = Number(params[1]);
      r.payout = Number(params[2]);
      r.profit = Number(params[3]);
      r.status = "won";
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("UPDATE mines_new_rounds SET revealed_json = ?, multiplier = ? WHERE id = ?")) {
      const r = rounds.find((x) => x.id === Number(params[2]));
      r.revealed_json = params[0];
      r.multiplier = Number(params[1]);
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("UPDATE mines_new_rounds SET multiplier = ?, payout = ?, profit = ?, status = 'won'")) {
      const r = rounds.find((x) => x.id === Number(params[3]));
      r.multiplier = Number(params[0]);
      r.payout = Number(params[1]);
      r.profit = Number(params[2]);
      r.status = "won";
      return [{ affectedRows: 1 }, []];
    }
    if (norm.startsWith("INSERT INTO wallet_history")) {
      walletHistory.push({ userid: params[0], amount: params[1] });
      return [{ affectedRows: 1 }, []];
    }
    if (norm.includes("FROM mines_new_rounds r") && norm.includes("WHERE r.status = 'won'")) {
      const won = rounds
        .filter((r) => r.status === "won")
        .sort((a, b) => b.payout - a.payout)
        .map((r) => ({ ...r, username: users.get(r.user_id)?.username || "Player", userimage: null }));
      return [won, []];
    }
    if (norm.includes("FROM mines_new_rounds WHERE user_id = ? AND status IN ('won', 'lost')")) {
      const hist = rounds
        .filter((r) => r.user_id === Number(params[0]) && (r.status === "won" || r.status === "lost"))
        .reverse();
      return [hist, []];
    }
    return [[], []];
  }

  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    execute,
  };

  return {
    users,
    rounds,
    walletHistory,
    pool: {
      execute,
      async getConnection() {
        return connection;
      },
    },
  };
}

test("MinesNew helpers generate valid unique mines in 0..24 and compute increasing multipliers", () => {
  const mines = generateMinePositions(5);
  assert.equal(mines.length, 5);
  assert.equal(new Set(mines).size, 5);
  assert.ok(mines.every((m) => Number.isInteger(m) && m >= 0 && m <= 24));

  const m1 = calculateMinesMultiplier(3, 1);
  const m2 = calculateMinesMultiplier(3, 2);
  const m3 = calculateMinesMultiplier(3, 3);
  assert.ok(m1 > 1);
  assert.ok(m2 > m1);
  assert.ok(m3 > m2);
});

test("MinesNewService start -> active -> reveal gem -> cashout -> leaderboard -> history -> addFunds", async () => {
  const db = createMockDb(1000);
  const service = new MinesNewService(() => db.pool);

  // 1. Start round (mines must NOT be leaked in response)
  const started = await service.startRound({ userId: 10, betAmount: 100, minesCount: 3 });
  assert.equal(started.status, "playing");
  assert.equal(started.minesCount, 3);
  assert.equal(started.balance, 900);
  assert.equal(started.mines, undefined);

  // 2. Active round resume
  const active = await service.getActiveRound(10);
  assert.equal(active.active, true);
  assert.equal(active.roundId, started.roundId);
  assert.equal(active.mines, undefined);

  // 3. Pick a guaranteed safe tile from DB mock and reveal
  const storedMines = JSON.parse(db.rounds[0].mines_json);
  const safeTile = Array.from({ length: 25 }, (_, i) => i).find((i) => !storedMines.includes(i));
  const revealed = await service.revealTile({ userId: 10, roundId: started.roundId, tileIndex: safeTile });
  assert.equal(revealed.isMine, false);
  assert.equal(revealed.status, "playing");
  assert.deepEqual(revealed.revealedTiles, [safeTile]);
  assert.ok(revealed.multiplier > 1);
  assert.equal(revealed.mines, undefined);

  // 4. Cashout
  const cashed = await service.cashout({ userId: 10, roundId: started.roundId });
  assert.equal(cashed.status, "won");
  assert.ok(cashed.payout > 100);
  assert.ok(cashed.profit > 0);
  assert.equal(cashed.balance, 900 + cashed.payout);
  assert.deepEqual(cashed.mines, storedMines);

  // 5. Start second round and hit a mine
  const started2 = await service.startRound({ userId: 10, betAmount: 50, minesCount: 3 });
  const storedMines2 = JSON.parse(db.rounds[1].mines_json);
  const lost = await service.revealTile({ userId: 10, roundId: started2.roundId, tileIndex: storedMines2[0] });
  assert.equal(lost.isMine, true);
  assert.equal(lost.status, "lost");
  assert.equal(lost.payout, 0);
  assert.deepEqual(lost.mines, storedMines2);

  // 6. Leaderboard & History
  const lb = await service.getLeaderboard(10);
  assert.equal(lb.status, 200);
  assert.equal(lb.data.length, 1);
  assert.equal(lb.data[0].username, "alice");

  const hist = await service.getHistory({ userId: 10, limit: 10 });
  assert.equal(hist.status, 200);
  assert.equal(hist.data.length, 2);

  // 7. Wallet balance & addFunds
  const balBefore = await service.getWalletBalance(10);
  assert.equal(balBefore.balance, cashed.balance - 50);

  const topped = await service.addFunds({ userId: 10, amount: 500 });
  assert.equal(topped.status, 200);
  assert.equal(topped.balance, balBefore.balance + 500);
});

test("MinesNewController exposes all gameplay, wallet, and leaderboard handlers", async () => {
  const db = createMockDb(500);
  const origProvider = controller.service.poolProvider;
  controller.service.poolProvider = () => db.pool;
  controller.service.tableInitialized = false;

  try {
    let status = 0;
    let body = null;
    const res = {
      status(code) {
        status = code;
        return this;
      },
      json(data) {
        body = data;
        return this;
      },
    };

    await controller.walletBalance({ user: { id: 10 } }, res);
    assert.equal(status, 200);
    assert.equal(body.balance, 500);

    await controller.start({ user: { id: 10 }, body: { betAmount: 100, minesCount: 4 } }, res);
    assert.equal(status, 200);
    assert.equal(body.status, "playing");
    assert.equal(body.balance, 400);
  } finally {
    controller.service.poolProvider = origProvider;
  }
});
