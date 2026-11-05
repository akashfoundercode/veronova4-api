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

        // 6. Test 5X Multiplier explicitly
        const res5X = await raceEngine.setForcedJackpot({
            multiplier: '5X',
            reason: 'Admin test forced 5X',
        });
        assert.equal(res5X.success, true);
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 5, 'Jackpot should be 5X');
        assert.equal(raceEngine.currentRace.is_jackpot, 1);

        // 7. Test Continuous RANDOM mode (2X, 3X, 4X, 5X for every next round)
        const resRandom = await raceEngine.configureContinuousJackpot({
            enabled: true,
            mode: 'RANDOM',
            multiplier: 'RANDOM',
        });
        assert.equal(resRandom.success, true);
        assert.equal(resRandom.isRandom, true);
        assert.ok([2, 3, 4, 5].includes(raceEngine.currentRace.jackpot_multiplier), 'Current round multiplier must be in [2, 3, 4, 5]');

        // Next round 1 in random continuous mode
        await raceEngine.startInMemoryRaceCycle();
        const randRound1Mult = raceEngine.currentRace.jackpot_multiplier;
        assert.ok([2, 3, 4, 5].includes(randRound1Mult), 'Next round 1 must pick from [2, 3, 4, 5]');
        assert.equal(raceEngine.currentRace.is_jackpot, 1);

        // Next round 2 in random continuous mode
        await raceEngine.startInMemoryRaceCycle();
        const randRound2Mult = raceEngine.currentRace.jackpot_multiplier;
        assert.ok([2, 3, 4, 5].includes(randRound2Mult), 'Next round 2 must pick from [2, 3, 4, 5]');
        assert.equal(raceEngine.currentRace.is_jackpot, 1);

        // 8. Test explicit Sequential Multipliers: 2X, 3X, 4X, 5X while previously in RANDOM mode
        // 8a. Test 2X forcing (overriding random)
        const res2X = await raceEngine.setForcedJackpot({
            multiplier: '2X',
            reason: 'Admin test forced 2X',
        });
        assert.equal(res2X.success, true);
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 2, 'Jackpot must be strictly 2X');
        assert.equal(raceEngine.currentRace.is_jackpot, 1);
        await raceEngine.startInMemoryRaceCycle();
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 2, 'Next round must stay strictly 2X');

        // 8b. Test 3X forcing
        const res3X = await raceEngine.setForcedJackpot({
            multiplier: 3,
            reason: 'Admin test forced 3X numeric',
        });
        assert.equal(res3X.success, true);
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 3, 'Jackpot must be strictly 3X');
        await raceEngine.startInMemoryRaceCycle();
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 3, 'Next round must stay strictly 3X');

        // 8c. Test 4X forcing
        const res4X = await raceEngine.setForcedJackpot({
            multiplier: '4X',
            reason: 'Admin test forced 4X',
        });
        assert.equal(res4X.success, true);
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 4, 'Jackpot must be strictly 4X');
        await raceEngine.startInMemoryRaceCycle();
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 4, 'Next round must stay strictly 4X');

        // 8d. Test 5X forcing
        const res5XExplicit = await raceEngine.setForcedJackpot({
            multiplier: '5X',
            reason: 'Admin test forced 5X string',
        });
        assert.equal(res5XExplicit.success, true);
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 5, 'Jackpot must be strictly 5X');
        await raceEngine.startInMemoryRaceCycle();
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 5, 'Next round must stay strictly 5X');

        // 8e. Test currentState payload aliases for 2X and 3X
        await raceEngine.setForcedJackpot({ multiplier: '2X', reason: 'Admin 2X test' });
        const state2X = raceEngine.getCurrentState();
        assert.equal(state2X.jackpotMultiplier, 2);
        assert.equal(state2X.multiplier, 2);
        assert.equal(state2X.isJackpot, true);
        assert.equal(state2X.jackpot.multiplier, 2);
        assert.equal(state2X.jackpot.slotIndex, 1); // 2X is slot index 1

        await raceEngine.setForcedJackpot({ multiplier: 3, reason: 'Admin 3X test' });
        const state3X = raceEngine.getCurrentState();
        assert.equal(state3X.jackpotMultiplier, 3);
        assert.equal(state3X.multiplier, 3);
        assert.equal(state3X.isJackpot, true);
        assert.equal(state3X.jackpot.multiplier, 3);
        assert.equal(state3X.jackpot.slotIndex, 2); // 3X is slot index 2

        // Turn OFF after tests
        await raceEngine.configureContinuousJackpot({ multiplier: 'OFF' });
        assert.equal(raceEngine.currentRace.jackpot_multiplier, 1);

        // 9. Test /api/races/previous-results API contract
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
