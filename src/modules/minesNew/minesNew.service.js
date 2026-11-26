"use strict";

const { randomInt, randomUUID } = require("node:crypto");
const { getPool } = require("../../config/database");
const AppError = require("../../shared/errors/AppError");

const TOTAL_TILES = 25;
const HOUSE_EDGE_RTP = 0.99;

/**
 * Calculates the Mines payout multiplier for a 5x5 (25-tile) board.
 */
function calculateMinesMultiplier(minesCount, revealedCount) {
  const mines = Number(minesCount);
  const revealed = Number(revealedCount);
  if (!Number.isInteger(mines) || mines < 1 || mines >= TOTAL_TILES) {
    throw new AppError(400, "VALIDATION_ERROR", "minesCount must be between 1 and 24.");
  }
  if (!Number.isInteger(revealed) || revealed <= 0) {
    return 1;
  }
  if (revealed > TOTAL_TILES - mines) {
    throw new AppError(400, "VALIDATION_ERROR", "revealedCount exceeds safe tiles.");
  }

  let probability = 1;
  for (let i = 0; i < revealed; i += 1) {
    probability *= (TOTAL_TILES - mines - i) / (TOTAL_TILES - i);
  }
  const rawMultiplier = HOUSE_EDGE_RTP / probability;
  return Number(rawMultiplier.toFixed(4));
}

/**
 * Generates `minesCount` unique mine positions in [0, 24] using Fisher-Yates + crypto.randomInt.
 */
function generateMinePositions(minesCount) {
  const indices = Array.from({ length: TOTAL_TILES }, (_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  return indices.slice(0, minesCount).sort((a, b) => a - b);
}

function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch (_) {
    return [];
  }
}

class MinesNewService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
    this.tableInitialized = false;
  }

  async ensureTable(pool = this.poolProvider()) {
    if (this.tableInitialized) return;
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS mines_new_rounds (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        round_id VARCHAR(64) NOT NULL UNIQUE,
        user_id BIGINT UNSIGNED NOT NULL,
        bet_amount DECIMAL(18, 4) NOT NULL,
        mines_count INT NOT NULL,
        mines_json TEXT NOT NULL,
        revealed_json TEXT NOT NULL,
        multiplier DECIMAL(18, 4) NOT NULL DEFAULT 1.0000,
        payout DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        profit DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        status VARCHAR(20) NOT NULL DEFAULT 'playing',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_status (user_id, status),
        INDEX idx_status_payout (status, payout)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    this.tableInitialized = true;
  }

  async startRound({ userId, betAmount, minesCount }) {
    const uid = Number(userId);
    const bet = Number(betAmount);
    const minesNum = Number(minesCount);

    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(401, "UNAUTHENTICATED", "Valid authenticated user is required.");
    }
    if (!Number.isFinite(bet) || bet < 1) {
      throw new AppError(400, "VALIDATION_ERROR", "betAmount must be at least 1.");
    }
    if (!Number.isInteger(minesNum) || minesNum < 1 || minesNum > 24) {
      throw new AppError(400, "VALIDATION_ERROR", "minesCount must be an integer between 1 and 24.");
    }

    const pool = this.poolProvider();
    await this.ensureTable(pool);

    const connection = await pool.getConnection();
    let txStarted = false;
    try {
      await connection.beginTransaction();
      txStarted = true;

      const [users] = await connection.execute(
        "SELECT id, wallet, status FROM users WHERE id = ? FOR UPDATE",
        [uid],
      );
      const user = users[0];
      if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found.");
      }
      if (Number(user.status) !== 1) {
        throw new AppError(403, "USER_BLOCKED", "User account is inactive.");
      }

      const [activeRounds] = await connection.execute(
        "SELECT round_id FROM mines_new_rounds WHERE user_id = ? AND status = 'playing' LIMIT 1 FOR UPDATE",
        [uid],
      );
      if (activeRounds.length > 0) {
        throw new AppError(409, "ACTIVE_ROUND_EXISTS", "An active round is already in progress.");
      }

      const currentWallet = Number(user.wallet || 0);
      if (currentWallet < bet) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance.");
      }

      const roundId = `mines_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const mines = generateMinePositions(minesNum);

      await connection.execute(
        "UPDATE users SET wallet = wallet - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [bet, uid],
      );
      await connection.execute(
        `INSERT INTO mines_new_rounds
          (round_id, user_id, bet_amount, mines_count, mines_json, revealed_json, multiplier, payout, profit, status)
         VALUES (?, ?, ?, ?, ?, '[]', 1.0000, 0.0000, 0.0000, 'playing')`,
        [roundId, uid, bet, minesNum, JSON.stringify(mines)],
      );

      await connection.commit();
      txStarted = false;

      const updatedBalance = Number((currentWallet - bet).toFixed(4));
      return {
        roundId,
        balance: updatedBalance,
        betAmount: bet,
        minesCount: minesNum,
        status: "playing",
      };
    } catch (error) {
      if (txStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async revealTile({ userId, roundId, tileIndex }) {
    const uid = Number(userId);
    const tile = Number(tileIndex);

    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(401, "UNAUTHENTICATED", "Valid authenticated user is required.");
    }
    if (!roundId || typeof roundId !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", "roundId is required.");
    }
    if (!Number.isInteger(tile) || tile < 0 || tile >= TOTAL_TILES) {
      throw new AppError(400, "VALIDATION_ERROR", "tileIndex must be an integer between 0 and 24.");
    }

    const pool = this.poolProvider();
    await this.ensureTable(pool);

    const connection = await pool.getConnection();
    let txStarted = false;
    try {
      await connection.beginTransaction();
      txStarted = true;

      const [rounds] = await connection.execute(
        "SELECT * FROM mines_new_rounds WHERE round_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
        [roundId.trim(), uid],
      );
      const round = rounds[0];
      if (!round) {
        throw new AppError(404, "ROUND_NOT_FOUND", "Game round not found.");
      }
      if (round.status !== "playing") {
        throw new AppError(400, "ROUND_ALREADY_SETTLED", "This round is already finished.");
      }

      const mines = parseJsonArray(round.mines_json);
      const revealedTiles = parseJsonArray(round.revealed_json);
      if (revealedTiles.includes(tile)) {
        throw new AppError(400, "TILE_ALREADY_REVEALED", "This tile has already been revealed.");
      }

      const nextRevealed = [...revealedTiles, tile];
      const betAmount = Number(round.bet_amount);
      const minesCount = Number(round.mines_count);

      // 1. Hit a Mine -> Lost
      if (mines.includes(tile)) {
        const lossProfit = Number((-betAmount).toFixed(4));
        await connection.execute(
          `UPDATE mines_new_rounds
           SET revealed_json = ?, multiplier = 0.0000, payout = 0.0000, profit = ?, status = 'lost'
           WHERE id = ?`,
          [JSON.stringify(nextRevealed), lossProfit, round.id],
        );

        const [users] = await connection.execute("SELECT wallet FROM users WHERE id = ? LIMIT 1", [uid]);
        await connection.commit();
        txStarted = false;

        return {
          roundId: round.round_id,
          tileIndex: tile,
          isMine: true,
          status: "lost",
          revealedTiles: nextRevealed,
          mines,
          multiplier: 0,
          payout: 0,
          profit: lossProfit,
          balance: Number(users[0]?.wallet || 0),
        };
      }

      // 2. Gem revealed
      const multiplier = calculateMinesMultiplier(minesCount, nextRevealed.length);
      const potentialWin = Number((betAmount * multiplier).toFixed(4));
      const safeTilesTotal = TOTAL_TILES - minesCount;

      // Auto-win if all safe gems are revealed
      if (nextRevealed.length >= safeTilesTotal) {
        const profit = Number((potentialWin - betAmount).toFixed(4));
        const [users] = await connection.execute(
          "SELECT wallet FROM users WHERE id = ? FOR UPDATE",
          [uid],
        );
        const updatedBalance = Number((Number(users[0]?.wallet || 0) + potentialWin).toFixed(4));

        await connection.execute(
          "UPDATE users SET wallet = wallet + ?, winning_wallet = COALESCE(winning_wallet, 0) + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [potentialWin, potentialWin, uid],
        );
        await connection.execute(
          `UPDATE mines_new_rounds
           SET revealed_json = ?, multiplier = ?, payout = ?, profit = ?, status = 'won'
           WHERE id = ?`,
          [JSON.stringify(nextRevealed), multiplier, potentialWin, profit, round.id],
        );

        await connection.commit();
        txStarted = false;

        return {
          roundId: round.round_id,
          tileIndex: tile,
          isMine: false,
          autoWin: true,
          status: "won",
          revealedTiles: nextRevealed,
          mines,
          multiplier,
          payout: potentialWin,
          profit,
          balance: updatedBalance,
        };
      }

      // Still playing
      await connection.execute(
        "UPDATE mines_new_rounds SET revealed_json = ?, multiplier = ? WHERE id = ?",
        [JSON.stringify(nextRevealed), multiplier, round.id],
      );

      await connection.commit();
      txStarted = false;

      return {
        roundId: round.round_id,
        tileIndex: tile,
        isMine: false,
        status: "playing",
        revealedTiles: nextRevealed,
        multiplier,
        potentialWin,
      };
    } catch (error) {
      if (txStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async cashout({ userId, roundId }) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(401, "UNAUTHENTICATED", "Valid authenticated user is required.");
    }
    if (!roundId || typeof roundId !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", "roundId is required.");
    }

    const pool = this.poolProvider();
    await this.ensureTable(pool);

    const connection = await pool.getConnection();
    let txStarted = false;
    try {
      await connection.beginTransaction();
      txStarted = true;

      const [rounds] = await connection.execute(
        "SELECT * FROM mines_new_rounds WHERE round_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
        [roundId.trim(), uid],
      );
      const round = rounds[0];
      if (!round) {
        throw new AppError(404, "ROUND_NOT_FOUND", "Game round not found.");
      }
      if (round.status !== "playing") {
        throw new AppError(400, "ROUND_ALREADY_SETTLED", "This round is already finished.");
      }

      const mines = parseJsonArray(round.mines_json);
      const revealedTiles = parseJsonArray(round.revealed_json);
      if (revealedTiles.length < 1) {
        throw new AppError(400, "NO_TILES_REVEALED", "Reveal at least 1 gem before cashing out.");
      }

      const betAmount = Number(round.bet_amount);
      const minesCount = Number(round.mines_count);
      const multiplier = calculateMinesMultiplier(minesCount, revealedTiles.length);
      const payout = Number((betAmount * multiplier).toFixed(4));
      const profit = Number((payout - betAmount).toFixed(4));

      const [users] = await connection.execute(
        "SELECT wallet FROM users WHERE id = ? FOR UPDATE",
        [uid],
      );
      const updatedBalance = Number((Number(users[0]?.wallet || 0) + payout).toFixed(4));

      await connection.execute(
        "UPDATE users SET wallet = wallet + ?, winning_wallet = COALESCE(winning_wallet, 0) + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [payout, payout, uid],
      );
      await connection.execute(
        `UPDATE mines_new_rounds
         SET multiplier = ?, payout = ?, profit = ?, status = 'won'
         WHERE id = ?`,
        [multiplier, payout, profit, round.id],
      );

      await connection.commit();
      txStarted = false;

      return {
        roundId: round.round_id,
        status: "won",
        payout,
        multiplier,
        profit,
        balance: updatedBalance,
        mines,
        revealedTiles,
      };
    } catch (error) {
      if (txStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getActiveRound(userId) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(401, "UNAUTHENTICATED", "Valid authenticated user is required.");
    }

    const pool = this.poolProvider();
    await this.ensureTable(pool);

    const [[rounds], [users]] = await Promise.all([
      pool.execute(
        "SELECT round_id, bet_amount, mines_count, revealed_json, multiplier, status FROM mines_new_rounds WHERE user_id = ? AND status = 'playing' ORDER BY id DESC LIMIT 1",
        [uid],
      ),
      pool.execute("SELECT wallet FROM users WHERE id = ? LIMIT 1", [uid]),
    ]);

    const balance = Number(users[0]?.wallet || 0);
    const round = rounds[0];
    if (!round) {
      return {
        active: false,
        round: null,
        balance,
      };
    }

    const revealedTiles = parseJsonArray(round.revealed_json);
    const betAmount = Number(round.bet_amount);
    const minesCount = Number(round.mines_count);
    const multiplier = revealedTiles.length > 0
      ? calculateMinesMultiplier(minesCount, revealedTiles.length)
      : 1;
    const potentialWin = Number((betAmount * multiplier).toFixed(4));

    return {
      active: true,
      roundId: round.round_id,
      betAmount,
      minesCount,
      revealedTiles,
      multiplier,
      potentialWin,
      status: "playing",
      balance,
    };
  }

  async getWalletBalance(userId) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(401, "UNAUTHENTICATED", "Valid authenticated user is required.");
    }
    const pool = this.poolProvider();
    const [users] = await pool.execute(
      "SELECT id, username, u_id, mobile, email, userimage, wallet, winning_wallet, bonus FROM users WHERE id = ? LIMIT 1",
      [uid],
    );
    const user = users[0];
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found.");
    }
    return {
      status: 200,
      balance: Number(user.wallet || 0),
      winningWallet: Number(user.winning_wallet || 0),
      bonus: Number(user.bonus || 0),
      profile: {
        id: user.id,
        username: user.username,
        u_id: user.u_id,
        mobile: user.mobile,
        email: user.email,
        userimage: user.userimage,
      },
    };
  }

  async addFunds({ userId, amount }) {
    const uid = Number(userId);
    const addAmount = Number(amount);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(401, "UNAUTHENTICATED", "Valid authenticated user is required.");
    }
    if (!Number.isFinite(addAmount) || addAmount <= 0 || addAmount > 1000000) {
      throw new AppError(400, "VALIDATION_ERROR", "amount must be between 1 and 1000000.");
    }

    const pool = this.poolProvider();
    const connection = await pool.getConnection();
    let txStarted = false;
    try {
      await connection.beginTransaction();
      txStarted = true;

      const [users] = await connection.execute(
        "SELECT id, wallet FROM users WHERE id = ? FOR UPDATE",
        [uid],
      );
      if (!users[0]) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found.");
      }

      const updatedBalance = Number((Number(users[0].wallet || 0) + addAmount).toFixed(4));
      await connection.execute(
        "UPDATE users SET wallet = wallet + ?, recharge = COALESCE(recharge, 0) + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [addAmount, addAmount, uid],
      );
      try {
        await connection.execute(
          "INSERT INTO wallet_history (userid, amount, subtypeid, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())",
          [uid, addAmount],
        );
      } catch (_) {}

      await connection.commit();
      txStarted = false;

      return {
        status: 200,
        message: "Funds added successfully.",
        addedAmount: addAmount,
        balance: updatedBalance,
      };
    } catch (error) {
      if (txStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getLeaderboard(limit = 20) {
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const pool = this.poolProvider();
    await this.ensureTable(pool);

    const [rows] = await pool.execute(
      `SELECT r.round_id, r.bet_amount, r.mines_count, r.multiplier, r.payout, r.profit, r.created_at,
              COALESCE(u.username, CONCAT('Player_', r.user_id)) AS username, u.userimage
       FROM mines_new_rounds r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.status = 'won'
       ORDER BY r.payout DESC, r.multiplier DESC
       LIMIT ?`,
      [safeLimit],
    );

    return {
      status: 200,
      data: rows.map((row, idx) => ({
        rank: idx + 1,
        roundId: row.round_id,
        username: row.username,
        userimage: row.userimage || null,
        betAmount: Number(row.bet_amount),
        minesCount: Number(row.mines_count),
        multiplier: Number(row.multiplier),
        payout: Number(row.payout),
        profit: Number(row.profit),
        createdAt: row.created_at,
      })),
    };
  }

  async getHistory({ userId, limit = 50 }) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid < 1) {
      throw new AppError(401, "UNAUTHENTICATED", "Valid authenticated user is required.");
    }
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const pool = this.poolProvider();
    await this.ensureTable(pool);

    const [rows] = await pool.execute(
      `SELECT round_id, bet_amount, mines_count, revealed_json, multiplier, payout, profit, status, created_at
       FROM mines_new_rounds
       WHERE user_id = ? AND status IN ('won', 'lost')
       ORDER BY id DESC
       LIMIT ?`,
      [uid, safeLimit],
    );

    return {
      status: 200,
      data: rows.map((row) => ({
        roundId: row.round_id,
        betAmount: Number(row.bet_amount),
        minesCount: Number(row.mines_count),
        revealedCount: parseJsonArray(row.revealed_json).length,
        multiplier: Number(row.multiplier),
        payout: Number(row.payout),
        profit: Number(row.profit),
        status: row.status,
        createdAt: row.created_at,
      })),
    };
  }
}

module.exports = {
  MinesNewService,
  calculateMinesMultiplier,
  generateMinePositions,
};
