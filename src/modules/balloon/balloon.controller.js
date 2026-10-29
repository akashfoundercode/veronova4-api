"use strict";

const { BalloonService } = require("./balloon.service");
const AppError = require("../../shared/errors/AppError");

const s = new BalloonService();

async function run(res, fn) {
  try {
    return res.status(200).json(await fn());
  } catch (e) {
    if (e instanceof AppError) {
      return res.status(200).json({ status: e.statusCode, message: e.message });
    }
    throw e;
  }
}

module.exports = {
  bet: (q, r) => {
    const body = { ...(q.body || {}) };
    if (q.user?.id) body.uid = Number(q.user.id);
    return run(r, () => s.bet(body));
  },
  cashout: (q, r) => run(r, () => s.cashout(q.body)),
  history: (q, r) => {
    const body = { ...(q.body || {}) };
    if (q.user?.id) body.uid = Number(q.user.id);
    return run(r, () => s.history(body));
  },
  cancel: (q, r) => {
    const body = { ...(q.body || {}) };
    if (q.user?.id) body.userid = Number(q.user.id);
    return run(r, () => s.cancel(body));
  },
  last: (q, r) => run(r, () => s.last()),
  images: (q, r) => run(r, () => s.images()),
  updateImage: (q, r) => {
    const body = { ...(q.body || {}) };
    if (q.user?.id) body.userid = Number(q.user.id);
    return run(r, () => s.updateImage(body));
  },
};
