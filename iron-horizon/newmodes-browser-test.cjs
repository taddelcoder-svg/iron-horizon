// Optional integration check for the 1.3 modes: Playwright, installed Chrome and local server on port 4177.
// Eroberung: three points, HUD and result. Letztes Gefecht: rounds, no respawn, spectator camera, result.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'iron-horizon-newmodes-'));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.IH_URL || 'http://127.0.0.1:4177/iron-horizon/'); await page.waitForFunction(() => !!window.ironHorizon);
    const state = () => page.evaluate(() => window.ironHorizon.getState());
    const start = async (map, mission) => {
      await page.locator('#mapSelect').selectOption(map); await page.locator('#missionSelect').selectOption(mission);
      await page.locator('#startButton').click(); await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing', null, { timeout: 5000 });
    };
    const toEnd = () => page.evaluate(() => { let s; for (let i = 0; i < 1200; i++) { s = window.ironHorizon.sim(1); if (s.mode !== 'playing') break; } return s; });
    // Eroberung on the Grenzposten: each team starts with its home point.
    await page.locator('#mapSelect').selectOption('border'); await page.locator('#missionSelect').selectOption('conquest');
    assert.match(await page.locator('#missionTitle').textContent(), /Eroberung/); assert.match(await page.locator('#missionText').textContent(), /Heimatpunkt/);
    await start('border', 'conquest');
    let s = await state(); assert.equal(s.match.mode, 'conquest'); assert.deepEqual(s.match.points.map(p => p.owner), [null, 'blue', 'red']);
    assert.match(await page.locator('#matchLabel').textContent(), /EROBERUNG/); assert.match(await page.locator('#score').textContent(), /PUNKTE 1 : 1/);
    assert.equal(await page.locator('#objectiveTitle').textContent(), 'Halte mehr Punkte als der Gegner');
    s = await page.evaluate(() => window.ironHorizon.sim(40));
    assert.ok(s.targets.some(t => t.kind), 'bots have objectives'); assert.ok(s.match.points[0].owner || s.match.points[0].contested || s.match.points[0].progress, 'the fight for A has begun');
    await page.screenshot({ path: path.join(output, 'conquest.png') });
    s = await toEnd(); assert.equal(s.mode, 'result', 'Eroberung ends');
    assert.match(await page.locator('#resultReason').textContent(), /Blau \d+ : \d+ Rot/);
    await page.locator('#menuButton').click(); await page.waitForFunction(() => window.ironHorizon.getState().mode === 'menu');
    // Letztes Gefecht in the Flusstal.
    await start('valley', 'laststand');
    s = await state(); assert.equal(s.match.mode, 'laststand'); assert.equal(s.match.round, 1); assert.deepEqual(s.match.tickets, { blue: 3, red: 3 });
    assert.match(await page.locator('#matchLabel').textContent(), /LETZTES GEFECHT/); assert.match(await page.locator('#score').textContent(), /RUNDE 1 · 0 : 0/);
    assert.match(await page.locator('#respawn b').textContent(), /Kein Wiedereinstieg/);
    // Stand still at the spawn: the bots decide the rounds; once the own tank is out it stays out for the round.
    let sawDead = false, sawRound2 = false;
    for (let i = 0; i < 700 && !(await state()).match.result; i++) {
      s = await page.evaluate(() => window.ironHorizon.sim(.5));
      if (!s.alive && !sawDead && s.mode === 'playing') {
        sawDead = true; assert.equal(s.respawn, Infinity, 'no respawn timer');
        await page.screenshot({ path: path.join(output, 'laststand-spectator.png') });
        assert.equal(await page.locator('#respawn').isHidden(), false);
      }
      if (s.match.round >= 2 && !sawRound2) { sawRound2 = true; assert.equal(s.alive, true, 'a new round brings the own tank back'); }
    }
    s = await state(); assert.equal(s.mode, 'result'); assert.ok(sawRound2, 'at least two rounds');
    assert.ok(s.match.wins.blue >= 2 || s.match.wins.red >= 2 || s.match.round === 3);
    assert.match(await page.locator('#resultReason').textContent(), /Runden Blau \d : \d Rot/);
    await page.screenshot({ path: path.join(output, 'laststand-result.png') });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', checks: ['Eroberung start state', 'Eroberung HUD', 'Eroberung result', 'Letztes Gefecht HUD', sawDead ? 'no respawn + spectator' : 'player survived (spectator not seen)', 'rounds', 'Letztes Gefecht result'], screenshots: output }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
