"use strict";

const { getPool } = require("../../config/database");
const { AuthService } = require("./auth.service");

const service = new AuthService();

function invalidLogin(res, customMessage) {
  return res.status(401).json({
    message: customMessage || "Invalid credentials. Please verify your mobile and password.",
    status: "401",
  });
}

async function login(req, res) {
  const body = req.body ?? {};
  const identityValue =
    body.identity ??
    body.email ??
    body.username ??
    body.u_id ??
    (body.mobile !== undefined ? String(body.mobile) : undefined);
  const password = body.password;
  const rawCountryCode = body.country_code ?? "91";
  const login_token = body.login_token;
  const providedIpAddress = body.ip_address;

  if (typeof identityValue !== "string" || identityValue.trim() === "") {
    return res.status(400).json({
      message: "The identity field is required.",
      status: "400",
    });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      message: "The password must be at least 6 characters.",
      status: "400",
    });
  }
  const countryCode =
    typeof rawCountryCode === "number" ? String(rawCountryCode) : rawCountryCode;

  if (typeof countryCode !== "string" || countryCode.trim() === "") {
    return res.status(400).json({
      message: "The country_code field is required.",
      status: "400",
    });
  }
  if (providedIpAddress !== undefined && (typeof providedIpAddress !== "string" || providedIpAddress.trim() === "")) {
    return res.status(400).json({
      message: "The ip_address field must be a non-empty string.",
      status: "400",
    });
  }
  if (login_token !== undefined && typeof login_token !== "string") {
    return res.status(400).json({
      message: "The login_token must be a string.",
      status: "400",
    });
  }

  let ip_address = "127.0.0.1";
  try {
    if (providedIpAddress) {
      ip_address = providedIpAddress.trim();
    } else {
      const forwarded = req.headers ? req.headers["x-forwarded-for"] : null;
      if (typeof forwarded === "string" && forwarded.trim()) {
      ip_address = forwarded.split(",")[0].trim();
      } else if (req.socket && req.socket.remoteAddress) {
        ip_address = req.socket.remoteAddress;
      } else if (req.connection && req.connection.remoteAddress) {
        ip_address = req.connection.remoteAddress;
      }
    }
  } catch {
    ip_address = "127.0.0.1";
  }

  const result = await service.login({
    identity: identityValue.trim(),
    password,
    login_token,
    ip_address,
    country_code: countryCode.trim(),
  });
  if (!result || result.error) {
    return invalidLogin(res, result?.message);
  }

  const loginToken = body.login_token || result.login_token;

  let userRow = null;
  try {
    const [rows] = await getPool().execute(
      "SELECT id, username, mobile, email, u_id, wallet, winning_wallet, third_party_wallet, recharge, status, account_type FROM users WHERE id = ? LIMIT 1",
      [result.id]
    );
    if (rows && rows.length > 0) userRow = rows[0];
  } catch (_) {}

  const userWallet = Number(userRow?.wallet ?? 0);
  const winWallet = Number(userRow?.winning_wallet ?? 0);
  const thirdParty = Number(userRow?.third_party_wallet ?? 0);

  return res.status(200).json({
    message: "Login successful",
    status: "200",
    id: result.id,
    token: result.token,
    login_token: loginToken,
    token_type: "Bearer",
    wallet: userWallet,
    winning_wallet: winWallet,
    total_wallet: userWallet + thirdParty,
    data: {
      id: result.id,
      token: result.token,
      login_token: loginToken,
      username: userRow?.username,
      mobile: userRow?.mobile,
      email: userRow?.email,
      u_id: userRow?.u_id,
      wallet: userWallet,
      winning_wallet: winWallet,
      third_party_wallet: thirdParty,
      total_wallet: userWallet + thirdParty,
      recharge: Number(userRow?.recharge ?? 0),
      status: String(userRow?.status ?? 1),
      type: String(userRow?.account_type ?? 0),
    },
  });
}

async function register(req, res) {
  const body = req.body ?? {};
  const email =
    body.email === "" || body.email === null ? undefined : body.email;
  const countryCode =
    typeof body.country_code === "number"
      ? String(body.country_code)
      : body.country_code;
  const mobile =
    typeof body.mobile === "number" ? String(body.mobile) : body.mobile;
  const {
    password,
    password_confirmation,
    referral_code,
  } = body;

  if (
    email !== undefined &&
    (typeof email !== "string" ||
      email.length > 32 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return res.status(200).json({
      status: 400,
      message: "The email must be a valid email address.",
    });
  }
  if (
    typeof countryCode !== "string" ||
    countryCode.trim() === "" ||
    countryCode.length > 10
  ) {
    return res.status(200).json({
      status: 400,
      message: "The country_code field is required.",
    });
  }
  if (typeof mobile !== "string" || !/^\d{10}$/.test(mobile)) {
    return res.status(200).json({
      status: 400,
      message: "The mobile must be a 10 digit number.",
    });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 24) {
    return res.status(200).json({
      status: 400,
      message: "The password must be between 8 and 24 characters.",
    });
  }
  if (typeof password_confirmation !== "string" || password_confirmation !== password) {
    return res.status(200).json({
      status: 400,
      message: "The password confirmation does not match.",
    });
  }
  if (referral_code !== undefined && typeof referral_code !== "string") {
    return res.status(200).json({
      status: 400,
      message: "The referral_code must be a string.",
    });
  }

  const result = await service.register({
    email,
    country_code: countryCode.trim(),
    mobile,
    password,
    referral_code,
  });
  if (result.conflict) {
    return res.status(200).json({
      status: 400,
      message: result.conflict,
    });
  }

  return res.status(200).json({
    status: 200,
    message: "Registration successful",
    data: {
      userId: result.userId,
      token: result.token,
      login_token: result.login_token,
    },
    id: result.userId,
    token: result.token,
    login_token: result.login_token,
    token_type: "Bearer",
  });
}

async function profile(req, res) {
  const userId =
    req.user?.id ||
    req.auth?.tokenId ||
    req.query?.id ||
    req.query?.user_id ||
    req.query?.userid ||
    req.body?.id ||
    req.body?.user_id ||
    req.get("user-id") ||
    req.get("userid");

  let user = null;
  if (userId) {
    try {
      const [rows] = await getPool().execute(
        `SELECT u.*, a1.longtext AS minimum_withdraw, a2.longtext AS maximum_withdraw
         FROM users u
         LEFT JOIN admin_settings a1 ON a1.id = 15
         LEFT JOIN admin_settings a2 ON a2.id = 16
         WHERE u.id = ? LIMIT 1`,
        [userId]
      );
      if (rows && rows.length > 0) user = rows[0];
    } catch (_) {
      try {
        const [rows] = await getPool().execute(
          "SELECT * FROM users WHERE id = ? LIMIT 1",
          [userId]
        );
        if (rows && rows.length > 0) user = rows[0];
      } catch (_) {}
    }
  }

  if (!user && req.user) {
    user = req.user;
  }

  if (!user) {
    return res.status(404).json({ status: 400, message: "No data found" });
  }

  const wallet = Number(user.wallet ?? 0);
  const winningWallet = Number(user.winning_wallet ?? 0);
  const thirdPartyWallet = Number(user.third_party_wallet ?? 0);
  const totalWallet = wallet + thirdPartyWallet;

  const userData = { ...user };
  delete userData.password;
  delete userData.otp;
  delete userData.otp_expire_at;
  delete userData.is_otp_verified;

  return res.status(200).json({
    success: 200,
    status: 200,
    message: "Data found",
    wallet,
    winning_wallet: winningWallet,
    winning_amount: winningWallet,
    total_wallet: totalWallet,
    data: {
      ...userData,
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      username: user.username,
      userimage: user.userimage,
      recharge: Number(user.recharge ?? 0),
      u_id: user.u_id,
      login_token: user.login_token,
      referral_code: user.referral_code,
      illegal_count: user.illegal_count ?? 0,
      wallet,
      winning_wallet: winningWallet,
      winning_amount: winningWallet,
      third_party_wallet: thirdPartyWallet,
      total_wallet: totalWallet,
      minimum_withdraw: user.minimum_withdraw ?? "100",
      maximum_withdraw: user.maximum_withdraw ?? "50000",
      status: String(user.status ?? 1),
      type: String(user.account_type ?? 0),
    },
  });
}

async function wallet(req, res) {
  const userId =
    req.user?.id ||
    req.auth?.tokenId ||
    req.query?.id ||
    req.query?.user_id ||
    req.query?.userid ||
    req.body?.id ||
    req.body?.user_id ||
    req.get("user-id") ||
    req.get("userid");

  let user = null;
  if (userId) {
    try {
      const [rows] = await getPool().execute(
        "SELECT id, wallet, winning_wallet, third_party_wallet, recharge FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      if (rows && rows.length > 0) user = rows[0];
    } catch (_) {}
  }
  if (!user && req.user) user = req.user;

  const mainWallet = Number(user?.wallet ?? 0);
  const thirdPartyWallet = Number(user?.third_party_wallet ?? 0);
  const winningAmount = Number(user?.winning_wallet ?? 0);
  const recharge = Number(user?.recharge ?? 0);

  return res.status(200).json({
    status: 200,
    wallet: mainWallet,
    winning_wallet: winningAmount,
    winning_amount: winningAmount,
    total_wallet: mainWallet + thirdPartyWallet,
    data: {
      wallet: mainWallet,
      third_party_wallet: thirdPartyWallet,
      total_wallet: mainWallet + thirdPartyWallet,
      winning_amount: winningAmount,
      winning_wallet: winningAmount,
      recharge,
    },
  });
}

async function logout(req, res) {
  await service.revokeToken(req.auth.tokenId);
  return res.status(200).json({
    status: 200,
    message: "Logout successful",
  });
}

async function updateProfile(req, res) {
  const body = req.body ?? {};
  if (body.username !== undefined && (typeof body.username !== "string" || body.username.trim() === "")) {
    return res.status(200).json({ status: 400, message: "The username must be a non-empty string." });
  }
  if (body.userimage !== undefined && typeof body.userimage !== "string") {
    return res.status(200).json({ status: 400, message: "The userimage must be a string." });
  }
  if (body.username === undefined && body.userimage === undefined) {
    return res.status(200).json({ status: 400, message: "The username or userimage field is required." });
  }

  const updated = await service.updateProfile(req.user.id, {
    username: body.username?.trim(),
    userimage: body.userimage === "null" ? undefined : body.userimage,
  });
  if (!updated) {
    return res.status(401).json({ status: 401, message: "User block by admin..!" });
  }
  return res.status(200).json({ status: 200, message: "Successfully updated" });
}

async function mainWalletTransfer(req, res) {
  const requestedUserId = Number(req.body?.id);
  if (!Number.isInteger(requestedUserId) || requestedUserId < 1) {
    return res.status(200).json({
      status: 400,
      message: "The id field is required.",
    });
  }
  if (requestedUserId !== Number(req.user.id)) {
    return res.status(403).json({
      status: 403,
      message: "The id does not match the authenticated account.",
    });
  }

  const transferred = await service.transferThirdPartyWallet(requestedUserId);
  if (!transferred) {
    return res.status(401).json({
      status: 401,
      message: "User blocked by admin..!",
    });
  }
  return res.status(200).json({
    status: 200,
    message: "Wallet transfer Successfully ....!",
  });
}

async function getCountry(_req, res) {
  let countries = [];
  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT * FROM countries WHERE status = 1 ORDER BY id ASC");
    if (rows && rows.length > 0) {
      countries = rows.map((r) => ({
        id: r.id,
        name: r.name,
        country_name: r.name,
        country_code: String(r.country_code).replace(/^\+/, ""),
        phone_code: String(r.phone_code).startsWith("+") ? String(r.phone_code) : `+${r.phone_code}`,
        call_prefix: String(r.phone_code).startsWith("+") ? String(r.phone_code) : `+${r.phone_code}`,
        short_name: r.short_name || "IN",
        iso_code: r.iso_code || r.short_name || "IN",
        currency: r.currency || "INR",
        status: r.status ?? 1,
      }));
    }
  } catch (_) {}

  if (countries.length === 0) {
    countries = [
      {
        id: 1,
        name: "India",
        country_name: "India",
        country_code: "91",
        phone_code: "+91",
        call_prefix: "+91",
        short_name: "IN",
        iso_code: "IN",
        currency: "INR",
        status: 1,
      },
    ];
  }

  return res.status(200).json({
    status: 200,
    success: true,
    code: 200,
    msg: "success",
    message: "success",
    data: countries,
    country_code: "91",
    phone_code: "+91",
  });
}

module.exports = {
  getCountry,
  login,
  logout,
  mainWalletTransfer,
  profile,
  register,
  updateProfile,
  wallet,
};
