"use strict";

const SUITS = [
  { name: "spades", symbol: "♠", colour: "black" },
  { name: "hearts", symbol: "♥", colour: "red" },
  { name: "clubs", symbol: "♣", colour: "black" },
  { name: "diamonds", symbol: "♦", colour: "red" },
];

const RANKS = [
  { rank: 1, label: "A", name: "Ace" },
  { rank: 2, label: "2", name: "2" },
  { rank: 3, label: "3", name: "3" },
  { rank: 4, label: "4", name: "4" },
  { rank: 5, label: "5", name: "5" },
  { rank: 6, label: "6", name: "6" },
  { rank: 7, label: "7", name: "7" },
  { rank: 8, label: "8", name: "8" },
  { rank: 9, label: "9", name: "9" },
  { rank: 10, label: "10", name: "10" },
  { rank: 11, label: "J", name: "Jack" },
  { rank: 12, label: "Q", name: "Queen" },
  { rank: 13, label: "K", name: "King" },
];

function buildFullDeck() {
  const deck = [];
  let id = 1;
  for (const suit of SUITS) {
    for (const r of RANKS) {
      deck.push({
        id: id++,
        rank: r.rank,
        label: r.label,
        suit: suit.name,
        symbol: `${r.label}${suit.symbol}`,
        colour: suit.colour,
        name: `${r.name} of ${suit.name.charAt(0).toUpperCase() + suit.name.slice(1)}`,
        image: `/images/cards/${suit.name}_${r.rank}.png`,
      });
    }
  }
  return deck;
}

const DECK_52 = Object.freeze(buildFullDeck());

/**
 * Normalizes winner representation to 'D', 'T', or 'Tie'
 */
function normalizeWinner(winner) {
  if (winner === undefined || winner === null) return null;
  const str = String(winner).trim().toUpperCase();
  if (str === "D" || str === "1" || str === "DRAGON") return "D";
  if (str === "T" || str === "2" || str === "TIGER") return "T";
  if (str === "TIE" || str === "3") return "Tie";
  if (str === "AUTO" || str === "0") return "auto";
  return null;
}

function winnerToNumber(winner) {
  const norm = normalizeWinner(winner);
  if (norm === "D") return 1;
  if (norm === "T") return 2;
  if (norm === "Tie") return 3;
  return 1;
}

function numberToWinner(num) {
  const n = Number(num);
  if (n === 1) return "D";
  if (n === 2) return "T";
  if (n === 3) return "Tie";
  return "D";
}

function getPayoutMultiplier(winner) {
  const norm = normalizeWinner(winner);
  if (norm === "Tie") return 5;
  return 2; // Dragon or Tiger is 2x
}

/**
 * Deals 2 cards from standard 52-card deck strictly guaranteeing the winner:
 * - Dragon wins ('D'): dragon.rank > tiger.rank
 * - Tiger wins ('T'): tiger.rank > dragon.rank
 * - Tie wins ('Tie'): dragon.rank === tiger.rank (different suits)
 */
function dealWinningCards(winner, random = Math.random) {
  const norm = normalizeWinner(winner) || "D";
  const shuffled = [...DECK_52];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (norm === "Tie") {
    // Pick random rank 1..13
    const targetRank = Math.floor(random() * 13) + 1;
    const matching = shuffled.filter((c) => c.rank === targetRank);
    const dCard = matching[0];
    const tCard = matching[1];
    return {
      dragon: dCard,
      tiger: tCard,
      winner: "Tie",
      win_number: 3,
      multiplier: 5,
    };
  }

  if (norm === "D") {
    // Dragon > Tiger
    const pairs = [];
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = 0; j < shuffled.length; j++) {
        if (i !== j && shuffled[i].rank > shuffled[j].rank) {
          pairs.push([shuffled[i], shuffled[j]]);
          if (pairs.length >= 40) break;
        }
      }
      if (pairs.length >= 40) break;
    }
    const [dCard, tCard] = pairs[Math.floor(random() * pairs.length)];
    return {
      dragon: dCard,
      tiger: tCard,
      winner: "D",
      win_number: 1,
      multiplier: 2,
    };
  }

  // Tiger wins: Tiger > Dragon
  const pairs = [];
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = 0; j < shuffled.length; j++) {
      if (i !== j && shuffled[j].rank > shuffled[i].rank) {
        pairs.push([shuffled[i], shuffled[j]]);
        if (pairs.length >= 40) break;
      }
    }
    if (pairs.length >= 40) break;
  }
  const [dCard, tCard] = pairs[Math.floor(random() * pairs.length)];
  return {
    dragon: dCard,
    tiger: tCard,
    winner: "T",
    win_number: 2,
    multiplier: 2,
  };
}

/**
 * Determines winner according to rules:
 * 1. Admin forced winner if configured (D, T, Tie)
 * 2. If not forced (Auto mode): the option with the LOWEST TOTAL BET AMOUNT wins!
 */
function determineWinner({
  dragonTotal = 0,
  tigerTotal = 0,
  tieTotal = 0,
  adminForced = null,
  random = Math.random,
} = {}) {
  const forced = normalizeWinner(adminForced);
  if (forced && forced !== "auto") {
    return forced;
  }

  const totals = [
    { code: "D", amount: Number(dragonTotal) || 0 },
    { code: "T", amount: Number(tigerTotal) || 0 },
    { code: "Tie", amount: Number(tieTotal) || 0 },
  ];

  // With no bets at all, there is no low-bet side to favor; choose uniformly.
  if (totals.every((t) => t.amount === 0)) {
    return totals[Math.floor(random() * totals.length)].code;
  }

  const minAmt = Math.min(...totals.map((t) => t.amount));
  const candidates = totals.filter((t) => t.amount === minAmt);

  if (candidates.length === 1) {
    return candidates[0].code;
  }

  const picked = candidates[Math.floor(random() * candidates.length)];
  return picked.code;
}

module.exports = {
  DECK_52,
  SUITS,
  RANKS,
  buildFullDeck,
  normalizeWinner,
  winnerToNumber,
  numberToWinner,
  getPayoutMultiplier,
  dealWinningCards,
  determineWinner,
};
