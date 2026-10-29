"use strict";

const assert = require("node:assert/strict");
const { test, after, beforeEach } = require("node:test");
const { raceEngine } = require("../src/modules/horseRace/services/raceEngine");
const { pool } = require("../src/modules/horseRace/config/database");

after(() => {
  raceEngine.stop();
});

const mockHorses = Array.from({ length: 12 }, (_, i) => ({
  horse_id: i + 1,
  serial_number: i + 1,
  horse_name_snapshot: `Horse #${i + 1}`,
}));

test("CONDITION 1 (RULE 1): When no bets are placed, random horse among 12 wins", async () => {
  const originalQuery = pool.query;
  try {
    pool.query = async () => [[]]; // 0 bets
    raceEngine.horseBetsMap.clear();
    raceEngine.totalPot = 0;

    const winner = await raceEngine.calculateSmartWinner(mockHorses, 101);
    assert.ok(winner, "Winner must exist");
    assert.ok(winner.serial_number >= 1 && winner.serial_number <= 12, "Winner must be one of 1-12");
  } finally {
    pool.query = originalQuery;
  }
});

test("CONDITION 2 (RULE 2): Bets on some horses (7, 8, 9) -> 100% picks unbetted horse with ₹0 bet", async () => {
  const originalQuery = pool.query;
  try {
    pool.query = async () => [
      [
        { horse_id: 7, horse_serial: 7, totalBets: 500, betCount: 3 },
        { horse_id: 8, horse_serial: 8, totalBets: 200, betCount: 2 },
        { horse_id: 9, horse_serial: 9, totalBets: 1000, betCount: 5 },
      ]
    ];
    raceEngine.horseBetsMap.clear();

    for (let i = 0; i < 30; i++) {
      const winner = await raceEngine.calculateSmartWinner(mockHorses, 102);
      const serial = Number(winner.serial_number);
      assert.ok(![7, 8, 9].includes(serial), `Horse ${serial} had bets and must NEVER win!`);
      assert.ok([1, 2, 3, 4, 5, 6, 10, 11, 12].includes(serial), `Winner must be from 0-bet horses`);
    }
  } finally {
    pool.query = originalQuery;
  }
});

test("CONDITION 3 (RULE 3): All 12 horses have bets -> Horse with LEAST bet amount wins", async () => {
  const originalQuery = pool.query;
  try {
    // Horse #4 has lowest bet (₹10), others have higher
    pool.query = async () => [
      mockHorses.map((h, i) => ({
        horse_id: h.horse_id,
        horse_serial: h.serial_number,
        totalBets: i === 3 ? 10 : (i + 1) * 100,
        betCount: 1,
      }))
    ];
    raceEngine.horseBetsMap.clear();

    const winner = await raceEngine.calculateSmartWinner(mockHorses, 103);
    assert.equal(Number(winner.serial_number), 4, "Horse #4 with lowest ₹10 bet must strictly win");
  } finally {
    pool.query = originalQuery;
  }
});

test("CONDITION 4 (RULE 4): All horses have equal bets -> Winner picked randomly from tied lowest", async () => {
  const originalQuery = pool.query;
  try {
    pool.query = async () => [
      mockHorses.map((h) => ({
        horse_id: h.horse_id,
        horse_serial: h.serial_number,
        totalBets: 100,
        betCount: 1,
      }))
    ];
    raceEngine.horseBetsMap.clear();

    const winner = await raceEngine.calculateSmartWinner(mockHorses, 104);
    assert.ok(winner, "Winner must exist");
    assert.ok(winner.serial_number >= 1 && winner.serial_number <= 12, "Winner must be one of 12");
  } finally {
    pool.query = originalQuery;
  }
});

test("CONDITION 2 IN-MEMORY FALLBACK: DB down but in-memory bets on 2, 5 -> Unbetted horse wins", async () => {
  const originalQuery = pool.query;
  try {
    pool.query = async () => { throw new Error("DB Connection Lost"); };
    raceEngine.horseBetsMap.clear();
    raceEngine.horseBetsMap.set(2, { totalBetsAmount: 150, totalBetsCount: 1 });
    raceEngine.horseBetsMap.set(5, { totalBetsAmount: 300, totalBetsCount: 2 });

    for (let i = 0; i < 20; i++) {
      const winner = await raceEngine.calculateSmartWinner(mockHorses, 105);
      const serial = Number(winner.serial_number);
      assert.ok(![2, 5].includes(serial), `Horse ${serial} had in-memory bets and must NEVER win!`);
    }
  } finally {
    pool.query = originalQuery;
    raceEngine.horseBetsMap.clear();
  }
});

