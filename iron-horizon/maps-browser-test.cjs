// Optional integration check: Playwright, installed Chrome and local server on port 4177.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'iron-maps-'));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const state = () => page.evaluate(() => window.ironHorizon.getState());
    await page.goto('http://127.0.0.1:4177/iron-horizon/?v=0.5');
    await page.waitForFunction(() => !!window.ironHorizon);
    assert.equal((await state()).map, 'border');
    await page.locator('#mapSelect').selectOption('quarry');
    await page.waitForFunction(() => window.ironHorizon.getState().map === 'quarry');
    assert.deepEqual((await state()).position, { x: 24, z: 100 });
    assert.equal(await page.locator('#mapCaption').textContent(), 'STEINBRUCH / 02');
    await page.screenshot({ path: path.join(output, 'quarry-garage.png') });
    // Map changes release old geometry rather than accumulating terrain meshes.
    await page.waitForTimeout(500);
    const geometries = (await state()).renderedGeometries;
    for (let i = 0; i < 3; i++) {
      await page.locator('#mapSelect').selectOption('border');
      await page.waitForTimeout(200);
      await page.locator('#mapSelect').selectOption('quarry');
      await page.waitForTimeout(200);
    }
    assert.equal((await state()).renderedGeometries, geometries);
    await page.reload(); await page.waitForFunction(() => !!window.ironHorizon);
    assert.equal((await state()).map, 'quarry', 'Map choice persists');
    await page.setViewportSize({ width: 960, height: 640 });
    await page.screenshot({ path: path.join(output, 'quarry-laptop.png') });
    for (const id of ['mapSelect', 'startButton', 'trainingButton']) {
      const bounds = await page.locator(`#${id}`).boundingBox();
      assert.ok(bounds.y >= 80 && bounds.y + bounds.height < 620, `${id} stays accessible on a laptop`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#trainingButton').click();
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
    assert.deepEqual((await state()).targets.map(t => [t.x, t.z]), [[24,66],[-6,60],[54,20],[66,-8],[-6,-42]]);
    await page.locator('#world').dispatchEvent('mousemove', { movementX: 0, movementY: -28 });
    await page.waitForTimeout(1200);
    await page.locator('#world').dispatchEvent('mousedown', { button: 0 });
    await page.waitForFunction(() => window.ironHorizon.getState().hitCount === 1, null, { timeout: 15000 });
    await page.screenshot({ path: path.join(output, 'quarry-training.png') });
    await page.evaluate(() => document.exitPointerLock());
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'paused');
    await page.locator('#resumeButton').click();
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
    await page.evaluate(() => document.exitPointerLock());
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'paused');
    await page.locator('#garageButton').click();
    assert.equal((await state()).career.xp, 0);
    await page.locator('#startButton').click();
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
    assert.deepEqual((await state()).capture, { x: 24, z: -4, radius: 17 });
    await page.waitForFunction(() => {
      const s = window.ironHorizon.getState();
      return ['blue', 'red'].every(team => s.targets.some(t => t.alive && t.team === team && Math.hypot(t.x - s.capture.x, t.z - s.capture.z) < s.capture.radius));
    }, null, { timeout: 90000 });
    console.log('Both teams reached quarry objective:', JSON.stringify(await state()));
    assert.ok((await state()).targets.some(t => t.hp < 100), 'Bots engage each other on the new map');
    await page.screenshot({ path: path.join(output, 'quarry-battle.png') });
    await page.evaluate(() => document.exitPointerLock());
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'paused');
    await page.locator('#garageButton').click();
    await page.locator('#mapSelect').selectOption('border');
    await page.locator('#trainingButton').click();
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
    assert.deepEqual((await state()).position, { x: 0, z: 65 });
    assert.deepEqual((await state()).targets.map(t => [t.x, t.z]), [[0,3],[-25,21],[28,-29],[-52,-48],[62,43]]);
    assert.equal((await state()).career.xp, 0, 'Map switching and abandonment award no XP');
    assert.deepEqual(errors, []);
    console.log('PASS: map selection, persistence, geometry disposal, laptop UI, training hit, pause/resume, bot routes, map reset. Screenshots:', output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
