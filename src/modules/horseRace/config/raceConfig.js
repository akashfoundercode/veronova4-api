// Centralized Global Race Engine Configuration
module.exports = Object.freeze({
    // Lifecycle Phase Durations in Milliseconds
    BETTING_OPEN_MS: Number(process.env.RACE_BETTING_OPEN_MS || 35000),      // 35s Betting Window
    BETTING_CLOSED_MS: Number(process.env.RACE_BETTING_CLOSED_MS || 5000),   // 5s Bet Locked (Total 40s Betting)
    COUNTDOWN_MS: Number(process.env.RACE_COUNTDOWN_MS || 3000),             // 3s Countdown (3, 2, 1 -> GO & Instant Start)
    RUNNING_MS: Number(process.env.RACE_RUNNING_MS || 20000),                // 20s Race Running
    FINISHING_MS: Number(process.env.RACE_FINISHING_MS || 2000),             // 2s Finish Line Crossing
    RESULT_MS: Number(process.env.RACE_RESULT_MS || 4000),                   // 4s Winner & Result Display
    NEXT_RACE_DELAY_MS: Number(process.env.RACE_NEXT_DELAY_MS || 2000),      // 2s Delay before next race

    // Race Setup
    HORSES_COUNT: Number(process.env.RACE_HORSES_COUNT || 12),
    TIMEZONE: process.env.TIMEZONE || 'UTC',

    // Odds Settings (10X multiplier: Bet ₹10 -> Win ₹100)
    DEFAULT_ODDS: Number(process.env.DEFAULT_ODDS || 10.0),

    // Standard Coin Denominations (Multi-coin selection)
    ALLOWED_COINS: [2, 5, 10, 100, 500, 1000],

    // Jackpot Settings (Strictly 2X, 3X, 4X and N for Nothing)
    JACKPOT_ENABLED: process.env.JACKPOT_ENABLED !== 'false',
    JACKPOT_PROBABILITY: Number(process.env.JACKPOT_PROBABILITY || 0.02), // 2% rare chance default
    DEFAULT_JACKPOT_MULTIPLIERS: [2, 3, 4], // Multipliers (2X, 3X, 4X)
    JACKPOT_SLOTS: ['N', 2, 3, 4], // Wheel / Reel slots: N = Nothing (1X), 2 = 2X, 3 = 3X, 4 = 4X
});



