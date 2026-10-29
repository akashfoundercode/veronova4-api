const { pool } = require('../config/database');
const { raceEngine } = require('./raceEngine');

let lastMetricsErrorKey = null;

class AnalyticsService {
    /**
     * Get real-time Platform & Admin KPIs
     * - Active Players (online connected)
     * - Today's Total Bets Placed
     * - Today's Total Payouts / Winnings
     * - Gross Gaming Revenue (GGR = Bets - Payouts)
     * - Platform Liability (Potential payout on active pending bets)
     * - Live Current Race Betting Pot
     */
    static async getPlatformMetrics(activePlayersCount = 0) {
        try {
            // 1. Today's Total Bets Placed
            const [betRows] = await pool.query(
                `SELECT COUNT(*) AS totalBetsCount, COALESCE(SUM(amount), 0) AS totalBetsAmount
                 FROM bets
                 WHERE DATE(created_at) = CURDATE()`
            );
            const todaysTotalBetsCount = Number(betRows[0]?.totalBetsCount || 0);
            const todaysTotalBetsAmount = Number(Number(betRows[0]?.totalBetsAmount || 0).toFixed(2));

            // 2. Today's Total Winnings / Payouts Distributed
            const [payoutRows] = await pool.query(
                `SELECT COUNT(*) AS totalWinsCount, COALESCE(SUM(payout_amount), 0) AS totalPayoutsAmount
                 FROM bets
                 WHERE DATE(created_at) = CURDATE() AND status = 'WON'`
            );
            const todaysTotalPayoutsAmount = Number(Number(payoutRows[0]?.totalPayoutsAmount || 0).toFixed(2));
            const todaysWinsCount = Number(payoutRows[0]?.totalWinsCount || 0);

            // 3. Gross Gaming Revenue (GGR = Total Bets - Total Payouts)
            const grossGamingRevenue = Number((todaysTotalBetsAmount - todaysTotalPayoutsAmount).toFixed(2));

            // 4. Platform Liability (Sum of potential payouts for currently pending bets)
            const [liabilityRows] = await pool.query(
                `SELECT COALESCE(SUM(potential_payout), 0) AS totalLiability
                 FROM bets
                 WHERE status = 'PENDING'`
            );
            const platformLiability = Number(Number(liabilityRows[0]?.totalLiability || 0).toFixed(2));

            // 5. Live Current Race Betting Pot Breakdown
            const currentRace = raceEngine.getCurrentState();
            let livePot = {
                raceId: currentRace?.id || null,
                gameSerial: currentRace?.gameSerial || null,
                totalPot: 0,
                totalBetsCount: 0,
                horsePots: {},
            };

            if (currentRace && currentRace.active && currentRace.id) {
                const [potRows] = await pool.query(
                    `SELECT horse_serial, horse_name, COUNT(*) AS betsCount, COALESCE(SUM(amount), 0) AS horseTotal
                     FROM bets
                     WHERE race_id = ?
                     GROUP BY horse_serial, horse_name`,
                    [currentRace.id]
                );

                let potSum = 0;
                let betCountSum = 0;
                const horsePots = {};

                for (const r of potRows) {
                    const amount = Number(Number(r.horseTotal).toFixed(2));
                    const count = Number(r.betsCount);
                    potSum += amount;
                    betCountSum += count;
                    horsePots[r.horse_serial] = {
                        horseSerial: r.horse_serial,
                        horseName: r.horse_name,
                        amount,
                        betsCount: count,
                    };
                }

                livePot.totalPot = Number(potSum.toFixed(2));
                livePot.totalBetsCount = betCountSum;
                livePot.horsePots = horsePots;
            }

            lastMetricsErrorKey = null;

            return {
                timestamp: new Date().toISOString(),
                activePlayers: Math.max(0, Number(activePlayersCount)),
                todaysBets: {
                    count: todaysTotalBetsCount,
                    totalAmount: todaysTotalBetsAmount,
                    displayAmount: `₹${todaysTotalBetsAmount.toFixed(2)}`,
                },
                todaysPayouts: {
                    count: todaysWinsCount,
                    totalAmount: todaysTotalPayoutsAmount,
                    displayAmount: `₹${todaysTotalPayoutsAmount.toFixed(2)}`,
                },
                grossGamingRevenue: {
                    amount: grossGamingRevenue,
                    displayAmount: grossGamingRevenue >= 0 ? `+₹${grossGamingRevenue.toFixed(2)}` : `-₹${Math.abs(grossGamingRevenue).toFixed(2)}`,
                    profitMarginPercent: todaysTotalBetsAmount > 0 ? Number(((grossGamingRevenue / todaysTotalBetsAmount) * 100).toFixed(2)) : 0,
                },
                platformLiability: {
                    amount: platformLiability,
                    displayAmount: `₹${platformLiability.toFixed(2)}`,
                },
                livePot,
            };
        } catch (error) {
            const errorKey = `${error.code || error.name || 'Error'}:${error.message}`;
            if (lastMetricsErrorKey !== errorKey) {
                console.error('[AnalyticsService] Error calculating platform metrics:', error.message);
                lastMetricsErrorKey = errorKey;
            }
            return {
                timestamp: new Date().toISOString(),
                activePlayers: Math.max(0, Number(activePlayersCount)),
                todaysBets: { count: 0, totalAmount: 0, displayAmount: '₹0.00' },
                todaysPayouts: { count: 0, totalAmount: 0, displayAmount: '₹0.00' },
                grossGamingRevenue: { amount: 0, displayAmount: '₹0.00', profitMarginPercent: 0 },
                platformLiability: { amount: 0, displayAmount: '₹0.00' },
                livePot: { totalPot: 0, totalBetsCount: 0, horsePots: {} },
            };
        }
    }
}

module.exports = AnalyticsService;

