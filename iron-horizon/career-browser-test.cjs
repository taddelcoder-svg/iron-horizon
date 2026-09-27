const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'iron-horizon-career-')); console.log('Screenshots:', output);
    const state = () => page.evaluate(() => window.ironHorizon.getState());
    // Short matches in the test browser only. Production rules stay at seven minutes.
    await page.route('**/battle.js', async route => { const response = await route.fetch(); await route.fulfill({ response, body: await response.text() + '\n{ const Match = window.IronBattle.Match; window.IronBattle.Match = class extends Match { constructor() { super(); this.time = .5; } }; }' }); });
    await page.goto('http://127.0.0.1:4177/iron-horizon/'); await page.waitForFunction(() => !!window.ironHorizon);
    await page.locator('#careerButton').click(); assert.equal(await page.locator('#careerPaints [data-paint="sand"]').isEnabled(), false);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#careerPanel').isVisible(), false);
    await page.locator('#startButton').click();
    await page.waitForFunction(() => window.ironHorizon.getState().career.matches === 1);
    assert.equal((await state()).career.xp, 200); assert.match(await page.locator('#saveStatus').textContent(), /gespeichert/);
    for (let i = 2; i <= 3; i++) { await page.locator('#rematchButton').click(); await page.waitForFunction(n => window.ironHorizon.getState().career.matches === n, i); }
    assert.equal((await state()).career.xp, 600); assert.match(await page.locator('#unlockNotice').textContent(), /Wüstensand/);
    await page.screenshot({ path: path.join(output, 'reward.png') });
    await page.locator('#menuButton').click(); await page.locator('#careerButton').click();
    await page.locator('#careerPaints [data-paint="sand"]').click(); await page.waitForFunction(() => window.ironHorizon.getState().career.paint === 'sand');
    await page.screenshot({ path: path.join(output, 'profile.png') });
    const download = page.waitForEvent('download'); await page.locator('#exportSave').click(); const file = await download; await file.saveAs(path.join(output, 'save.json'));
    const saved = JSON.parse(fs.readFileSync(path.join(output, 'save.json'), 'utf8')); assert.equal(saved.xp, 600); assert.equal(saved.paints.luchs, 'sand');
    await page.keyboard.press('Escape'); await page.reload(); await page.waitForFunction(() => !!window.ironHorizon);
    assert.equal((await state()).career.xp, 600); assert.equal((await state()).career.paint, 'sand');
    await page.waitForTimeout(700); await page.screenshot({ path: path.join(output, 'sand-garage.png') });
    await page.locator('#selectKeiler').click(); assert.equal((await state()).career.paint, 'olive'); await page.locator('#selectLuchs').click();
    await page.locator('#careerButton').click();
    await page.locator('#saveFile').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
    await page.waitForFunction(() => document.getElementById('careerStatus').textContent.includes('gültigen')); assert.equal((await state()).career.xp, 600);
    const imported = { ...saved, xp: 2500, bestXp: 600, paints: { luchs: 'winter', keiler: 'forest' } };
    await page.locator('#saveFile').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
    await page.locator('#importPreview').waitFor({ state: 'visible' }); assert.equal((await state()).career.xp, 600, 'Choosing a file must not overwrite the save');
    await page.locator('#cancelImport').click(); assert.equal((await state()).career.xp, 600);
    await page.locator('#saveFile').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
    await page.locator('#importPreview').waitFor({ state: 'visible' }); await page.locator('#confirmImport').click();
    await page.waitForFunction(() => window.ironHorizon.getState().career.xp === 2500); assert.equal((await state()).career.paint, 'winter');
    await page.keyboard.press('Escape'); await page.waitForTimeout(700); await page.screenshot({ path: path.join(output, 'winter-garage.png') });
    await page.setViewportSize({ width: 960, height: 640 }); await page.locator('#careerButton').click();
    await page.screenshot({ path: path.join(output, 'compact-profile.png') }); assert.equal(await page.locator('#closeCareer').isVisible(), true);
    await page.keyboard.press('Escape'); await page.locator('#trainingButton').click(); await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
    await page.keyboard.press('Escape'); await page.locator('#garageButton').click(); assert.equal((await state()).career.xp, 2500, 'Training and abandonment give no round reward');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', checks: ['round reward', 'persistence', 'rank/paint unlock', 'separate vehicle paints', 'export', 'invalid import', 'import preview/cancel/confirm', 'training without XP', 'compact profile'], screenshots: output }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
