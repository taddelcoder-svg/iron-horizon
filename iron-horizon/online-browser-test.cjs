// Optional integration check for online battles: Playwright, installed Chrome and a running server
// (default http://127.0.0.1:4177, override with IH_URL). Two browsers: host (blue) and guest (red).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = (process.env.IH_URL || 'http://127.0.0.1:4177').replace(/\/$/, '');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const errors = [];
    const open = async (name, query = '') => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await context.addInitScript(n => { try { localStorage.setItem('iron-horizon-online-name', n); localStorage.setItem('iron-horizon-settings', JSON.stringify({ intro: true })); } catch (_) {} }, name);
      const page = await context.newPage(); page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
      await page.goto(`${base}/iron-horizon/${query}`); await page.waitForFunction(() => !!window.ironHorizon);
      return page;
    };
    const state = page => page.evaluate(() => window.ironHorizon.getState());
    const host = await open('Anna');
    await host.locator('#onlineButton').click(); await host.locator('#createRoom').click();
    await host.waitForFunction(() => /^[A-Z]{4}$/.test(document.getElementById('roomCodeLabel').textContent));
    const code = await host.locator('#roomCodeLabel').textContent();
    // The guest follows the invite link and joins automatically with its stored name.
    const guest = await open('Ben', `?raum=${code}`);
    await guest.waitForFunction(() => document.querySelectorAll('#teamRed li:not(.bot)').length === 1);
    await host.waitForFunction(() => document.querySelectorAll('#teamRed li:not(.bot)').length === 1);
    assert.match(await host.locator('#teamRed').textContent(), /Ben · Luchs/);
    assert.equal(await guest.locator('#startOnline').isHidden(), true, 'only the host starts');
    await guest.locator('#lobbyVehicles [data-vehicle="keiler"]').click();
    await host.waitForFunction(() => /Ben · Keiler/.test(document.getElementById('teamRed').textContent));
    await host.locator('#roomMap').selectOption('quarry');
    await guest.waitForFunction(() => document.getElementById('roomMap').value === 'quarry');
    await host.locator('#startOnline').click();
    for (const page of [host, guest]) await page.waitForFunction(() => ['playing', 'locking', 'paused'].includes(window.ironHorizon.getState().mode) && window.ironHorizon.getState().online);
    let h = await state(host), g = await state(guest);
    assert.deepEqual(h.online, { host: true, slot: 0, team: 'blue' }); assert.deepEqual(g.online, { host: false, slot: 5, team: 'red' });
    assert.equal(h.map, 'quarry'); assert.equal(g.map, 'quarry'); assert.equal(g.vehicle, 'keiler');
    const benOnHost = h.targets.find(t => t.slot === 5); assert.ok(benOnHost.remote); assert.equal(benOnHost.callsign, 'BEN'); assert.equal(benOnHost.vehicle, 'keiler');
    // The guest drives forward; the host must see Ben's tank move, the guest must see the host's bots move.
    const guestStart = g.position, botStart = g.targets.find(t => t.slot === 1);
    await guest.keyboard.down('KeyW'); await wait(2500); await guest.keyboard.up('KeyW');
    g = await state(guest); h = await state(host);
    assert.ok(Math.hypot(g.position.x - guestStart.x, g.position.z - guestStart.z) > 5, 'guest drives');
    const benNow = h.targets.find(t => t.slot === 5);
    assert.ok(Math.hypot(benNow.x - g.position.x, benNow.z - g.position.z) < 4, `host sees the guest where it is (${benNow.x},${benNow.z} vs ${g.position.x},${g.position.z})`);
    const botNow = g.targets.find(t => t.slot === 1);
    assert.ok(Math.hypot(botNow.x - botStart.x, botNow.z - botStart.z) > 3, 'guest sees the host bots move');
    assert.ok(Math.abs(g.match.time - h.match.time) < 2, 'match clock in sync');
    await host.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'iron-online-host.png') });
    await guest.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'iron-online-guest.png') });
    // The guest fires: the host must spawn the shell.
    await guest.waitForFunction(() => window.ironHorizon.getState().reload === 0);
    await guest.mouse.click(640, 400);
    await guest.waitForFunction(() => window.ironHorizon.getState().reload > 0, null, { timeout: 3000 });
    await host.waitForFunction(() => window.ironHorizon.getState().shellOwners.includes(5), null, { timeout: 3000, polling: 16 });
    // Let the battle run: structure points, tickets and deaths must agree on both sides.
    await host.waitForFunction(() => { const t = window.ironHorizon.getState().match.tickets; return t.blue < 100 || t.red < 100; }, null, { timeout: 150000, polling: 500 }); await wait(1500);
    h = await state(host); g = await state(guest);
    const hpOnHost = slot => slot === 0 ? h.hp : h.targets.find(t => t.slot === slot).hp, hpOnGuest = slot => slot === 5 ? g.hp : g.targets.find(t => t.slot === slot).hp;
    const mismatches = [0, 1, 2, 3, 4, 5].filter(slot => Math.abs(hpOnHost(slot) - hpOnGuest(slot)) > 0);
    assert.ok(mismatches.length <= 1, `hp differs for slots ${mismatches} (a hit may be in flight)`);
    assert.ok(Math.abs(g.match.tickets.blue - h.match.tickets.blue) <= 1 && Math.abs(g.match.tickets.red - h.match.tickets.red) <= 1, 'tickets in sync'); assert.equal(g.match.owner, h.match.owner);
    console.log('after first losses:', JSON.stringify({ tickets: h.match.tickets, guestStats: g.stats, hostStats: h.stats }));
    // The host leaves: the guest is sent back to the lobby.
    await host.keyboard.press('Escape'); await host.waitForFunction(() => window.ironHorizon.getState().mode === 'paused');
    await host.locator('#garageButton').click();
    await guest.waitForFunction(() => window.ironHorizon.getState().mode === 'menu' && !document.getElementById('lobby').hidden, null, { timeout: 5000 });
    assert.match(await guest.locator('#lobbyStatus').textContent(), /Gastgeber/);
    assert.equal((await state(guest)).online, null);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', checks: ['create and invite link', 'free team and vehicle choice', 'host settings', 'start with slots', 'guest movement to host', 'host bots to guest', 'clock sync', 'host leaves'] }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
