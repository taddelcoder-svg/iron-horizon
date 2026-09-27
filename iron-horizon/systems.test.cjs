const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('./systems.js');
test('vehicle profiles trade speed and reload for armor and firepower', () => {
  assert.ok(S.profiles.luchs.speed > S.profiles.keiler.speed); assert.ok(S.profiles.keiler.reload > S.profiles.luchs.reload);
  assert.ok(S.profiles.keiler.power > S.profiles.luchs.power); assert.ok(S.profiles.keiler.front < S.profiles.luchs.front);
});
test('low side hits immobilize; rear engine hits reduce mobility', () => {
  const track = S.fresh(); assert.equal(S.hitModule(track, { x: 1.8, y: .8, z: 0 }), 'tracks'); assert.equal(S.mobility(track), 0);
  const engine = S.fresh(); assert.equal(S.hitModule(engine, { x: 0, y: 1.3, z: 2 }), 'engine'); assert.equal(S.mobility(engine), .4);
  const intact = S.fresh(); assert.equal(S.hitModule(intact, { x: 0, y: 2, z: -2 }), null); assert.equal(S.mobility(intact), 1);
});
test('repair needs six uninterrupted seconds; movement, release and hits cancel', () => {
  const s = S.fresh(); s.tracks = s.engine = 0;
  S.repair(s, 3, true, false); assert.equal(s.repair, 3); S.repair(s, .1, true, true); assert.equal(s.repair, 0);
  S.repair(s, 2, true, false); S.repair(s, .1, false, false); assert.equal(s.repair, 0);
  S.repair(s, 3, true, false); S.hitModule(s, { x: 0, y: 2, z: 0 }); assert.equal(s.repair, 0);
  assert.equal(S.repair(s, 5.9, true, false), false); assert.equal(s.tracks, 0);
  assert.equal(S.repair(s, .1, true, false), true); assert.equal(s.tracks, 100); assert.equal(s.engine, 100);
});
test('smoke has two charges and a cooldown, independent fresh lives', () => {
  const s = S.fresh(); assert.equal(S.useSmoke(s), true); assert.equal(S.useSmoke(s), false); assert.equal(s.smokeCharges, 1);
  S.repair(s, 4, false, false); assert.equal(S.useSmoke(s), true); S.repair(s, 4, false, false); assert.equal(S.useSmoke(s), false);
  assert.equal(S.fresh().smokeCharges, 2);
});
test('smoke blocks intersecting sightlines, including observers inside; not distant or expired clouds', () => {
  const from = { x: 0, y: 2, z: 0 }, to = { x: 20, y: 2, z: 0 };
  assert.equal(S.smokeBlocks(from, to, [{ x: 10, y: 2, z: 0, radius: 4, life: 5 }]), true);
  assert.equal(S.smokeBlocks(from, to, [{ x: 0, y: 2, z: 0, radius: 4, life: 5 }]), true);
  assert.equal(S.smokeBlocks(from, to, [{ x: 10, y: 2, z: 8, radius: 4, life: 5 }]), false);
  assert.equal(S.smokeBlocks(from, to, [{ x: 10, y: 2, z: 0, radius: 4, life: 0 }]), false);
  assert.equal(S.smokeBlocks(from, to, [{ x: 30, y: 2, z: 0, radius: 4, life: 5 }]), false);
});
