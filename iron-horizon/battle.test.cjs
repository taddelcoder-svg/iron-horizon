const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Match, findPath } = require('./battle.js');
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
