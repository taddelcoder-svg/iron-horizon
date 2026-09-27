const { test } = require('node:test');
const assert = require('node:assert/strict');
const { levels, blocked, height, mirror } = require('./maps.js');
const { findPath, smoothPath } = require('./battle.js');

for (const level of Object.values(levels)) {
  test(`${level.name}: starts, training targets and objective positions are clear`, () => {
    for (const [x, z] of [level.playerStart, level.playerRespawn, level.trainingStart, ...level.spawns, ...level.training, ...level.goals, ...level.holds.blue, ...level.holds.red, ...level.flanks.blue, ...level.flanks.red]) assert.equal(blocked(level, x, z, 3.1), false, `Blocked position ${x},${z}`);
    for (const [x, z] of level.goals) assert.ok(Math.hypot(x - level.capture.x, z - level.capture.z) < level.capture.radius);
  });
  test(`${level.name}: every spawn reaches the objective without crossing structures`, () => {
    for (const [i, [x, z]] of level.spawns.entries()) {
      const [gx, gz] = level.goals[i];
      const path = findPath({ x, z }, { x: gx, z: gz }, (px, pz) => blocked(level, px, pz, 3.1));
      assert.ok(path.length > 0, `No path for bot ${i}`);
      let previous = { x, z };
      for (const point of path) {
        for (let t = 0; t <= 1; t += .1) assert.equal(blocked(level, previous.x + (point.x - previous.x) * t, previous.z + (point.z - previous.z) * t, 3.1), false, `Path crosses obstacle for bot ${i}`);
        previous = point;
      }
      assert.ok(Math.hypot(previous.x - gx, previous.z - gz) < 5);
    }
  });
  test(`${level.name}: overwatch and flank positions are reachable and on the own side`, () => {
    const free = (px, pz) => blocked(level, px, pz, 3.1);
    for (const team of ['blue', 'red']) {
      const [sx, sz] = level.spawns[team === 'blue' ? 0 : 2], sign = team === 'blue' ? 1 : -1;
      for (const [x, z] of [...level.holds[team], ...level.flanks[team]]) {
        assert.ok(findPath({ x: sx, z: sz }, { x, z }, free).length > 0, `${team} cannot reach ${x},${z}`);
        assert.ok(findPath({ x, z }, level.capture, free).length > 0, `${x},${z} cannot reach the objective`);
        assert.ok((z - level.capture.z) * sign > 0, `${x},${z} lies on the enemy side`);
      }
      for (const [x, z] of level.holds[team]) assert.ok(Math.hypot(x - level.capture.x, z - level.capture.z) < 50);
    }
  });
}
test('Steinbruch interrupts the central approach and has open side routes', () => {
  const level = levels.quarry;
  for (const z of [40, -48]) {
    assert.equal(blocked(level, 24, z), true);
    for (const x of [-6, 54]) assert.equal(blocked(level, x, z), false);
  }
});
for (const level of Object.values(levels)) {
  test(`${level.name}: Durchbruch point B lies free between A and each base`, () => {
    const free = (px, pz) => blocked(level, px, pz, 3.1);
    for (const [team, sign] of [['red', -1], ['blue', 1]]) {
      const b = level.breakthrough[team];
      assert.equal(free(b.x, b.z), false); assert.ok((b.z - level.capture.z) * sign > 30, 'B behind A');
      assert.ok(findPath(level.capture, b, free).length > 0 && findPath({ x: level.spawns[0][0], z: level.spawns[0][1] }, b, free).length > 0);
    }
  });
}
test('Flusstal: drivable slopes, flat bases and a riverbed and ridge as flanks', () => {
  const valley = levels.valley; let steepest = 0;
  for (let x = -140; x <= 140; x += 2) for (let z = -140; z <= 140; z += 2) {
    const gx = height(valley, x + .5, z) - height(valley, x - .5, z), gz = height(valley, x, z + .5) - height(valley, x, z - .5);
    steepest = Math.max(steepest, Math.hypot(gx, gz));
  }
  assert.ok(steepest < .45, `slope ${steepest}`);
  for (const [x, z] of [...valley.spawns, valley.playerStart]) assert.ok(Math.abs(height(valley, x, z)) < .05);
  assert.ok(height(valley, ...valley.flanks.blue[0]) < -2, 'west flank runs through the riverbed');
  assert.ok(height(valley, ...valley.flanks.blue[1]) > 3, 'east flank runs over the ridge');
  assert.ok(height(valley, -25, -10) < -1.5 && Math.abs(height(valley, 0, -10)) < .05, 'creek beside a level bridge');
  for (let x = -120; x <= 120; x += 10) for (let dz = 0; dz <= 90; dz += 10) assert.ok(Math.abs(height(valley, x, -10 + dz) - height(valley, x, -10 - dz)) < 1e-9, 'mirror-symmetric');
  assert.equal(height(levels.border, 10, 10), 0);
});
test('both teams get mirrored slots: red slot i is the counterpart of blue slot i', () => {
  for (const level of Object.values(levels)) {
    const same = (a, b, text) => assert.deepEqual(mirror(level, ...a), b, `${level.name}: ${text}`);
    [0, 1].forEach(i => { same(level.spawns[i], level.spawns[i + 2], `spawn ${i}`); same(level.goals[i], level.goals[i + 2], `goal ${i}`); });
    same(level.playerStart, level.spawns[4], 'player start'); same([level.capture.x, level.capture.z + 5], level.goals[4], 'player slot');
    level.holds.blue.forEach((hold, i) => same(hold, level.holds.red[i], `hold ${i}`));
    const b = level.breakthrough; same([b.blue.x, b.blue.z], [b.red.x, b.red.z], 'point B');
  }
});
test('Steinbruch is point-symmetric: every structure has its counterpart turned by 180°', () => {
  const quarry = levels.quarry, key = ([type, x, z, w, d, h]) => `${type} ${x} ${z} ${w} ${d} ${h}`, all = new Set(quarry.structures.map(key));
  for (const [type, x, z, w, d, h] of quarry.structures) assert.ok(all.has(key([type, ...mirror(quarry, x, z), w, d, h])), `${type} at ${x},${z}`);
  // Raw grid routes may pick different but equally long detours; the driven (smoothed) routes match.
  const free = (x, z) => blocked(quarry, x, z, 2.8), clear = (x, z) => blocked(quarry, x, z, 3.2), through = quarry.capture;
  const route = (from, to) => smoothPath(from, findPath(from, to, free, 6, 136, through), clear);
  const blue = route({ x: 12, z: 92 }, { x: 16, z: 1 }), red = route({ x: 36, z: -100 }, { x: 32, z: -9 });
  assert.deepEqual(red.map(p => mirror(quarry, p.x, p.z)), blue.map(p => [p.x, p.z]));
});
test('the navigation grid is mirror-symmetric around every objective', () => {
  // findPath uses cell 6 and bound 136: grid lines must pass through the objective's z so both teams snap alike.
  for (const level of Object.values(levels)) assert.equal((level.capture.z + 136) % 6, 0, level.name);
  const valley = levels.valley, free = (x, z) => blocked(valley, x, z, 2.8);
  const blue = findPath({ x: -12, z: 80 }, { x: -12, z: 1 }, free), red = findPath({ x: -12, z: -100 }, { x: -12, z: -21 }, free);
  assert.deepEqual(red.map(p => [p.x, -20 - p.z]), blue.map(p => [p.x, p.z]));
});
