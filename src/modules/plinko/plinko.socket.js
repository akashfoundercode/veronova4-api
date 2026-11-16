"use strict";

const SAMPLE_NAMES = [
  "Vikram_Ace", "Kavya_R", "CryptoBull", "PlinkoKing", "LuckyStrike",
  "ShadowNinja", "Alex_Pro", "Zara_B", "DragonDrop", "Aarav_7",
  "QueenBee", "CyberNeon", "GoldRush_88", "Rohit_X", "StarGazer",
  "TitanDrop", "Maya_99", "NeonViper", "Pooja_S", "ApexHunter",
];

const MULT_WEIGHTS = [
  { mult: 1.7, weight: 12 },
  { mult: 1.4, weight: 16 },
  { mult: 1.2, weight: 22 },
  { mult: 1.0, weight: 24 },
  { mult: 0.8, weight: 16 },
  { mult: 0, isOut: true, weight: 10 },
];

function pickRandomResult() {
  const total = MULT_WEIGHTS.reduce((acc, cur) => acc + cur.weight, 0);
  let rnd = Math.random() * total;
  for (const item of MULT_WEIGHTS) {
    if (rnd < item.weight) return item;
    rnd -= item.weight;
  }
  return MULT_WEIGHTS[0];
}

function generateSimulatedBet() {
  const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
  const res = pickRandomResult();
  const bet = [5, 10, 20, 25, 50, 100, 200][Math.floor(Math.random() * 7)];
  const tierId = Math.random() < 0.2 ? (Math.random() < 0.6 ? 1 : 2) : 0;
  const payout = res.isOut ? 0 : Math.round(bet * res.mult * (tierId === 1 ? 10 : tierId === 2 ? 100 : 1));

  return {
    id: `bet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    player: name,
    bet,
    tier: tierId,
    mult: res.mult,
    isOut: Boolean(res.isOut),
    payout,
    timeAgo: "Just now",
    isUser: false,
    timestamp: Date.now(),
  };
}

let activeSocketInstance = null;

function createPlinkoSocket(io) {
  if (!io) return null;

  const nsp = typeof io.of === "function" ? io.of("/plinko") : io;
  let onlineCount = 2480 + Math.floor(Math.random() * 50);

  const intervalId = setInterval(() => {
    try {
      const simulatedBet = generateSimulatedBet();
      onlineCount += Math.random() > 0.5 ? 1 : -1;
      const payload = {
        bet: simulatedBet,
        onlineCount,
      };
      nsp.emit("plinko:new_bet", payload);
      nsp.emit("plinko:live_bet", payload);
      if (io !== nsp && typeof io.emit === "function") {
        io.emit("plinko:new_bet", payload);
      }
    } catch (_) {}
  }, 2200);

  nsp.on("connection", (client) => {
    client.emit("plinko:connected", {
      status: 200,
      message: "Connected to Plinko live stream",
      onlineCount,
    });
  });

  const instance = {
    io,
    nsp,
    broadcastBet: (betData) => {
      try {
        const payload = {
          bet: {
            id: `bet-${betData.id || Date.now()}`,
            player: betData.username || "YOU ⭐",
            bet: Number(betData.amount || betData.bet || 0),
            tier: Number(betData.tier || 0),
            mult: Number(betData.mult || betData.multiplier || 0),
            isOut: Boolean(betData.is_out || betData.isOut),
            payout: Number(betData.win_amount || betData.payout || 0),
            timeAgo: "Just now",
            isUser: true,
            timestamp: Date.now(),
          },
          onlineCount,
        };
        nsp.emit("plinko:new_bet", payload);
        nsp.emit("plinko:live_bet", payload);
        if (io !== nsp && typeof io.emit === "function") {
          io.emit("plinko:new_bet", payload);
        }
      } catch (_) {}
    },
    stop: () => {
      clearInterval(intervalId);
    },
  };

  activeSocketInstance = instance;
  return instance;
}

function getPlinkoSocket() {
  return activeSocketInstance;
}

module.exports = {
  createPlinkoSocket,
  getPlinkoSocket,
  generateSimulatedBet,
};
