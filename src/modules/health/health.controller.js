"use strict";

function getHealth(req, res) {
  return res.status(200).json({
    data: { status: "ok" },
  });
}

module.exports = { getHealth };
