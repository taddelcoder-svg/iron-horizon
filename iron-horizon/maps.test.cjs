const { test } = require('node:test');
const assert = require('node:assert/strict');
const { levels, blocked } = require('./maps.js');
const { findPath } = require('./battle.js');

for (const level of Object.values(levels)) {
  test(`${level.name}: starts, training targets and objective positions are clear`, () => {
    for (const [x, z] of [level.playerStart, level.playerRespawn, ...level.spawns, ...level.training, ...level.goals, ...level.holds.blue, ...level.holds.red, ...level.flanks.blue, ...level.flanks.red]) assert.equal(blocked(level, x, z, 3.1), false, `Blocked position ${x},${z}`);
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
