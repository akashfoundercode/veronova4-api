"use strict";

const { getPool } = require("../../config/database");
const { randomInt } = require("node:crypto");
const AppError = require("../../shared/errors/AppError");

function num(v, field, min = 1) {
  const n = Number(v);
  if (v === undefined || v === null || v === "" || !Number.isFinite(n) || n < min) {
    throw new AppError(400, "VALIDATION_ERROR", `The ${field} field is invalid.`);
  }
  return n;
}

class ChickenService {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
  }

  async bet(b = {}) {
    const uid = num(b.user_id ?? b.userid, "user_id");
    const game = num(b.game_id, "game_id");
    const amount = num(b.amount, "amount", 1);

    const pool = this.poolProvider();
    const c = await pool.getConnection();
    try {
      await c.beginTransaction();

      const [[u]] = await c.execute(
        "SELECT id, wallet, account_type FROM users WHERE id = ? FOR UPDATE",
        [uid],
      );
      if (!u) {
        throw new AppError(400, "USER_NOT_FOUND", "Invalid user ID");
      }
      if (Number(u.wallet) < amount) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      }

      await c.execute(
        `INSERT INTO chicken_bets (user_id, game_id, amount, account_type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, NOW(), NOW())`,
        [uid, game, amount, u.account_type ?? 0],
      );

      await c.execute(
        "UPDATE users SET wallet = wallet - ? WHERE id = ?",
        [amount, uid],
      );

      await c.commit();
      return { success: true, message: "Bet Accepted Successfully!" };
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }

  async history(q = {}) {
    const rawUserId = q.user_id ?? q.userid;
    const uid = rawUserId !== undefined && rawUserId !== null && rawUserId !== ""
      ? num(rawUserId, "user_id")
      : null;
    const isAll = q.all === true || q.all === "true" || q.limit === "all" || q.limit === 0 || q.limit === "0";

    const rawLimit = q.limit ?? q.per_page ?? 10;
    const safeLimit = isAll ? "all" : Math.max(1, parseInt(rawLimit, 10) || 10);

    const rawPage = q.page ?? q.pages ?? q.page_no ?? q.pageno;
    let safeOffset = 0;
    let currentPage = 1;

    if (!isAll) {
      if (rawPage !== undefined && rawPage !== null && rawPage !== "") {
        currentPage = Math.max(1, parseInt(rawPage, 10) || 1);
        safeOffset = (currentPage - 1) * safeLimit;
      } else if (q.offset !== undefined && q.offset !== null && q.offset !== "") {
        safeOffset = Math.max(0, parseInt(q.offset, 10) || 0);
        currentPage = Math.floor(safeOffset / safeLimit) + 1;
      }
    }

    const pool = this.poolProvider();
    const where = [];
    const params = [];
    if (uid) {
      where.push("user_id = ?");
      params.push(uid);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [count] = await pool.execute(
      `SELECT COUNT(*) AS total_count FROM chicken_bets ${whereSql}`,
      params,
    );
    const totalCount = Number(count[0]?.total_count ?? 0);

    let rowsQuery = `SELECT id, user_id, game_id, amount, win_amount, multiplier, cashout_status, status, created_at
       FROM chicken_bets
       ${whereSql}
       ORDER BY id DESC`;

    if (!isAll) {
      rowsQuery += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    }

    const [rows] = await pool.execute(rowsQuery, params);

    const totalPages = isAll ? 1 : (Math.ceil(totalCount / safeLimit) || 1);
    const nextPage = !isAll && currentPage < totalPages ? currentPage + 1 : null;
    const prevPage = !isAll && currentPage > 1 ? currentPage - 1 : null;
    const hasNextPage = nextPage !== null;
    const hasPrevPage = prevPage !== null;

    return rows.length
      ? {
          success: true,
          message: "Data found",
          page: currentPage,
          current_page: currentPage,
          next_page: nextPage,
          prev_page: prevPage,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: isAll ? totalCount : safeLimit,
          limit: safeLimit,
          offset: safeOffset,
          count: rows.length,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
          data: rows,
        }
      : {
          success: false,
          message: "No record found",
          page: currentPage,
          current_page: currentPage,
          next_page: null,
          prev_page: prevPage,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: isAll ? 0 : safeLimit,
          limit: safeLimit,
          offset: safeOffset,
          count: 0,
          has_next_page: false,
          has_prev_page: hasPrevPage,
          data: [],
        };
  }

  async cashout(b = {}) {
    const uid = num(b.userid ?? b.user_id, "userid");
    const game = num(b.game_id, "game_id");
    const mult = num(b.multiplier_id, "multiplier_id", 0);

    const pool = this.poolProvider();
    const c = await pool.getConnection();
    try {
      await c.beginTransaction();

      // Check multiplier in multiplier table
      const [exactRows] = await c.execute(
        "SELECT multiplier FROM multiplier WHERE multiplier = ? LIMIT 1",
        [String(mult)],
      );
      let cashoutValue = exactRows[0]?.multiplier;

      if (!cashoutValue) {
        const [allRows] = await c.execute("SELECT multiplier FROM multiplier");
        for (const row of allRows) {
          const vals = String(row.multiplier).split(";").map(Number);
          if (vals.includes(Number(mult))) {
            cashoutValue = mult;
            break;
          }
        }
      }

      if (!cashoutValue) {
        throw new AppError(400, "MULTIPLIER_NOT_FOUND", "Multiplier not found.");
      }

      const numericMult = Number(cashoutValue);

      const [[bet]] = await c.execute(
        `SELECT * FROM chicken_bets
         WHERE game_id = ? AND user_id = ?
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [game, uid],
      );

      if (!bet) {
        throw new AppError(400, "BET_NOT_FOUND", "Bet not found for this user and game.");
      }

      if (Number(bet.cashout_status) === 1) {
        throw new AppError(400, "ALREADY_CASHED_OUT", "Cashout already done on this multiplier.");
      }

      const win = Number((Number(bet.amount) * numericMult).toFixed(2));

      await c.execute(
        `UPDATE chicken_bets
         SET win_amount = ?, multiplier = ?, cashout_status = 1, status = 1, updated_at = NOW()
         WHERE id = ?`,
        [win, numericMult, bet.id],
      );

      await c.execute(
        "UPDATE users SET wallet = wallet + ? WHERE id = ?",
        [win, uid],
      );

      await c.commit();
      return {
        status: true,
        message: "Cashout processed successfully.",
        win_amount: win,
      };
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }

  async betValues() {
    const pool = this.poolProvider();
    const [data] = await pool.execute(
      "SELECT * FROM bet_values WHERE status = 1 ORDER BY value ASC",
    );
    return {
      message: "data fetch success",
      status: 200,
      data,
    };
  }

  async rules() {
    const pool = this.poolProvider();
    const [rows] = await pool.execute("SELECT name, value FROM game_rules");
    const data = {};
    for (const r of rows) {
      data[r.name] = r.value;
    }
    return {
      success: true,
      data,
    };
  }

  async multiplier(q = {}) {
    const type = q.type;
    const user = q.user_id ?? q.userid;
    const pool = this.poolProvider();
    const params = [];

    let sql = "SELECT * FROM multiplier WHERE type IN (1, 2, 3, 4)";
    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    const [records] = await pool.execute(sql, params);
    const grouped = new Map();

    for (const r of records) {
      const t = String(r.type);
      const vals = String(r.multiplier).split(";").map(Number).sort((a, b) => a - b);
      if (!grouped.has(t)) {
        grouped.set(t, {
          id: r.id,
          type: r.type,
          frequency: r.frequency,
          roast_multiplier: null,
          multiplier: [],
          created_at: r.created_at ?? null,
          updated_at: r.updated_at ?? null,
        });
      }
      grouped.get(t).multiplier.push(...vals);
      grouped.get(t).multiplier.sort((a, b) => a - b);
    }

    const types = [...grouped.keys()];
    let controls = {};
    if (types.length) {
      try {
        const [rows] = await pool.query(
          `SELECT types, roast_multiplier FROM roast_control WHERE types IN (${types.map(() => "?").join(",")})`,
          types,
        );
        for (const r of rows) {
          controls[r.types] = Number(r.roast_multiplier);
        }
      } catch {
        // roast_control fallback if table mock
      }
    }

    let profit = false;
    if (user) {
      try {
        const [[t]] = await pool.execute(
          "SELECT COALESCE(SUM(win_amount), 0) AS total_win, COALESCE(SUM(amount), 0) AS total_bet FROM bets WHERE userid = ?",
          [num(user, "user_id")],
        );
        profit = Number(t?.total_win ?? 0) > Number(t?.total_bet ?? 0);
      } catch {
        profit = false;
      }
    }

    for (const [t, g] of grouped) {
      if (profit) {
        g.roast_multiplier = Math.min(...g.multiplier);
      } else if (controls[t] !== undefined && controls[t] > 0) {
        const e = g.multiplier.filter((x) => x <= controls[t]);
        g.roast_multiplier = e.length ? e[randomInt(e.length)] : Math.min(...g.multiplier);
      } else {
        const first = g.multiplier.slice(0, 2);
        g.roast_multiplier = first.length ? first[randomInt(first.length)] : 1.0;
      }
    }

    const data = [...grouped.values()];
    return {
      success: data.length > 0,
      data,
    };
  }

  // ================= ADMIN ACTIONS ================= //

  async adminMultiplierList() {
    const pool = this.poolProvider();
    const [multipliers] = await pool.execute(
      "SELECT * FROM multiplier ORDER BY type ASC, id ASC",
    );
    let roastControls = [];
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM roast_control ORDER BY id ASC",
      );
      roastControls = rows;
    } catch {
      roastControls = [];
    }

    return {
      status: 200,
      success: true,
      data: {
        multipliers,
        roast_control: roastControls,
      },
    };
  }

  async updateRoastMultiplier({ id, roast_multiplier }) {
    if (id === undefined || id === null || id === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The id field is required.");
    }
    if (roast_multiplier === undefined || roast_multiplier === null || roast_multiplier === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The roast_multiplier field is required.");
    }

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE roast_control SET roast_multiplier = ? WHERE id = ?",
      [roast_multiplier, id],
    );

    return {
      status: true,
      success: true,
      message: "Roast Multiplier Updated!",
    };
  }

  async addMultiplier({ multiplier, frequency, type }) {
    if (!multiplier) {
      throw new AppError(400, "VALIDATION_ERROR", "The multiplier field is required.");
    }
    const parsedType = num(type, "type", 1);
    if (![1, 2, 3, 4].includes(parsedType)) {
      throw new AppError(400, "VALIDATION_ERROR", "The type must be between 1 and 4.");
    }

    const pool = this.poolProvider();
    try {
      await pool.execute(
        "INSERT INTO multiplier (multiplier, frequency, type, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [multiplier, frequency ?? null, parsedType],
      );
    } catch {
      await pool.execute(
        "INSERT INTO multiplier (multiplier, frequency, type) VALUES (?, ?, ?)",
        [multiplier, frequency ?? null, parsedType],
      );
    }

    return {
      status: true,
      success: true,
      message: "Multiplier added successfully!",
    };
  }

  async updateMultiplier({ id, multiplier, frequency, type }) {
    if (id === undefined || id === null || id === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The id field is required.");
    }
    if (!multiplier) {
      throw new AppError(400, "VALIDATION_ERROR", "The multiplier field is required.");
    }
    const parsedType = num(type, "type", 1);
    if (![1, 2, 3, 4].includes(parsedType)) {
      throw new AppError(400, "VALIDATION_ERROR", "The type must be between 1 and 4.");
    }

    const pool = this.poolProvider();
    try {
      await pool.execute(
        "UPDATE multiplier SET multiplier = ?, frequency = ?, type = ?, updated_at = NOW() WHERE id = ?",
        [multiplier, frequency ?? null, parsedType, id],
      );
    } catch {
      await pool.execute(
        "UPDATE multiplier SET multiplier = ?, frequency = ?, type = ? WHERE id = ?",
        [multiplier, frequency ?? null, parsedType, id],
      );
    }

    return {
      status: true,
      success: true,
      message: "Multiplier updated successfully!",
    };
  }

  async deleteMultiplier({ id }) {
    if (id === undefined || id === null || id === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The id field is required.");
    }

    const pool = this.poolProvider();
    await pool.execute("DELETE FROM multiplier WHERE id = ?", [id]);

    return {
      status: true,
      success: true,
      message: "Multiplier deleted successfully.",
    };
  }

  async updateGameRules({ id, value }) {
    if (id === undefined || id === null || id === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The id field is required.");
    }
    if (value === undefined || value === null) {
      throw new AppError(400, "VALIDATION_ERROR", "The value field is required.");
    }

    const pool = this.poolProvider();
    await pool.execute("UPDATE game_rules SET value = ? WHERE id = ?", [value, id]);

    return {
      status: true,
      success: true,
      message: "Setting updated successfully.",
    };
  }

  async updateBetValues({ id, value }) {
    if (id === undefined || id === null || id === "") {
      throw new AppError(400, "VALIDATION_ERROR", "The id field is required.");
    }
    const val = num(value, "value", 0.01);

    const pool = this.poolProvider();
    await pool.execute(
      "UPDATE bet_values SET value = ?, updated_at = NOW() WHERE id = ?",
      [val, id],
    );

    return {
      status: true,
      success: true,
      message: "Bet Value updated successfully.",
    };
  }
}

module.exports = { ChickenService };
