"use strict";

const { AuthService } = require("./auth.service");

const service = new AuthService();

function invalidLogin(res) {
  return res.status(401).json({
    message: "Invalid credentials or country code mismatch. Contact admin..!",
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
  if (login_token !== undefined && typeof login_token !== "string") {
    return res.status(400).json({
      message: "The login_token must be a string.",
      status: "400",
    });
  }

  let ip_address = "127.0.0.1";
  try {
    const forwarded = req.headers ? req.headers["x-forwarded-for"] : null;
    if (typeof forwarded === "string" && forwarded.trim()) {
      ip_address = forwarded.split(",")[0].trim();
    } else if (req.socket && req.socket.remoteAddress) {
      ip_address = req.socket.remoteAddress;
    } else if (req.connection && req.connection.remoteAddress) {
      ip_address = req.connection.remoteAddress;
    }
  } catch {
    ip_address = "127.0.0.1";
  }

  const result = await service.login({
    identity: identityValue.trim(),
    password,
    login_token,
    ip_address,
  });
  if (!result) {
    return invalidLogin(res);
  }

  return res.status(200).json({
    message: "Login successful",
    status: "200",
    id: result.id,
    token: result.token,
    token_type: "Bearer",
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
    },
  });
}

async function profile(req, res) {
  const user = req.user;
  const wallet = Number(user.wallet ?? 0);
  const thirdPartyWallet = Number(user.third_party_wallet ?? 0);

  return res.status(200).json({
    success: 200,
    message: "Data found",
    data: {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      username: user.username,
      userimage: user.userimage,
      recharge: user.recharge,
      u_id: user.u_id,
      referral_code: user.referral_code,
      wallet,
      third_party_wallet: thirdPartyWallet,
      total_wallet: wallet + thirdPartyWallet,
      winning_amount: user.winning_wallet,
      status: "1",
      type: "0",
    },
  });
}

async function wallet(req, res) {
  const user = req.user;
  const mainWallet = Number(user.wallet ?? 0);
  const thirdPartyWallet = Number(user.third_party_wallet ?? 0);

  return res.status(200).json({
    status: 200,
    data: {
      wallet: mainWallet,
      third_party_wallet: thirdPartyWallet,
      total_wallet: mainWallet + thirdPartyWallet,
      winning_amount: Number(user.winning_wallet ?? 0),
      recharge: Number(user.recharge ?? 0),
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

module.exports = {
  login,
  logout,
  mainWalletTransfer,
  profile,
  register,
  wallet,
};
