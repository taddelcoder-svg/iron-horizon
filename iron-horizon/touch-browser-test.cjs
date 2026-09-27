// Optional integration check: Playwright, installed Chrome and local server on port 4177.
// Emulates a phone in landscape and drives the touch layer with synthetic pointer events.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'iron-horizon-touch-'));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto('http://127.0.0.1:4177/iron-horizon/'); await page.waitForFunction(() => !!window.ironHorizon);
    const state = () => page.evaluate(() => window.ironHorizon.getState());
    assert.equal((await state()).touchMode, true, 'Coarse pointer devices start in touch mode');
    assert.equal((await state()).quality, 'medium', 'Touch devices default to medium graphics');
    const start = await page.locator('#startButton').boundingBox();
    assert.ok(start && start.y + start.height <= 390, 'Start button visible without scrolling on a landscape phone');
    await page.screenshot({ path: path.join(output, 'garage.png') });
    await page.locator('#startButton').tap();
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
    assert.equal((await state()).pointerLocked, false, 'Touch play does not request pointer lock');
    assert.equal(await page.locator('#touch').isVisible(), true); assert.equal(await page.locator('#tutorial').isVisible(), true, 'First start shows the briefing');
    await page.locator('#closeTutorial').tap(); assert.equal(await page.locator('#tutorial').isVisible(), false);
    const touch = (type, id, x, y) => page.evaluate(([type, id, x, y]) => document.getElementById('touch').dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true })), [type, id, x, y]);
    const center = async selector => { const box = await page.locator(selector).boundingBox(); return [box.x + box.width / 2, box.y + box.height / 2]; };
    // Drive: thumb down on the left, push up.
    await touch('pointerdown', 1, 90, 300); await touch('pointermove', 1, 90, 240);
    await page.evaluate(() => window.ironHorizon.sim(2));
    const driving = await state(); assert.ok(driving.speed > 5 && driving.position.z < 78, 'Stick drives forward');
    await touch('pointermove', 1, 40, 240); const yaw = driving.hullYaw; await page.evaluate(() => window.ironHorizon.sim(.5));
    assert.ok((await state()).hullYaw > yaw, 'Stick left steers left');
    await touch('pointerup', 1, 40, 240);
    // Aim: drag on the right half.
    const view = (await state()).viewYaw; await touch('pointerdown', 2, 600, 150); await touch('pointermove', 2, 540, 150); await touch('pointerup', 2, 540, 150);
    assert.ok((await state()).viewYaw > view, 'Dragging left turns the view left');
    // Buttons.
    const [fx, fy] = await center('#touchFire'); await touch('pointerdown', 3, fx, fy); await touch('pointerup', 3, fx, fy);
    assert.ok((await state()).reload > 0, 'FEUER fires');
    const [zx, zy] = await center('#touchZoom'); await touch('pointerdown', 4, zx, zy); await touch('pointerup', 4, zx, zy);
    await page.evaluate(() => window.ironHorizon.sim(.1)); assert.equal(await page.locator('#touchZoom.on').count(), 1, 'ZOOM toggles');
    const [sx, sy] = await center('.t-smoke'); await touch('pointerdown', 5, sx, sy); await touch('pointerup', 5, sx, sy);
    assert.equal((await state()).systems.smokeCharges, 1, 'RAUCH uses a charge');
    await page.screenshot({ path: path.join(output, 'battle.png') });
    // Pause button stays reachable above the touch layer.
    await page.locator('#pauseButton').tap(); assert.equal((await state()).mode, 'paused');
    await page.locator('#resumeButton').tap(); await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
    await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.locator('.rotate-hint').isVisible(), true, 'Portrait shows the rotate hint');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', checks: ['touch detection', 'medium graphics default', 'compact garage', 'no pointer lock', 'briefing', 'analog drive', 'steering', 'drag aim', 'fire', 'zoom', 'smoke', 'pause/resume', 'portrait hint'], screenshots: output }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
