const test = require('node:test');
const assert = require('node:assert/strict');
const { raceEngine } = require('../src/modules/horseRace/services/raceEngine');
const RaceModel = require('../src/modules/horseRace/models/race.model');
const app = require('../src/app');

function testRoute(method, url, headers = {}, body = null) {
    return new Promise((resolve) => {
        let statusCode = 200;
        let resBody = null;
        const req = {
            method,
            url,
            headers: { host: 'localhost:3010', ...headers },
            body: body || {},
        };
        const res = {
            statusCode: 200,
            setHeader() {},
            getHeader() {},
            status(code) {
                statusCode = code;
                return this;
            },
            json(data) {
                resBody = data;
                resolve({ statusCode, body: resBody });
            },
            send(data) {
                resBody = data;
                resolve({ statusCode, body: resBody });
            },
            end() {
                resolve({ statusCode, body: resBody });
            },
        };
        app.handle(req, res, (err) => {
            if (err) resolve({ statusCode: 500, body: { error: err.message } });
            else resolve({ statusCode: 404, body: null });
        });
    });
}

test('Horse Racing - Sequential Round Increment & Jackpot Forcing', async () => {
    try {
        // 1. Reset / Stop Engine
        raceEngine.stop();

        // 2. Start in-memory cycle
        await raceEngine.startInMemoryRaceCycle();
        const round1Serial = raceEngine.currentRace.game_serial;
        const round1Seq = parseInt(round1Serial.slice(8), 10);

        // 3. Set Forced Jackpot to 3X for current race
        const resJackpot = await raceEngine.setForcedJackpot({
            multiplier: '3X',
            reason: 'Admin test forced 3X',
        });
        assert.equal(resJackpot.success, true);
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 3);
        assert.equal(raceEngine.currentRace.is_jackpot, 1);

        // 4. Create next round - verify round sequence increments strictly by +1 and continuous jackpot applies
        await raceEngine.startInMemoryRaceCycle();
        const round2Serial = raceEngine.currentRace.game_serial;
        const round2Seq = parseInt(round2Serial.slice(8), 10);
        assert.equal(round2Seq, round1Seq + 1, 'Round sequence must increment strictly by +1');
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 3, 'Continuous 3X jackpot should apply to next round');

        // 5. Turn OFF Jackpot using 'N'
        const resOff = await raceEngine.configureContinuousJackpot({
            multiplier: 'N',
        });
        assert.equal(resOff.success, true);
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 1, 'Jackpot should revert to 1X');
        assert.equal(raceEngine.currentRace.is_jackpot, 0);

        // 6. Test /api/races/previous-results API contract
        const prevRes = await testRoute('GET', '/api/races/previous-results');
        assert.equal(prevRes.statusCode, 200);
        assert.equal(prevRes.body.success, true);
        assert.ok(Array.isArray(prevRes.body.results), 'results must be an array');
        assert.ok(Array.isArray(prevRes.body.data), 'data must be an array');

        // 7. Verify items have rich jackpot & winner properties
        if (prevRes.body.results.length > 0) {
            const item = prevRes.body.results[0];
            assert.ok('jackpot' in item, 'item must have jackpot');
            assert.ok('jackpotMultiplier' in item, 'item must have jackpotMultiplier');
            assert.ok('isJackpot' in item, 'item must have isJackpot');
            assert.ok('winnerHorseSerial' in item, 'item must have winnerHorseSerial');
            assert.ok('winnerHorseName' in item, 'item must have winnerHorseName');
            assert.ok('games_no' in item, 'item must have games_no alias');
        }

        console.log('✅ ALL HORSE RACING JACKPOT AND RESULTS ASSERTIONS PASSED!');
        raceEngine.stop();
        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed with error:', err);
        raceEngine.stop();
        process.exit(1);
    }
});
