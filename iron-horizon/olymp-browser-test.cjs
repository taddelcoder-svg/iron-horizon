// Optional integration check for the Olympiade discipline: two players with signed tickets meet in one
// online battle. Needs Playwright, installed Chrome and a running local server WITHOUT ZUGANG_PASSWORT
// (local ticket key); address via IH_URL (default http://127.0.0.1:4177).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const olymp = require('../olymp.js');
const base = (process.env.IH_URL || 'http://127.0.0.1:4177').replace(/\/$/, '');
(async () => {
  const tool = olymp.werkzeug(), lauf = 'test' + Date.now().toString(36);
  const ticket = (s, n) => tool.ausstellen({ sp: 'ironhorizon', o: 'TEST', l: lauf, g: 0, s, n, m: [{ s: 'a', n: 'Anna' }, { s: 'b', n: 'Ben' }], c: { karte: 'valley', bots: 'recruit' },
    u: 'http://127.0.0.1:9', z: 'http://127.0.0.1:9/?code=TEST', ti: 'Olympiade TEST', nr: 2, von: 4, bis: Date.now() + 3600e3 });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const errors = [];
    const open = async (s, n) => {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
      page.on('pageerror', error => errors.push(`${n}: ${error.message}`));
      await page.goto(`${base}/iron-horizon/?olymp=${ticket(s, n)}`); await page.waitForFunction(() => !!window.ironHorizon);
      return page;
    };
    const anna = await open('a', 'Anna');
    // The lobby opens by itself, the name comes from the ticket, the settings are fixed.
    await anna.waitForFunction(() => !document.getElementById('lobby').hidden && document.querySelectorAll('#olympExpected li').length === 2);
    assert.equal(await anna.locator('#lobbyName').inputValue(), 'Anna');
    assert.match(await anna.locator('#olympExpected').textContent(), /✓ Anna.*… Ben/);
    assert.equal(await anna.locator('#roomMap').inputValue(), 'valley'); assert.equal(await anna.locator('#roomMap').isDisabled(), true);
    await anna.locator('#lobbyVehicles [data-vehicle="dachs"]').click();
    const ben = await open('b', 'Ben');
    await ben.waitForFunction(() => /startet in \d+ Sekunden/.test(document.getElementById('lobbyHint').textContent));
    for (const page of [anna, ben]) await page.waitForFunction(() => window.ironHorizon.getState().online, null, { timeout: 15000 });
    const a = await anna.evaluate(() => window.ironHorizon.getState()), b = await ben.evaluate(() => window.ironHorizon.getState());
    assert.equal(a.map, 'valley'); assert.equal(a.vehicle, 'dachs', 'free choice includes the Dachs in the Olympiade');
    assert.notEqual(a.team, b.team, 'the group is split into both teams'); assert.equal(b.difficulty, 'recruit');
    // The host drops out: the guest's attempt still counts and is reported.
    await anna.close();
    await ben.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 8000 });
    assert.match(await ben.locator('#resultTitle').textContent(), /abgebrochen/);
    await ben.waitForFunction(() => /Punkte|gewertet/.test(document.querySelector('.olymp-result')?.textContent || ''), null, { timeout: 8000 });
    assert.match(await ben.locator('#rematchButton').textContent(), /OLYMPIADE/);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', checks: ['lobby opens with ticket name', 'fixed settings', 'auto start when all are here', 'teams split', 'free tank choice', 'host drop still reports'] }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
