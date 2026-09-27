const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, findPath, smoothPath, clearLine, botObjective } = require('./battle.js');
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
