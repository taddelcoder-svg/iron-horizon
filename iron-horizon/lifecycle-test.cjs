const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4177/iron-horizon/');
    await page.locator('#startButton').click();
    await page.waitForFunction(() => window.ironHorizon?.getState().mode === 'playing');
    await page.keyboard.down('KeyW'); await page.waitForTimeout(6200); await page.keyboard.up('KeyW');
    await page.keyboard.down('Space'); await page.waitForTimeout(450); await page.keyboard.up('Space');
    await page.waitForFunction(() => window.ironHorizon.getState().stats.deaths > 0, null, { timeout: 60000 });
    const dead = await page.evaluate(() => window.ironHorizon.getState());
    assert.equal(dead.alive, false); assert.equal(dead.hp, 0);
    await page.waitForFunction(() => window.ironHorizon.getState().alive, null, { timeout: 15000 });
    const respawned = await page.evaluate(() => window.ironHorizon.getState());
    assert.equal(respawned.hp, 100); assert.ok(respawned.position.z > 80); assert.equal(respawned.pointerLocked, true);
    assert.equal(respawned.systems.tracks, 100); assert.equal(respawned.systems.engine, 100); assert.equal(respawned.systems.smokeCharges, 2);
    console.log('Player destroyed and respawned:', respawned.stats);
    // Shorten only the test browser's match clock to exercise terminal UI without a seven-minute wait.
    await page.route('**/battle.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: await response.text() + '\n{ const Base = window.IronBattle.Match; window.IronBattle.Match = class extends Base { constructor() { super(); this.time = 1; } }; }' });
    });
    await page.reload(); await page.locator('#startButton').click();
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'result');
    assert.equal((await page.evaluate(() => window.ironHorizon.getState())).match.result, 'draw');
    await page.waitForFunction(() => !document.pointerLockElement);
    assert.equal(await page.locator('#result').isVisible(), true);
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'iron-horizon-lifecycle-'));
    await page.screenshot({ path: path.join(output, 'result.png') });
    await page.locator('#rematchButton').click();
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
    const rematch = await page.evaluate(() => window.ironHorizon.getState());
    assert.equal(rematch.stats.deaths, 0); assert.equal(rematch.match.result, null); assert.equal(rematch.hp, 100);
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'result');
    await page.locator('#menuButton').click();
    assert.equal((await page.evaluate(() => window.ironHorizon.getState())).mode, 'menu');
    assert.equal(await page.locator('#menu').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', checks: ['player death from actual bot fire', 'six-second respawn', 'health restored', 'round result', 'pointer unlock at result', 'rematch reset', 'garage return'], screenshots: output }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
