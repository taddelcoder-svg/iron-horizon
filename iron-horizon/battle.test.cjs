const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, findPath, smoothPath, clearLine, botObjective, difficulties, keyMoment } = require('./battle.js');
const advance = (match, seconds, blue = 0, red = 0) => { for (let i = 0; i < seconds * 60; i++) match.update(1 / 60, blue, red); };
test('capture, persistent ownership, ticket drain and contested freeze', () => {
  const match = new Match(); advance(match, 11, 1, 0); assert.equal(match.owner, 'blue');
  advance(match, 4); assert.ok(match.tickets.red <= 98); assert.equal(match.owner, 'blue');
  const tickets = match.tickets.red; advance(match, 5, 1, 1); assert.equal(match.tickets.red, tickets); assert.equal(match.contested, true);
});
test('enemy neutralizes before taking ownership', () => {
  const match = new Match(); advance(match, 11, 1, 0); advance(match, 6, 0, 1); assert.equal(match.owner, null);
  advance(match, 10, 0, 1); assert.equal(match.owner, 'red');
});
test('time limit, tie and terminal state', () => {
  const tie = new Match(); advance(tie, 421); assert.equal(tie.result, 'draw');
  const match = new Match(); match.lose('red', 100); assert.equal(match.result, 'blue');
  const snapshot = JSON.stringify(match); match.update(10, 0, 1); match.lose('blue', 200); assert.equal(JSON.stringify(match), snapshot);
});
test('destruction costs five tickets; no underflow', () => {
  const match = new Match(); match.lose('blue'); assert.equal(match.tickets.blue, 95); match.lose('blue', 200); assert.equal(match.tickets.blue, 0); assert.equal(match.result, 'red');
});
test('navigation routes around blocked cells', () => {
  const blocked = (x, z) => x === 0 && z >= -6 && z <= 6;
  const path = findPath({ x: -12, z: 0 }, { x: 12, z: 0 }, blocked, 6, 24);
  assert.ok(path.length > 4); assert.deepEqual(path.at(-1), { x: 12, z: 0 }); assert.ok(path.every(p => !blocked(p.x, p.z)));
  assert.deepEqual(findPath({ x: -12, z: 0 }, { x: 12, z: 0 }, () => true, 6, 24), []);
});
test('smoothing keeps only the corners needed around an obstacle', () => {
  const blocked = (x, z) => Math.abs(x) < 4 && Math.abs(z) < 10;
  const start = { x: -18, z: 0 }, path = findPath(start, { x: 18, z: 0 }, blocked, 6, 24), smooth = smoothPath(start, path, blocked);
  assert.ok(smooth.length < path.length); assert.deepEqual(smooth.at(-1), path.at(-1));
  let previous = start; for (const point of smooth) { assert.ok(clearLine(previous, point, blocked)); previous = point; }
});
test('bot tactics: capture, flank first, hold once secured, retreat when hurt', () => {
  const base = { team: 'red', position: { x: 0, z: -90 }, hp: 100, threatened: false, guard: false, owner: null, contested: false, progress: 0, capture: { x: 0, z: -10, radius: 17 }, slot: [0, -20], hold: [0, -40], flank: null };
  assert.equal(botObjective(base).kind, 'capture');
  assert.equal(botObjective({ ...base, flank: [50, -35] }).kind, 'flank');
  assert.equal(botObjective({ ...base, flank: [50, -35], position: { x: 0, z: -25 } }).kind, 'capture');
  const secured = { ...base, owner: 'red', progress: -1 };
  assert.equal(botObjective(secured).kind, 'hold'); assert.equal(botObjective({ ...secured, guard: true }).kind, 'capture');
  assert.equal(botObjective({ ...secured, progress: -.6 }).kind, 'capture', 'being neutralised pulls everyone back');
  assert.equal(botObjective({ ...secured, contested: true }).kind, 'capture');
  assert.equal(botObjective({ ...base, hp: 20, threatened: true }).kind, 'retreat');
  assert.equal(botObjective({ ...secured, guard: true, hp: 20, threatened: true }).kind, 'capture', 'the last guard stays on a secured point');
});
test('difficulty levels get sharper from Rekrut to Ass', () => {
  const { recruit, veteran, ace } = difficulties;
  assert.ok(recruit.reaction[0] > veteran.reaction[0] && veteran.reaction[0] > ace.reaction[0]);
  assert.ok(recruit.error > veteran.error && veteran.error > ace.error);
  assert.ok(recruit.reload > veteran.reload && veteran.reload > ace.reload, 'reload time separates the levels');
  assert.equal(recruit.flank, false); assert.equal(recruit.smoke, false); assert.equal(ace.lowAim, true);
});
test('key moment prefers kills that relieved the point, then solo captures', () => {
  const kill = { type: 'kill', victim: 'GEGNER 3', vehicle: 'KEILER', where: 'SEITE', distance: 42, zone: false };
  const saved = { ...kill, victim: 'GEGNER 1', where: 'HECK', zone: true };
  assert.match(keyMoment([kill, saved], {}, 'blue').moment, /ins Heck von GEGNER 1.*entlastet/);
  assert.equal(keyMoment([kill, { type: 'capture' }], {}, 'blue').moment, 'Du hast Punkt A allein erobert.');
  assert.match(keyMoment([kill], {}, 'blue').moment, /in die Seite von GEGNER 3 \(KEILER\) aus 42 m war dein bester Schuss/);
  assert.equal(keyMoment([], {}, 'draw').moment, null);
});
test('the tip names the most useful lesson', () => {
  assert.match(keyMoment([], { ricochets: 4 }, 'blue').tip, /4 Abpraller/);
  assert.match(keyMoment([{ type: 'death', where: 'HECK' }, { type: 'death', where: 'SEITE' }], {}, 'red').tip, /2× von der Seite/);
  assert.match(keyMoment([], { captureSeconds: 3 }, 'red').tip, /Punkt A entscheidet/);
  assert.equal(keyMoment([], { captureSeconds: 80, kills: 2 }, 'blue').tip, null);
});
const { Breakthrough, freeNear, pointLayout } = require('./battle.js');
test('Durchbruch: attackers take A, gain time, then B; defenders cannot recapture', () => {
  const b = new Breakthrough('blue'); assert.equal(b.tickets.red, Infinity);
  advance(b, 11, 1, 0); assert.equal(b.stage, 1); assert.ok(b.time > 300, 'captured point adds time');
  const before = b.progress; advance(b, 4, 1, 1); assert.equal(b.contested, true); assert.equal(b.progress, before, 'contested points freeze');
  advance(b, 5, 1, 0); advance(b, 4, 0, 0); assert.ok(b.progress > 0 && b.progress < .5, 'progress drains slowly when attackers leave');
  advance(b, 10, 1, 0); assert.equal(b.result, 'blue');
});
test('Durchbruch: outnumbering defenders captures, only more slowly', () => {
  const held = new Breakthrough('blue'); advance(held, 20, 1, 2); assert.equal(held.progress, 0); assert.equal(held.contested, true);
  const even = new Breakthrough('red'); advance(even, 20, 2, 2); assert.equal(even.progress, 0);
  const lone = new Breakthrough('blue'); advance(lone, 20.1, 2, 1); const two = new Breakthrough('blue'); advance(two, 20, 3, 2); assert.equal(two.progress, 0, '3 against 2 is not enough'); assert.ok(lone.progress > .6 && lone.stage === 0); advance(lone, 10, 2, 1); assert.equal(lone.stage, 1);
});
test('Durchbruch: defenders win on time or when the attackers run out of tickets', () => {
  const timed = new Breakthrough('red'); advance(timed, 301, 0, 0); assert.equal(timed.result, 'blue');
  const broke = new Breakthrough('blue'), losses = Breakthrough.TICKETS / 5; assert.equal(broke.tickets.blue, 110);
  for (let i = 1; i < losses; i++) broke.lose('blue'); assert.equal(broke.result, null); broke.lose('blue'); assert.equal(broke.result, 'red');
  const defenders = new Breakthrough('blue'); defenders.lose('red', 500); assert.equal(defenders.result, null); assert.equal(defenders.tickets.red, Infinity);
});
test('the path grid can be laid through any point, so it is symmetric around that point', () => {
  const { gridShift } = require('./battle.js');
  assert.deepEqual(gridShift(6, 136, null), { x: 0, z: 0 }); assert.deepEqual(gridShift(6, 136, { x: 24, z: -4 }), { x: 4, z: 0 });
  const path = findPath({ x: 0, z: 40 }, { x: 24, z: -4 }, () => false, 6, 136, { x: 24, z: -4 });
  const last = path[path.length - 1]; assert.deepEqual([last.x, last.z], [24, -4]);
  assert.ok(path.every(p => (p.x - 24) % 6 === 0 && (p.z + 4) % 6 === 0));
});
test('generated objective positions are pushed out of obstacles', () => {
  const wall = (x, z) => Math.abs(x) < 5 && Math.abs(z) < 5;
  const [x, z] = freeNear(0, 0, wall); assert.equal(wall(x, z), false); assert.ok(Math.hypot(x, z) < 10);
  const layout = pointLayout({ x: 0, z: -10 }, 1); assert.ok(layout.slots.every(([, sz]) => sz > -10)); assert.ok(layout.holds.every(([, hz]) => hz > -10));
});
