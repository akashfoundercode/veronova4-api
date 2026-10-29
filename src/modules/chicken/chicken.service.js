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

  async multiplierSchema(pool = this.poolProvider()) {
    try {
      const [columns] = await pool.execute("SHOW COLUMNS FROM multiplier");
      const names = new Set(columns.map((column) => column.Field));
      return {
        hasGameId: names.has("game_id"),
        hasUpdatedAt: names.has("updated_at"),
        updatedColumn: names.has("updated_at") ? "updated_at" : (names.has("updated") ? "updated" : null),
      };
    } catch (_) {
      return { hasGameId: true, hasUpdatedAt: true, updatedColumn: "updated_at" };
    }
  }

  async recordWalletMovement(connection, { userId, amount, type, remark, description }) {
    try {
      const [columns] = await connection.execute("SHOW COLUMNS FROM fund_user_details");
      const names = new Set(Array.isArray(columns) ? columns.map((column) => column?.Field).filter(Boolean) : []);
      const fields = ["user_id", "amount", "type"];
      const values = [userId, amount, type];
      if (names.has("remark")) {
        fields.push("remark");
        values.push(remark);
      }
      if (names.has("description")) {
        fields.push("description");
        values.push(description);
      }
      if (names.has("created_at")) {
        fields.push("created_at");
        values.push(new Date());
      }
      if (names.has("updated_at")) {
        fields.push("updated_at");
        values.push(new Date());
      }
      await connection.execute(
        `INSERT INTO fund_user_details (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`,
        values,
      );
    } catch (error) {
      if (error.code !== "ER_NO_SUCH_TABLE" && error.code !== "ER_BAD_FIELD_ERROR") throw error;
    }
  }

  async bet(b = {}) {
    const uid = num(b.user_id ?? b.userid ?? b.userId, "user_id");
    const rawGame = b.game_id ?? b.gameid ?? b.gameId;
    const game = rawGame !== undefined && rawGame !== null && rawGame !== "" ? Number(rawGame) : 19;
    const amount = num(b.amount ?? b.bet_amount ?? b.value, "amount", 1);
    if (![1, 19].includes(game)) {
      throw new AppError(400, "INVALID_GAME_ID", "Invalid Chicken Road game_id.");
    }

    const pool = this.poolProvider();
    const c = await pool.getConnection();
    try {
      await c.beginTransaction();

      let u = null;
      try {
        const [userRows] = await c.execute(
          "SELECT id, wallet, account_type FROM users WHERE id = ? FOR UPDATE",
          [uid],
        );
        u = Array.isArray(userRows) ? userRows[0] : userRows;
      } catch (_) {
        const [userRows] = await c.execute(
          "SELECT id, wallet FROM users WHERE id = ? FOR UPDATE",
          [uid],
        );
        u = Array.isArray(userRows) ? userRows[0] : userRows;
      }

      if (!u) {
        throw new AppError(400, "USER_NOT_FOUND", "Invalid user ID");
      }
      if (u.status !== undefined && Number(u.status) !== 1) {
        throw new AppError(403, "ACCOUNT_INACTIVE", "This account is inactive.");
      }
      if (Number(u.wallet || 0) < amount) {
        throw new AppError(400, "INSUFFICIENT_FUNDS", "Insufficient balance");
      }

      // Execute insert with resilience against schema drift (missing account_type, updated_at, or missing AUTO_INCREMENT)
      const executeBetInsert = async (explicitId = null) => {
        if (explicitId !== null) {
          try {
            return await c.execute(
              `INSERT INTO chicken_bets (id, user_id, game_id, amount, account_type, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
              [explicitId, uid, game, amount, u?.account_type ?? 0],
            );
          } catch (_) {
            return await c.execute(
              `INSERT INTO chicken_bets (id, user_id, game_id, amount, status, created_at)
               VALUES (?, ?, ?, ?, 0, NOW())`,
              [explicitId, uid, game, amount],
            );
          }
        }
        try {
          return await c.execute(
            `INSERT INTO chicken_bets (user_id, game_id, amount, account_type, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, NOW(), NOW())`,
            [uid, game, amount, u?.account_type ?? 0],
          );
        } catch (insertErr) {
          if (insertErr && (insertErr.code === "ER_BAD_FIELD_ERROR" || String(insertErr.message || "").includes("Unknown column"))) {
            return await c.execute(
              `INSERT INTO chicken_bets (user_id, game_id, amount, status, created_at)
               VALUES (?, ?, ?, 0, NOW())`,
              [uid, game, amount],
            );
          }
          throw insertErr;
        }
      };

      let insertedId = null;
      try {
        const [res] = await executeBetInsert();
        insertedId = res?.insertId;
      } catch (err) {
        if (err && err.code === "ER_DUP_ENTRY") {
          const errMsg = String(err.message || err.sqlMessage || "").toLowerCase();
          if (errMsg.includes("primary") || errMsg.includes("'0' for key")) {
            const [maxRows] = await c.execute(
              "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM chicken_bets"
            );
            const nextId = Number(maxRows[0]?.next_id || 1);
            await executeBetInsert(nextId);
            insertedId = nextId;
            try {
              await c.execute("ALTER TABLE chicken_bets MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
            } catch (_) {}
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      await c.execute(
        "UPDATE users SET wallet = wallet - ? WHERE id = ?",
        [amount, uid],
      );

      try {
        await c.execute(
          "UPDATE wallets SET balance = balance - ?, updated_at = NOW() WHERE user_id = ?",
          [amount, uid],
        );
      } catch (_) {}

      try {
        if (Number(u?.account_type ?? 0) === 0) {
          await this.recordWalletMovement(c, {
            userId: uid,
            amount,
            type: 0,
            remark: "Chicken Road Bet",
            description: "Chicken Road bet debit",
          });
        }
      } catch (_) {}

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

    const fromDate = q.from_date ?? q.fromDate;
    const toDate = q.to_date ?? q.toDate;
    if (fromDate && Number.isNaN(Date.parse(fromDate))) {
      throw new AppError(400, "VALIDATION_ERROR", "The from_date field must be a valid date.");
    }
    if (toDate && Number.isNaN(Date.parse(toDate))) {
      throw new AppError(400, "VALIDATION_ERROR", "The to_date field must be a valid date.");
    }

    const pool = this.poolProvider();
    const where = [];
    const params = [];
    if (uid) {
      where.push("user_id = ?");
      params.push(uid);
    }
    if (fromDate) {
      where.push("created_at >= ?");
      params.push(fromDate);
    }
    if (toDate) {
      where.push("created_at <= ?");
      params.push(toDate);
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

  async adminHistory(q = {}) {
    const isAll = q.all === true || q.all === "true" || q.limit === "all" || q.limit === 0 || q.limit === "0";
    const rawLimit = q.limit ?? q.per_page ?? 25;
    const safeLimit = isAll ? "all" : Math.max(1, parseInt(rawLimit, 10) || 25);

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

    const where = [];
    const params = [];

    const rawUserId = q.user_id ?? q.userid ?? q.player_id;
    if (rawUserId !== undefined && rawUserId !== null && rawUserId !== "") {
      where.push("cb.user_id = ?");
      params.push(Number(rawUserId));
    }

    if (q.search) {
      where.push("(u.username LIKE ? OR u.mobile LIKE ? OR cb.user_id = ?)");
      params.push(`%${q.search}%`, `%${q.search}%`, Number(q.search) || 0);
    }

    if (q.status !== undefined && q.status !== null && q.status !== "") {
      where.push("cb.status = ?");
      params.push(Number(q.status));
    }

    if (q.game_id !== undefined && q.game_id !== null && q.game_id !== "") {
      where.push("cb.game_id = ?");
      params.push(Number(q.game_id));
    }

    const fromDate = q.from_date ?? q.fromDate;
    const toDate = q.to_date ?? q.toDate;
    if (fromDate && !Number.isNaN(Date.parse(fromDate))) {
      where.push("cb.created_at >= ?");
      params.push(fromDate);
    }
    if (toDate && !Number.isNaN(Date.parse(toDate))) {
      where.push("cb.created_at <= ?");
      params.push(toDate);
    }

    const pool = this.poolProvider();
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let totalCount = 0;
    let totalAmount = 0;
    let totalWinAmount = 0;
    let totalAdminProfit = 0;

    try {
      const [summaryRows] = await pool.execute(
        `SELECT 
           COUNT(*) AS total_count,
           COALESCE(SUM(cb.amount), 0) AS total_amount,
           COALESCE(SUM(cb.win_amount), 0) AS total_win_amount,
           COALESCE(SUM(cb.amount) - SUM(cb.win_amount), 0) AS total_admin_profit
         FROM chicken_bets cb
         LEFT JOIN users u ON cb.user_id = u.id
         ${whereSql}`,
        params,
      );

      const summary = summaryRows[0] || {};
      totalCount = Number(summary.total_count ?? 0);
      totalAmount = Number(summary.total_amount ?? 0);
      totalWinAmount = Number(summary.total_win_amount ?? 0);
      totalAdminProfit = Number(summary.total_admin_profit ?? 0);
    } catch (_) {
      totalCount = 0;
    }

    let rows = [];
    try {
      let rowsQuery = `SELECT 
          cb.id,
          cb.user_id,
          cb.game_id,
          cb.amount,
          cb.win_amount,
          cb.multiplier,
          cb.cashout_status,
          cb.status,
          cb.account_type,
          cb.created_at,
          cb.updated_at,
          u.username AS user_name,
          u.username,
          u.mobile AS user_mobile,
          u.email AS user_email
        FROM chicken_bets cb
        LEFT JOIN users u ON cb.user_id = u.id
        ${whereSql}
        ORDER BY cb.id DESC`;

      if (!isAll) {
        rowsQuery += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;
      }

      const [res] = await pool.execute(rowsQuery, params);
      rows = res || [];
    } catch (_) {}

    const formattedRows = (rows || []).map((row, idx) => ({
      sr_no: safeOffset + idx + 1,
      id: row.id,
      user_id: row.user_id,
      game_id: row.game_id ?? 1,
      user_name: row.user_name || row.username || `User_${row.user_id}`,
      username: row.username || row.user_name || `User_${row.user_id}`,
      user_mobile: row.user_mobile ?? null,
      user_email: row.user_email ?? null,
      amount: Number(Number(row.amount ?? 0).toFixed(2)),
      win_amount: Number(Number(row.win_amount ?? 0).toFixed(2)),
      multiplier: Number(Number(row.multiplier ?? 0).toFixed(2)),
      cashout_status: Number(row.cashout_status ?? 0),
      status: Number(row.status ?? 0),
      winning_result: Number(row.status) === 1 ? "Win" : "Loss",
      result: Number(row.status) === 1 ? "Win" : "Loss",
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const totalPages = isAll ? 1 : (Math.ceil(totalCount / safeLimit) || 1);
    const nextPage = !isAll && currentPage < totalPages ? currentPage + 1 : null;
    const prevPage = !isAll && currentPage > 1 ? currentPage - 1 : null;

    return {
      status: 200,
      success: true,
      message: formattedRows.length ? "Chicken bet history fetched successfully" : "No record found",
      summary: {
        total_bets: totalCount,
        total_amount: Number(totalAmount.toFixed(2)),
        total_win_amount: Number(totalWinAmount.toFixed(2)),
        total_admin_profit: Number(totalAdminProfit.toFixed(2)),
      },
      pagination: {
        page: currentPage,
        current_page: currentPage,
        next_page: nextPage,
        prev_page: prevPage,
        total_pages: totalPages,
        total_count: totalCount,
        per_page: isAll ? totalCount : safeLimit,
        limit: safeLimit,
        offset: safeOffset,
      },
      total_count: totalCount,
      count: formattedRows.length,
      data: formattedRows,
      bet: formattedRows,
      betHistory: formattedRows,
    };
  }

  async cashout(b = {}) {
    const uid = num(b.userid ?? b.user_id ?? b.userId, "userid");
    const game = num(b.game_id ?? b.gameid ?? b.gameId, "game_id");
    const mult = num(b.multiplier_id ?? b.multiplier ?? b.mult, "multiplier_id", 0);
    if (![1, 19].includes(game)) {
      throw new AppError(400, "INVALID_GAME_ID", "Invalid Chicken Road game_id.");
    }

    const pool = this.poolProvider();
    const c = await pool.getConnection();
    try {
      await c.beginTransaction();

      // Check multiplier in multiplier table
      const schema = await this.multiplierSchema(pool);
      const gameFilter = schema.hasGameId ? " AND game_id IN (1, 19)" : "";
      const [exactRows] = await c.execute(
        `SELECT multiplier FROM multiplier WHERE multiplier = ?${gameFilter} LIMIT 1`,
        [String(mult)],
      );
      let cashoutValue = exactRows[0]?.multiplier;

      if (!cashoutValue) {
        const [allRows] = await c.execute(`SELECT multiplier FROM multiplier${schema.hasGameId ? " WHERE game_id IN (1, 19)" : ""}`);
        for (const row of allRows) {
          const vals = String(row.multiplier).split(";").map(Number);
          if (vals.includes(Number(mult))) {
            cashoutValue = mult;
            break;
          }
        }
      }

      if (!cashoutValue) {
        if (Number.isFinite(Number(mult)) && Number(mult) >= 1) {
          cashoutValue = Number(mult);
        } else {
          throw new AppError(400, "MULTIPLIER_NOT_FOUND", "Multiplier not found.");
        }
      }

      const numericMult = Number(cashoutValue);

      let [[bet]] = await c.execute(
        `SELECT * FROM chicken_bets
         WHERE user_id = ? AND game_id IN (?, 1, 19)
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [uid, game],
      );
      if (!bet) {
        [[bet]] = await c.execute(
          `SELECT * FROM chicken_bets
           WHERE user_id = ?
           ORDER BY id DESC LIMIT 1 FOR UPDATE`,
          [uid],
        );
      }

      if (!bet) {
        throw new AppError(400, "BET_NOT_FOUND", "Bet not found for this user and game.");
      }

      if (Number(bet.account_type ?? 0) !== 0) {
        throw new AppError(400, "DEMO_CASHOUT_UNSUPPORTED", "Cashout is unavailable for demo-account bets.");
      }

      if (Number(bet.cashout_status) === 1 || Number(bet.status) === 1) {
        throw new AppError(400, "ALREADY_CASHED_OUT", "Cashout already done on this multiplier.");
      }

      const win = Number((Number(bet.amount) * numericMult).toFixed(2));

      await c.execute(
        `UPDATE chicken_bets
         SET win_amount = ?, multiplier = ?, cashout_status = 1, status = 1, updated_at = NOW()
         WHERE id = ?`,
        [win, numericMult, bet.id],
      );

      try {
        await c.execute(
          "UPDATE users SET wallet = wallet + ?, winning_wallet = COALESCE(winning_wallet, 0) + ?, updated_at = NOW() WHERE id = ?",
          [win, win, uid],
        );
      } catch (_) {
        await c.execute(
          "UPDATE users SET wallet = wallet + ? WHERE id = ?",
          [win, uid],
        );
      }

      try {
        await c.execute(
          "UPDATE wallets SET balance = COALESCE(balance, 0) + ?, updated_at = NOW() WHERE user_id = ?",
          [win, uid],
        );
      } catch (_) {}

      try {
        await this.recordWalletMovement(c, {
          userId: uid,
          amount: win,
          type: 1,
          remark: "Chicken Road Win",
          description: "Chicken Road cashout credit",
        });
      } catch (_) {}

      await c.commit();
      return {
        success: true,
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
    try {
      const [data] = await pool.execute(
        "SELECT id, value FROM bet_values WHERE status = 1 ORDER BY value ASC",
      );
      if (Array.isArray(data) && data.length > 0) {
        return {
          success: true,
          status: 200,
          message: "data fetch success",
          data,
        };
      }
    } catch (_) { }

    const fallbackValues = [
      { id: 1, value: 10, status: 1 },
      { id: 2, value: 20, status: 1 },
      { id: 3, value: 50, status: 1 },
      { id: 4, value: 100, status: 1 },
      { id: 5, value: 200, status: 1 },
      { id: 6, value: 500, status: 1 },
      { id: 7, value: 1000, status: 1 },
    ];
    return {
      success: true,
      status: 200,
      message: "data fetch success",
      data: fallbackValues,
    };
  }

  async rules() {
    const pool = this.poolProvider();
    const data = {};
    try {
      const [rows] = await pool.execute("SELECT name, value FROM game_rules");
      for (const r of rows) {
        data[r.name] = r.value;
      }
    } catch (_) {}
    if (!Object.keys(data).length) {
      data.min_bet_amount = "5";
      data.max_bet_amount = "50";
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
    const schema = await this.multiplierSchema(pool);
    const values = [];
    let sql = "SELECT * FROM multiplier WHERE type IN (1, 2, 3, 4)";
    if (schema.hasGameId) sql += " AND (game_id = 19 OR game_id = 1)";
    if (type) {
      sql += " AND type = ?";
      values.push(type);
    }

    let records = [];
    try {
      const [res] = await pool.execute(sql, values);
      records = res || [];
    } catch (_) { }

    if (!records.length) {
      records = [
        { id: 1, type: 1, frequency: 1, multiplier: "1.03;1.07;1.12;1.18;1.25;1.34;1.45;1.58;1.75;1.96;2.24;2.61;3.14;3.92;5.14;7.2;11.05;19.34;41.45;124.36;746.16" },
        { id: 2, type: 2, frequency: 1, multiplier: "1.12;1.28;1.48;1.75;2.11;2.61;3.32;4.38;6.02;8.76;13.62;23.36;45.55;106.28;318.84;1434.78" },
        { id: 3, type: 3, frequency: 1, multiplier: "1.25;1.62;2.19;3.10;4.65;7.44;12.92;24.81;55.82;148.86;521.01;2605.05" },
        { id: 4, type: 4, frequency: 1, multiplier: "1.50;2.45;4.41;8.82;20.29;54.11;175.86;747.41;4484.47" },
      ];
      if (type) {
        records = records.filter((r) => String(r.type) === String(type));
      }
    }

    records = records.map((record) => ({ ...record, type: Number(record.type) }));

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
          "SELECT COALESCE(SUM(win_amount), 0) AS total_win, COALESCE(SUM(amount), 0) AS total_bet FROM chicken_bets WHERE user_id = ?",
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
    const schema = await this.multiplierSchema(pool);
    const [multipliers] = await pool.execute(
      `SELECT * FROM multiplier ORDER BY ${schema.hasGameId ? "game_id ASC, " : ""}type ASC, id ASC`,
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
    const [result] = await pool.execute(
      "UPDATE roast_control SET roast_multiplier = ? WHERE id = ?",
      [roast_multiplier, id],
    );
    if (result.affectedRows === 0) throw new AppError(404, "NOT_FOUND", "Roast control not found.");

    return {
      status: true,
      success: true,
      message: "Roast Multiplier Updated!",
    };
  }

  async addMultiplier({ multiplier, frequency, type, game_id = 19 }) {
    if (!multiplier) {
      throw new AppError(400, "VALIDATION_ERROR", "The multiplier field is required.");
    }
    const parsedType = num(type, "type", 1);
    if (![1, 2, 3, 4].includes(parsedType)) {
      throw new AppError(400, "VALIDATION_ERROR", "The type must be between 1 and 4.");
    }

    const pool = this.poolProvider();
    const schema = await this.multiplierSchema(pool);
    const values = schema.hasGameId
      ? [num(game_id, "game_id"), multiplier, frequency ?? null, parsedType]
      : [multiplier, frequency ?? null, parsedType];
    const columns = schema.hasGameId ? "game_id, multiplier, frequency, type" : "multiplier, frequency, type";
    const placeholders = schema.hasGameId ? "?, ?, ?, ?" : "?, ?, ?";
    try {
      await pool.execute(
        `INSERT INTO multiplier (${columns}, created_at${schema.updatedColumn ? `, ${schema.updatedColumn}` : ""}) VALUES (${placeholders}, NOW()${schema.updatedColumn ? ", NOW()" : ""})`,
        values,
      );
    } catch {
      await pool.execute(
        `INSERT INTO multiplier (${columns}) VALUES (${placeholders})`,
        values,
      );
    }

    return {
      status: true,
      success: true,
      message: "Multiplier added successfully!",
    };
  }

  async updateMultiplier({ id, multiplier, frequency, type, game_id = 19 }) {
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
    const schema = await this.multiplierSchema(pool);
    const setParts = [];
    const values = [];
    if (schema.hasGameId) {
      setParts.push("game_id = ?");
      values.push(num(game_id, "game_id"));
    }
    setParts.push("multiplier = ?", "frequency = ?", "type = ?");
    values.push(multiplier, frequency ?? null, parsedType);
    if (schema.updatedColumn) setParts.push(`${schema.updatedColumn} = NOW()`);
    values.push(id);
    try {
      await pool.execute(`UPDATE multiplier SET ${setParts.join(", ")} WHERE id = ?`, values);
    } catch {
      await pool.execute(
        `UPDATE multiplier SET ${setParts.filter((part) => !part.includes("NOW()")).join(", ")} WHERE id = ?`,
        values.filter((_, index) => !setParts[index]?.includes("NOW()")),
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
