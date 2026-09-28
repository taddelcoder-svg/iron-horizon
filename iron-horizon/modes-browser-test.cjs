// Optional integration check for the 1.0 content: Playwright, installed Chrome and local server on port 4177.
// Dachs lock and traverse, Flusstal relief, Durchbruch from start to result, awards and paints in the profile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'iron-horizon-modes-'));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto('http://127.0.0.1:4177/iron-horizon/'); await page.waitForFunction(() => !!window.ironHorizon);
    const state = () => page.evaluate(() => window.ironHorizon.getState());
    const sim = seconds => page.evaluate(s => window.ironHorizon.sim(s), seconds);
    // Dachs: locked for battles at rank Rekrut, free in training.
    await page.locator('#selectDachs').click();
    assert.equal(await page.locator('#startButton').isDisabled(), true); assert.match(await page.locator('#startButton').textContent(), /FRONTKÄMPFER/);
    await page.locator('#mapSelect').selectOption('valley');
    await page.locator('#trainingButton').click(); await page.waitForFunction(() => ['playing', 'locking'].includes(window.ironHorizon.getState().mode));
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing', null, { timeout: 5000 });
    let s = await state(); assert.equal(s.vehicle, 'dachs'); assert.equal(s.map, 'valley');
    // The target sits far outside the ±12° arc: the hull must swing round while the gun stays inside its arc.
    const hull = s.hullYaw;
    await page.locator('#world').dispatchEvent('mousemove', { movementX: -600, movementY: 0 });
    s = await sim(3);
    assert.ok(Math.abs(s.hullYaw - hull) > .5, 'Dachs hull turns towards the aim');
    assert.ok(Math.abs(Math.atan2(Math.sin(s.turretYaw - s.hullYaw), Math.cos(s.turretYaw - s.hullYaw))) <= 12 * Math.PI / 180 + 1e-6, 'gun stays within its arc');
    // Flusstal: driving west into the riverbed goes downhill and tilts the hull.
    await page.keyboard.down('KeyW'); s = await sim(6); await page.keyboard.up('KeyW');
    await page.screenshot({ path: path.join(output, 'valley-dachs.png') });
    const tilted = await page.evaluate(() => { let most = 0; for (let i = 0; i < 40; i++) { const s = window.ironHorizon.sim(.25); most = Math.max(most, Math.abs(s.tilt.pitch) + Math.abs(s.tilt.roll)); } return most; });
    assert.ok(s.ground !== 0 || tilted > 0, 'relief under the tank');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => window.ironHorizon.getState().mode === 'paused');
    await page.locator('#garageButton').click();
    // Durchbruch · Angriff with the Luchs on the Steinbruch.
    await page.locator('#selectLuchs').click(); await page.locator('#mapSelect').selectOption('quarry'); await page.locator('#missionSelect').selectOption('attack');
    await page.locator('#difficultySelect').selectOption('recruit'); assert.match(await page.locator('#difficultyNote').textContent(), /Verbündeten kämpfen immer wie Veteranen/);
    assert.match(await page.locator('#missionTitle').textContent(), /angreifen/);
    await page.locator('#startButton').click(); await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing', null, { timeout: 5000 });
    s = await state(); assert.equal(s.match.mode, 'breakthrough'); assert.equal(s.match.attacker, 'blue'); assert.equal(s.mission, 'attack');
    assert.deepEqual(s.skills, { blue: 'veteran', red: 'recruit' }, 'Gegnerstärke only sets the enemies');
    // Automatic graphics: a steady 60 fps changes nothing, a stuck 20 fps steps down one level with a notice.
    assert.equal(s.quality, 'high'); assert.equal(await page.evaluate(() => window.ironHorizon.sampleFrames(60, 5)), 'high');
    assert.equal(await page.evaluate(() => window.ironHorizon.sampleFrames(20, 5)), 'medium'); assert.match(await page.locator('#notice').textContent(), /GRAFIK AUTOMATISCH AUF MITTEL/);
    assert.equal(await page.locator('#quality').inputValue(), 'medium');
    assert.equal(await page.locator('#redTickets').textContent(), '∞'); assert.equal(await page.locator('#blueTickets').textContent(), '110');
    assert.equal(await page.locator('#objectiveTitle').textContent(), 'Erobere Punkt A'); assert.match(await page.locator('#matchLabel').textContent(), /DURCHBRUCH/);
    await page.screenshot({ path: path.join(output, 'breakthrough-start.png') });
    s = await page.evaluate(() => { let s; for (let i = 0; i < 1200; i++) { s = window.ironHorizon.sim(1); if (s.mode !== 'playing') break; } return s; });
    assert.equal(s.mode, 'result', 'Durchbruch ends');
    assert.match(await page.locator('#resultTitle').textContent(), /Durchbruch geschafft|Angriff gescheitert/);
    assert.match(await page.locator('#resultReason').textContent(), /von 2 Punkten erobert/);
    await page.waitForFunction(() => /EP/.test(document.getElementById('earnedXp').textContent));
    await page.screenshot({ path: path.join(output, 'breakthrough-result.png') });
    // Profile: eight awards and six paints.
    await page.locator('#menuButton').click(); await page.locator('#careerButton').click();
    assert.equal(await page.locator('#careerAwards li').count(), 8); assert.equal(await page.locator('#careerPaints button').count(), 6);
    assert.match(await page.locator('#careerPaints button[data-paint="lions"]').getAttribute('title'), /Ass-Sieg/);
    await page.screenshot({ path: path.join(output, 'profile.png') });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', checks: ['Dachs battle lock', 'Dachs training', 'hull follows aim', 'gun arc', 'valley relief', 'enemy-only difficulty', 'automatic graphics', 'Durchbruch HUD', 'Durchbruch result', 'awards', 'paints'], screenshots: output }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
