const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    for (const failure of ['reject', 'missing', 'timeout', 'event']) {
      await page.goto('http://127.0.0.1:4177/iron-horizon/');
      await page.waitForFunction(() => !!window.ironHorizon);
      await page.evaluate(failure => {
        const canvas = document.getElementById('world');
        canvas.requestPointerLock = failure === 'missing' ? undefined : failure === 'timeout' ? () => new Promise(() => {}) : failure === 'event' ? () => { setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')), 40); } : () => Promise.reject(new Error('Host denied pointer lock'));
      }, failure);
      await page.locator('#trainingButton').click();
      await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
      assert.equal((await page.evaluate(() => window.ironHorizon.getState())).pointerLocked, false);
      assert.equal(await page.locator('#pause').isVisible(), false);
      assert.equal(await page.locator('#world').evaluate(el => getComputedStyle(el).cursor), 'none');
      await page.keyboard.down('KeyW'); await page.waitForTimeout(450); await page.keyboard.up('KeyW');
      assert.ok((await page.evaluate(() => window.ironHorizon.getState())).position.z < 65);
      const yaw = (await page.evaluate(() => window.ironHorizon.getState())).viewYaw;
      await page.locator('#world').dispatchEvent('mousemove', { movementX: 20, movementY: 0, clientX: 1090, clientY: 350 });
      await page.waitForTimeout(220);
      assert.ok((await page.evaluate(() => window.ironHorizon.getState())).viewYaw < yaw - .1, 'Fallback edge turning must work');
      await page.locator('#world').dispatchEvent('mousedown', { button: 0 });
      assert.ok((await page.evaluate(() => window.ironHorizon.getState())).reload > 0);
      for (let resume = 0; resume < 2; resume++) {
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.ironHorizon.getState().mode === 'paused');
        assert.notEqual(await page.locator('#world').evaluate(el => getComputedStyle(el).cursor), 'none');
        await page.locator('#resumeButton').click();
        await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
        assert.equal(await page.locator('#pause').isVisible(), false);
      }
      console.log(`PASS: ${failure} → preview play, aiming, shooting, pause and two resumes`);
    }
    await page.goto('http://127.0.0.1:4177/iron-horizon/'); await page.locator('#trainingButton').click();
    await page.waitForFunction(() => window.ironHorizon.getState().pointerLocked && window.ironHorizon.getState().mode === 'playing');
    await page.evaluate(() => document.exitPointerLock());
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'paused');
    await page.locator('#resumeButton').click();
    await page.waitForFunction(() => window.ironHorizon.getState().mode === 'playing');
    assert.equal((await page.evaluate(() => window.ironHorizon.getState())).pointerLocked, true);
    assert.deepEqual(errors, []); console.log('PASS: native pointer lock and resume preserved; no browser errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
