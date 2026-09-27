// Balance tournament (developer tool): Playwright, installed Chrome and a running server.
// Runs bot-only matches on both maps and checks the balance rule from the concept:
// each side wins 45–55 % in mirrored line-ups, and neither tank wins more than 55 % of Luchs-vs-Keiler kills.
// Usage: node iron-horizon/balance-tournament.cjs [--url http://127.0.0.1:4177/iron-horizon/] [--rounds 20] [--level veteran]
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(part => part.trim().split(/\s+/)));
const url = args.url || 'http://127.0.0.1:4177/iron-horizon/', rounds = Number(args.rounds) || 20, level = args.level || 'veteran';
const L = 'luchs', K = 'keiler';
// Order: player, blue bot 1, blue bot 2, red bot 1, red bot 2, red bot 3. Mirror pairs share start,
// goal and overwatch slot: blue bot 1 ↔ red bot 1, blue bot 2 ↔ red bot 2, player ↔ red bot 3.
const lineups = {
  'gemischt A': [L, L, K, L, K, L],
  'gemischt B': [K, K, L, K, L, K],
  'Luchse gegen Keiler': [L, L, L, K, K, K],
  'Keiler gegen Luchse': [K, K, K, L, L, L]
};
const jobs = [];
for (const [name, vehicles] of Object.entries(lineups)) for (const map of ['border', 'quarry']) for (let seed = 1; seed <= rounds; seed++) jobs.push({ name, vehicles, map, seed: seed * 7919 + (map === 'quarry' ? 1 : 0) });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    const worker = async () => {
      const page = await (await browser.newContext()).newPage();
      await page.goto(url); await page.waitForFunction(() => !!window.ironHorizon);
      while (jobs.length) {
        const job = jobs.shift();
        const outcome = await page.evaluate(options => window.ironHorizon.balance(options), { vehicles: job.vehicles, map: job.map, level, seed: job.seed });
        results.push({ ...job, ...outcome });
        process.stdout.write('.');
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
  } finally { await browser.close(); }
  console.log('\n');
  const score = r => r.result === 'blue' ? 1 : r.result === 'draw' ? .5 : 0;
  const rows = [];
  for (const name of Object.keys(lineups)) for (const map of ['border', 'quarry', 'beide']) {
    const set = results.filter(r => r.name === name && (map === 'beide' || r.map === map));
    rows.push({ Aufstellung: name, Karte: map, Gefechte: set.length, 'Blau gewinnt': `${Math.round(set.reduce((a, r) => a + score(r), 0) / set.length * 100)} %`, 'Ø Dauer': `${Math.round(set.reduce((a, r) => a + r.seconds, 0) / set.length)} s` });
  }
  console.table(rows);
  const mirrored = results.filter(r => r.name.startsWith('gemischt')), blueShare = mirrored.reduce((a, r) => a + score(r), 0) / mirrored.length;
  const duels = results.flatMap(r => r.kills).filter(([killer, victim]) => killer !== victim);
  const luchsWins = duels.filter(([killer]) => killer === L).length, keilerWins = duels.length - luchsWins, luchsShare = luchsWins / Math.max(1, duels.length);
  const sideOk = blueShare >= .45 && blueShare <= .55, duelOk = luchsShare >= .45 && luchsShare <= .55;
  console.log(`Seitenbalance (gespiegelte Aufstellungen): Blau ${Math.round(blueShare * 100)} % · ${sideOk ? 'OK' : 'NICHT OK'}`);
  console.log(`Luchs gegen Keiler: ${luchsWins} : ${keilerWins} Abschüsse, Luchs ${Math.round(luchsShare * 100)} % · ${duelOk ? 'OK' : 'NICHT OK'}`);
  console.log(`Stufe ${level}, ${results.length} Gefechte.`);
  process.exitCode = sideOk && duelOk ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
