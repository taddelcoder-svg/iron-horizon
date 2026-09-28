/* Vehicle profiles and deterministic module/smoke/armour rules, shared by game and tests. */
(function (scope) {
  'use strict';
  const profiles = Object.freeze({
    luchs: Object.freeze({ id: 'luchs', name: 'LUCHS', version: 'MK. I', role: 'LEICHTER PANZER · AUFKLÄRUNG', speed: 52 / 3.6, reverse: 5.5, acceleration: 5.3, turn: .82, turret: 1.15, reload: 3, calibre: 40, power: 1, front: 1, scale: 1, spread: 1, note: 'Leicht auf den Ketten. Schnell an der Flanke.' }),
    keiler: Object.freeze({ id: 'keiler', name: 'KEILER', version: 'MK. II', role: 'MITTLERER PANZER · FEUERUNTERSTÜTZUNG', speed: 36 / 3.6, reverse: 4, acceleration: 3.4, turn: .6, turret: .7, reload: 5, calibre: 75, power: 1.45, front: .7, scale: 1.12, spread: 1.25, note: 'Starke Front. Schweres Geschütz. Sichere deine Flanken.' }),
    // Turretless tank destroyer: the gun only traverses ±12° (traverse, rad) inside the hull.
    // Scout tank: very fast, a quick-firing autocannon with little punch, thin armour.
    wiesel: Object.freeze({ id: 'wiesel', name: 'WIESEL', version: 'MK. IV', role: 'SPÄHPANZER · MASCHINENKANONE', speed: 60 / 3.6, reverse: 7, acceleration: 6.4, turn: .95, turret: 1.5, reload: 1.5, calibre: 25, power: .3, front: 1, scale: .88, spread: .9, note: 'Schnellfeuer aus der Bewegung. Hält kaum etwas aus – nutze Tempo und Deckung.' }),
    // Heavy tank: slow, a thick front plate and a big gun, but the turret turns slowly.
    baer: Object.freeze({ id: 'baer', name: 'BÄR', version: 'MK. V', role: 'SCHWERER PANZER · DURCHBRUCH', speed: 28 / 3.6, reverse: 3.5, acceleration: 2.6, turn: .45, turret: .5, reload: 7.5, calibre: 105, power: 2.05, front: .55, scale: 1.22, spread: 1.2, note: 'Dicke Front, schweres Geschütz. Der Turm dreht langsam – lass dich nicht umfahren.' }),
    dachs: Object.freeze({ id: 'dachs', name: 'DACHS', version: 'MK. III', role: 'JAGDPANZER · FERNKAMPF', speed: 34 / 3.6, reverse: 16 / 3.6, acceleration: 3.9, turn: .72, turret: .9, traverse: 12 * Math.PI / 180, reload: 6.5, calibre: 88, power: 1.9, front: .59, scale: 1.08, spread: 1.1, note: 'Kein Turm: Die Kanone schwenkt nur ±12°. Die Wanne dreht sich zum Ziel, wenn du stillstehst.' })
  });
  const VEHICLES = Object.freeze(Object.keys(profiles));
  const REPAIR_TIME = 6;
  // Shots hitting armour flatter than this angle to the surface normal bounce off.
  const RICOCHET_ANGLE = 72;
  function fresh() { return { tracks: 100, engine: 100, turret: 100, repair: 0, smokeCharges: 2, smokeCooldown: 0 }; }
  function damaged(state) { return state.tracks === 0 || state.engine === 0 || state.turret === 0; }
  function mobility(state) { return state.tracks === 0 ? 0 : state.engine === 0 ? .4 : 1; }
  function turretRate(state) { return state.turret === 0 ? .35 : 1; }
  // Simplified local hit zones (vehicle space, metres, -z is the front).
  // Turretless vehicles only have the gun mantlet around the barrel as their traverse drive
  // (about a tenth of the front, like the turret ring of the other tanks).
  function hitModule(state, point, profile = null) {
    state.repair = 0;
    if (Math.abs(point.x) > 1.4 && point.y < 1.5) { state.tracks = 0; return 'tracks'; }
    if (point.z > 1 && point.y < 1.9) { state.engine = 0; return 'engine'; }
    const drive = profile?.traverse ? Math.abs(point.x) < .45 && point.y > 1.95 && point.y < 2.45 && point.z < -2.3 : point.y >= 1.75 && point.y < 2.1 && Math.abs(point.x) < 1.4 && point.z > -1.6 && point.z < 1.2;
    if (drive) { state.turret = 0; return 'turret'; }
    return null;
  }
  function repair(state, dt, held, moving, alive = true) {
    state.smokeCooldown = Math.max(0, state.smokeCooldown - dt);
    if (!held || moving || !alive || !damaged(state)) { state.repair = 0; return false; }
    state.repair += dt;
    if (state.repair + 1e-8 < REPAIR_TIME) return false;
    state.tracks = state.engine = state.turret = 100; state.repair = 0; return true;
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
  // cosine = |cos| between the shell path and the struck surface normal.
  function ricochet(cosine) { return cosine < Math.cos(RICOCHET_ANGLE * Math.PI / 180); }
  // incidence: +1 straight into the front, -1 straight into the rear.
  function side(incidence) { return incidence > .55 ? 'front' : incidence < -.55 ? 'rear' : 'side'; }
  function damage(incidence, attacker, victim, module) {
    const facing = side(incidence);
    const base = facing === 'front' ? 24 * victim.front : facing === 'rear' ? 50 : 38;
    return Math.round(base * attacker.power * (module === 'tracks' ? .45 : 1));
  }
  // Gun dispersion in radians: accurate when standing, loose while driving or turning the hull.
  function spread(profile, speedRatio, turning = 0) {
    return (.0022 + .016 * Math.min(1, Math.abs(speedRatio)) + .006 * Math.min(1, Math.abs(turning))) * (profile.spread || 1);
  }
  const api = { profiles, VEHICLES, REPAIR_TIME, RICOCHET_ANGLE, fresh, damaged, mobility, turretRate, hitModule, repair, useSmoke, smokeBlocks, ricochet, side, damage, spread };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else scope.IronSystems = api;
})(typeof window !== 'undefined' ? window : globalThis);
