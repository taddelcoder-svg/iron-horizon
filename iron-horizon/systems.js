/* Vehicle profiles and deterministic module/smoke rules, shared by game and tests. */
(function (scope) {
  'use strict';
  const profiles = Object.freeze({
    luchs: Object.freeze({ id: 'luchs', name: 'LUCHS', version: 'MK. I', role: 'LEICHTER PANZER · AUFKLÄRUNG', speed: 52 / 3.6, reverse: 5.5, acceleration: 5.3, turn: .82, turret: 1.15, reload: 3, calibre: 40, power: 1, front: 1, scale: 1, note: 'Leicht auf den Ketten. Schnell an der Flanke.' }),
    keiler: Object.freeze({ id: 'keiler', name: 'KEILER', version: 'MK. II', role: 'MITTLERER PANZER · FEUERUNTERSTÜTZUNG', speed: 36 / 3.6, reverse: 4, acceleration: 3.4, turn: .6, turret: .7, reload: 5, calibre: 75, power: 1.45, front: .7, scale: 1.12, note: 'Starke Front. Schweres Geschütz. Sichere deine Flanken.' })
  });
  function fresh() { return { tracks: 100, engine: 100, repair: 0, smokeCharges: 2, smokeCooldown: 0 }; }
  function damaged(state) { return state.tracks === 0 || state.engine === 0; }
  function mobility(state) { return state.tracks === 0 ? 0 : state.engine === 0 ? .4 : 1; }
  function hitModule(state, point) {
    state.repair = 0;
    if (Math.abs(point.x) > 1.4 && point.y < 1.5) { state.tracks = 0; return 'tracks'; }
    if (point.z > 1 && point.y < 1.9) { state.engine = 0; return 'engine'; }
    return null;
  }
  function repair(state, dt, held, moving, alive = true) {
    state.smokeCooldown = Math.max(0, state.smokeCooldown - dt);
    if (!held || moving || !alive || !damaged(state)) { state.repair = 0; return false; }
    state.repair += dt;
    if (state.repair + 1e-8 < 6) return false;
    state.tracks = state.engine = 100; state.repair = 0; return true;
  }
  function useSmoke(state) {
    if (state.smokeCharges <= 0 || state.smokeCooldown > 0) return false;
    state.smokeCharges--; state.smokeCooldown = 4; return true;
  }
  function smokeBlocks(from, to, clouds) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const length = dx * dx + dy * dy + dz * dz;
    return clouds.some(cloud => {
      if (cloud.life <= 0) return false;
      const t = length ? Math.max(0, Math.min(1, ((cloud.x - from.x) * dx + (cloud.y - from.y) * dy + (cloud.z - from.z) * dz) / length)) : 0;
      return Math.hypot(from.x + dx * t - cloud.x, from.y + dy * t - cloud.y, from.z + dz * t - cloud.z) < cloud.radius;
    });
  }
  const api = { profiles, fresh, damaged, mobility, hitModule, repair, useSmoke, smokeBlocks };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else scope.IronSystems = api;
})(typeof window !== 'undefined' ? window : globalThis);
