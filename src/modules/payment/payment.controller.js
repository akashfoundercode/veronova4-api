"use strict";

const { PaymentService } = require("./payment.service");

const service = new PaymentService();

// 1. Innersoul Cares Initiate
async function innersoulcares(req, res) {
  const body = req.body || {};
  const user_id = body.user_id || req.user?.id;
  const cash = Number(body.cash);
  const type = body.type ?? 0;

  if (!user_id) {
    return res.status(200).json({ status: 400, message: "The user id field is required." });
  }
  if (!cash || isNaN(cash) || cash < 1) {
    return res.status(200).json({ status: 400, message: "The cash must be at least 1." });
  }

  const result = await service.innersoulcares({ user_id, cash, type });
  return res.status(result.status || 200).json(result);
}

// 2. Check Innersoul Payment
async function checkInnersoulPayment(req, res) {
  const orderId = req.query.order_id || req.body.order_id;
  if (!orderId) {
    return res.redirect("https://root.veronova.co.in/uploads/payment_failed.php");
  }

  const result = await service.checkInnersoulPayment(orderId);
  if (req.accepts("html")) {
    return res.redirect(result.redirect);
  }
  return res.json(result);
}

// 3. Payzaaar Callback
async function payzaaarCallback(req, res) {
  const data = req.body || {};
  const result = await service.payzaaarCallback(data);
  return res.json(result);
}

// 4. Check Payzaaar Payment
async function checkPayzaaarPayment(req, res) {
  const orderId = req.query.order_id || req.body.order_id;
  if (!orderId) {
    return res.status(200).json({ status: 400, message: "Order ID is required" });
  }
  const result = await service.checkPayzaaarPayment(orderId);
  return res.json(result);
}

// 5. Standard Type 2 Payin
async function payin(req, res) {
  const body = req.body || {};
  const user_id = body.user_id || req.user?.id;
  const cash = body.cash;
  const type = body.type;

  if (!user_id) {
    return res.status(200).json({ status: "400", message: "The user id field is required." });
  }
  if (!cash || Number(cash) < 100) {
    return res.status(200).json({ status: "400", message: "The cash must be at least 100." });
  }
  if (!type) {
    return res.status(200).json({ status: "400", message: "The type field is required." });
  }

  const result = await service.payin({ user_id, cash, type, req });
  return res.json(result);
}

// 6. Check Payment (Type 2)
async function checkPayment(req, res) {
  const orderId = req.query.order_id || req.body.order_id;
  if (!orderId) {
    return res.status(200).json({ status: 400, message: "Order ID is required" });
  }
  const result = await service.checkPayment(orderId);
  if (req.accepts("html") && !req.xhr) {
    return res.redirect("https://root.veronova.co.in/uploads/payment_success.php");
  }
  return res.json(result);
}

// 7. LG Pay Initiate
async function lgPayPayin(req, res) {
  const body = req.body || {};
  const user_id = body.user_id || req.user?.id;
  const cash = body.cash;
  const type = body.type;
  let ip = "127.0.0.1";
  try {
    ip = req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
  } catch (_) {
    ip = "127.0.0.1";
  }

  if (!user_id || !cash || !type) {
    return res.status(200).json({ status: "400", message: "Missing required fields" });
  }

  const result = await service.lgPayPayin({ user_id, cash, type, ip });
  return res.json(result);
}

// 8. LG Pay Webhook
async function lgPayCallback(req, res) {
  const data = req.method === "GET" ? req.query : req.body;
  const result = await service.lgPayCallback(data);
  return res.send(result);
}

// 9. Get USDT Details
async function getUsdt(req, res) {
  const result = await service.getUsdt();
  return res.json(result);
}

// 10. Manual USDT Payin
async function usdtPayin(req, res) {
  const body = req.body || {};
  const user_id = body.user_id || req.user?.id;
  const cash = body.cash;
  const inr = body.inr;
  const type = body.type;
  const screenshot = body.screenshot || body.image;

  if (!user_id || cash === undefined || inr === undefined || type === undefined) {
    return res.status(200).json({ status: 400, message: "Missing required fields" });
  }

  const result = await service.usdtPayin({ user_id, cash, inr, type, screenshot });
  return res.json(result);
}

// 11. Automatic USDT Payin
async function usdt(req, res) {
  const body = req.body || {};
  const user_id = body.user_id || req.user?.id;
  const inr = body.inr;
  const type = body.type;
  const cash = body.cash;

  const result = await service.usdtAuto({ user_id, inr, type, cash });
  return res.json(result);
}

// 12. USDT Callback
async function usdtCallback(req, res) {
  const result = await service.usdtCallback(req.body);
  return res.json(result);
}

// 13. USDT Withdraw
async function usdtWithdraw(req, res) {
  return res.json({
    status: 200,
    message: "Payout Initiated. Status: PENDING",
  });
}

// 14. Withdraw Request
async function withdraw(req, res) {
  const body = req.body || {};
  const user_id = body.user_id || req.user?.id;
  const account_id = body.account_id;
  const amount = body.amount;
  const type = body.type ?? 0;

  if (!user_id || !account_id || !amount) {
    return res.status(400).json({ status: 400, message: "Missing required fields" });
  }

  const result = await service.withdraw({ user_id, account_id, amount, type });
  return res.status(result.status || 200).json(result);
}

// 15. Deposit History
async function depositHistory(req, res) {
  const q = req.method === "POST" ? req.body : req.query;
  const user_id = q.user_id || req.user?.id;
  if (!user_id) {
    return res.status(400).json({ status: 400, message: "The user id field is required." });
  }
  const result = await service.depositHistory(q);
  return res.status(result.status || 200).json(result);
}

// 16. Withdraw History
async function withdrawHistory(req, res) {
  const q = req.method === "POST" ? req.body : req.query;
  const user_id = q.user_id || req.user?.id;
  if (!user_id) {
    return res.status(400).json({ status: 400, message: "The user id field is required." });
  }
  const result = await service.withdrawHistory(q);
  return res.status(result.status || 200).json(result);
}

// 17. Account View
async function accountView(req, res) {
  const q = req.method === "POST" ? req.body : req.query;
  const user_id = q.user_id || req.user?.id;
  if (!user_id) {
    return res.status(400).json({ status: 400, message: "The user id field is required." });
  }
  const result = await service.accountView(user_id);
  return res.status(result.status || 200).json(result);
}

// 18. Add Account
async function addAccount(req, res) {
  const body = req.body || {};
  const user_id = body.user_id || req.user?.id;
  const name = body.name;
  const account_number = body.account_number;
  const ifsc_code = body.ifsc_code;
  const bank_name = body.bank_name;
  const branch = body.branch || "";

  if (!user_id || !name || !account_number || !ifsc_code || !bank_name) {
    return res.status(400).json({ status: 400, message: "All bank account fields are required." });
  }

  const result = await service.addAccount({ user_id, name, account_number, ifsc_code, bank_name, branch });
  return res.status(result.status || 200).json(result);
}

// 19. USDT Account View
async function usdtAccountView(req, res) {
  const q = req.method === "POST" ? req.body : req.query;
  const user_id = q.user_id || req.user?.id;
  if (!user_id) {
    return res.json({ success: false, message: "The user id field is required." });
  }
  const result = await service.usdtAccountView(user_id);
  return res.json(result);
}

// 20. Add USDT Address
async function addUsdtAddress(req, res) {
  const body = req.body || {};
  const user_id = body.user_id || req.user?.id;
  const name = body.name;
  const usdt_wallet_address = body.usdt_wallet_address;

  if (!user_id || !name || !usdt_wallet_address) {
    return res.json({ success: false, message: "All USDT fields are required." });
  }

  const result = await service.addUsdtAddress({ user_id, name, usdt_wallet_address });
  return res.json(result);
}

// 21. Payment Modes
async function payModes(req, res) {
  const q = req.method === "POST" ? req.body : req.query;
  const userId = q.userid || q.user_id || req.user?.id;
  const type = q.type;
  const result = await service.payModes(userId, type);
  return res.json(result);
}

// 22. Payment Limits
async function getPaymentLimits(req, res) {
  const result = await service.getPaymentLimits();
  return res.json(result);
}

// 23. Deduct Amount / Update Wallet
async function deductAmount(req, res) {
  const body = req.body || {};
  const user_id = body.user_id || body.userId;
  const amount = body.amount;

  if (!user_id || amount === undefined) {
    return res.status(400).json({ status: 400, message: "user_id and amount are required" });
  }
  const result = await service.deductAmount({ user_id, amount });
  return res.status(result.status === 200 ? 200 : 400).json(result);
}

module.exports = {
  innersoulcares,
  checkInnersoulPayment,
  payzaaarCallback,
  checkPayzaaarPayment,
  payin,
  checkPayment,
  lgPayPayin,
  lgPayCallback,
  getUsdt,
  usdtPayin,
  usdt,
  usdtCallback,
  usdtWithdraw,
  withdraw,
  depositHistory,
  withdrawHistory,
  accountView,
  addAccount,
  usdtAccountView,
  addUsdtAddress,
  payModes,
  getPaymentLimits,
  deductAmount,
};
