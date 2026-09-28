// Balance tournament (developer tool): Playwright, installed Chrome and a running server.
// Plays bot-only matches (the player's tank on autopilot) and checks the balance rules from the concept:
//  1. mirrored line-ups: each side wins 45–55 %,
//  2. every tank pair: neither wins more than 55 % of the kills between them,
//  3. Durchbruch: the attackers win 40–60 % over all maps,
//  4. guide value (does not fail the run, only with --pure): pure teams (only X against only Y) at most 60 : 40 per map,
//  5. Eroberung and Letztes Gefecht: each side wins 40–60 % of the mirrored line-ups (half the rounds each).
// With --modes only rule 5 is played.
// With --beginner it instead estimates how often a beginner wins: the autopilot player plays at 'recruit'
// level, the allies as veterans, the enemies at each difficulty.
// Usage: node iron-horizon/balance-tournament.cjs [--url http://127.0.0.1:4177/iron-horizon/] [--rounds 12] [--level veteran] [--workers 4] [--pure] [--beginner] [--modes]
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(part => { const [key, ...value] = part.trim().split(/\s+/); return [key, value.join(' ') || true]; }));
const url = args.url || 'http://127.0.0.1:4177/iron-horizon/', rounds = Number(args.rounds) || 12, level = args.level || 'veteran', workers = Number(args.workers) || 4;
const L = 'luchs', K = 'keiler', D = 'dachs', W = 'wiesel', B = 'baer', MAPS = ['border', 'quarry', 'valley'], NAMES = { luchs: 'Luchs', keiler: 'Keiler', dachs: 'Dachs', wiesel: 'Wiesel', baer: 'Bär' };
const PAIRS = [[L, K], [L, D], [K, D], [W, B], [L, W], [K, W], [D, W], [L, B], [K, B], [D, B]];
// Order: player, blue bot 1, blue bot 2, red bot 1, red bot 2, red bot 3. Mirror pairs share start,
// goal and overwatch slot: blue bot 1 ↔ red bot 1, blue bot 2 ↔ red bot 2, player ↔ red bot 3.
// Every pair once as a mirrored line-up: player and bot 1 drive the first tank, bot 2 the second.
const mirrored = Object.fromEntries(PAIRS.map(([a, b]) => [`gemischt ${NAMES[a]}/${NAMES[b]}`, [a, a, b, a, b, a]]));
const pure = {};
if (args.pure) for (const [a, b] of PAIRS) { pure[`${NAMES[a]} gegen ${NAMES[b]}`] = [a, a, a, b, b, b]; pure[`${NAMES[b]} gegen ${NAMES[a]}`] = [b, b, b, a, a, a]; }
const jobs = [];
if (args.beginner) {
  const lineups = { ...mirrored, 'gemischt alle': [L, K, D, K, D, L] };
  for (const enemy of ['recruit', 'veteran', 'ace']) for (const [name, vehicles] of Object.entries(lineups)) for (const map of MAPS) for (let seed = 1; seed <= rounds; seed++) jobs.push({ name, vehicles, map, mission: 'domination', seed: seed * 6007 + MAPS.indexOf(map), level: enemy, allies: 'veteran', player: 'recruit' });
} else {
  const newModes = { conquest: 'Eroberung', laststand: 'Letztes Gefecht' };
  for (const [mission, title] of Object.entries(newModes)) for (const [name, vehicles] of Object.entries(mirrored)) for (const map of MAPS) for (let seed = 1; seed <= Math.ceil(rounds / 2); seed++) jobs.push({ name: `${title} ${name}`, vehicles, map, mission, seed: seed * 15485863 + MAPS.indexOf(map), level });
}
if (!args.beginner && !args.modes) {
  for (const [name, vehicles] of Object.entries({ ...mirrored, ...pure })) for (const map of MAPS) for (let seed = 1; seed <= rounds; seed++) jobs.push({ name, vehicles, map, mission: 'domination', seed: seed * 7919 + MAPS.indexOf(map), level });
  for (const [name, vehicles] of Object.entries(mirrored)) for (const map of MAPS) for (let seed = 1; seed <= rounds; seed++) jobs.push({ name: `Durchbruch ${name}`, vehicles, map, mission: seed % 2 ? 'attack' : 'defense', seed: seed * 104729 + MAPS.indexOf(map), level });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const results = [], total = jobs.length;
  try {
    await Promise.all(Array.from({ length: workers }, async () => {
      const page = await (await browser.newContext()).newPage();
      await page.goto(url); await page.waitForFunction(() => !!window.ironHorizon);
      while (jobs.length) {
        const job = jobs.shift();
        const outcome = await page.evaluate(options => window.ironHorizon.balance(options), { vehicles: job.vehicles, map: job.map, level: job.level, seed: job.seed, mission: job.mission, allies: job.allies, player: job.player });
        results.push({ ...job, ...outcome });
        if (results.length % 20 === 0) process.stdout.write(`${results.length}/${total} `);
      }
    }));
  } finally { await browser.close(); }
  console.log('\n');
  const blueScore = r => r.result === 'blue' ? 1 : r.result === 'draw' ? .5 : 0, share = (set, f) => set.reduce((a, r) => a + f(r), 0) / Math.max(1, set.length);
  const pct = value => `${Math.round(value * 100)} %`, verdicts = [];
  const rule = (text, ok, counts = true) => { if (counts) verdicts.push(ok); console.log(`${ok ? 'OK  ' : counts ? 'NEIN' : 'ABW '} ${text}`); };
  if (args.beginner) {
    for (const enemy of ['recruit', 'veteran', 'ace']) {
      const set = results.filter(r => r.level === enemy), won = share(set, r => r.result === 'blue' ? 1 : 0), draw = share(set, r => r.result === 'draw' ? 1 : 0);
      console.log(`Gegner ${enemy.padEnd(8)} Team mit Einsteiger gewinnt ${pct(won)}, unentschieden ${pct(draw)} (${set.length} Gefechte; ${MAPS.map(map => `${map} ${pct(share(set.filter(r => r.map === map), r => r.result === 'blue' ? 1 : 0))}`).join(', ')})`);
    }
    console.log('Einsteiger = Spielerpanzer per Autopilot auf Stufe Rekrut, Verbündete Veteran.');
    return;
  }
  // 5. new modes
  for (const [mission, title] of [['conquest', 'Eroberung'], ['laststand', 'Letztes Gefecht']]) {
    const set = results.filter(r => r.mission === mission), side = share(set, blueScore);
    console.log(`     ${title}: ${MAPS.map(map => `${map} Blau ${pct(share(set.filter(r => r.map === map), blueScore))}`).join(', ')}, Ø ${Math.round(share(set, r => r.seconds))} s, Unentschieden ${pct(share(set, r => r.result === 'draw' ? 1 : 0))}`);
    rule(`5. ${title}: Blau ${pct(side)} (${set.length} Gefechte)`, side >= .4 && side <= .6);
  }
  if (args.modes) { console.log(`Stufe ${level}, ${results.length} Gefechte.`); process.exitCode = verdicts.every(Boolean) ? 0 : 1; return; }
  const domination = results.filter(r => r.mission === 'domination');
  console.table(Object.keys({ ...mirrored, ...pure }).map(name => Object.fromEntries([['Aufstellung', name], ...MAPS.map(map => [map, pct(share(domination.filter(r => r.name === name && r.map === map), blueScore))])])));
  // 1. sides
  const sides = domination.filter(r => r.name in mirrored), blue = share(sides, blueScore);
  rule(`1. Seitenbalance gespiegelt: Blau ${pct(blue)} (${sides.length} Gefechte)`, blue >= .45 && blue <= .55);
  // 2. duels
  const kills = results.flatMap(r => r.kills);
  for (const [a, b] of PAIRS) {
    const aWins = kills.filter(([killer, victim]) => killer === a && victim === b).length, bWins = kills.filter(([killer, victim]) => killer === b && victim === a).length, s = aWins / Math.max(1, aWins + bWins);
    rule(`2. ${NAMES[a]} gegen ${NAMES[b]}: ${aWins} : ${bWins} Abschüsse (${pct(s)})`, s >= .45 && s <= .55);
  }
  // 3. Durchbruch
  const breakthrough = results.filter(r => r.mission === 'attack' || r.mission === 'defense'), attackersWin = r => (r.mission === 'attack') === (r.result === 'blue') ? 1 : 0;
  for (const map of MAPS) {
    const set = breakthrough.filter(r => r.map === map);
    console.log(`     Durchbruch ${map}: Angreifer ${pct(share(set, attackersWin))} (als Blau ${pct(share(set.filter(r => r.mission === 'attack'), attackersWin))}, als Rot ${pct(share(set.filter(r => r.mission === 'defense'), attackersWin))}), Ø ${share(set, r => r.captured).toFixed(2)} Punkte, Ø ${Math.round(share(set, r => r.seconds))} s`);
  }
  const attackers = share(breakthrough, attackersWin);
  rule(`3. Durchbruch: Angreifer gewinnen ${pct(attackers)} (${breakthrough.length} Gefechte)`, attackers >= .4 && attackers <= .6);
  // 4. pure teams per map (guide value)
  if (args.pure) for (const [a, b] of PAIRS) for (const map of MAPS) {
    const asBlue = domination.filter(r => r.map === map && r.name === `${NAMES[a]} gegen ${NAMES[b]}`), asRed = domination.filter(r => r.map === map && r.name === `${NAMES[b]} gegen ${NAMES[a]}`);
    const aTeam = (share(asBlue, blueScore) + 1 - share(asRed, blueScore)) / 2;
    rule(`4. Richtwert reine Teams ${NAMES[a]} gegen ${NAMES[b]} auf ${map}: ${pct(aTeam)} : ${pct(1 - aTeam)}`, aTeam >= .4 && aTeam <= .6, false);
  }
  console.log(`Stufe ${level}, ${results.length} Gefechte.`);
  process.exitCode = verdicts.every(Boolean) ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
