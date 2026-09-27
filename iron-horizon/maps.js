/* Map geometry and tactical locations share one source for rendering and navigation. */
(function (scope) {
  'use strict';
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const bump = (dx, dz, r) => Math.exp(-(dx * dx + dz * dz) / (r * r));
  // Flusstal relief, mirror-symmetric around the bridge (z = -10) so both teams get the same ground.
  const valleyPads = [[0, 80, 18], [0, -100, 18], [0, 65, 7], [0, -85, 7], [0, -10, 8], [0, 42, 13], [0, -62, 13]];
  function valleyHeight(x, z) {
    const zz = z + 10;
    let h = .8 * Math.sin(x * .05) * Math.cos(zz * .045);
    h += 6.5 * bump(x - 62, zz, 26) + 4.5 * bump(x - 58, zz - 36, 18) + 4.5 * bump(x - 58, zz + 36, 18);
    // Dry riverbed on the west flank, meandering but symmetric.
    const bed = -58 + 5 * Math.cos(zz * .035);
    h -= 3 * (1 - smooth(7, 19, Math.abs(x - bed)));
    // Creek across the middle; the stone bridge at x = 0 keeps the road level.
    h -= 1.6 * (1 - smooth(3, 11, Math.abs(zz))) * smooth(6, 16, Math.abs(x)) * smooth(-56, -34, x);
    for (const [px, pz, r] of valleyPads) h *= smooth(r, r + 10, Math.hypot(x - px, z - pz));
    return h * (1 - smooth(132, 148, Math.max(Math.abs(x), Math.abs(z))));
  }
  const levels = {
    border: {
      id: 'border', name: 'Grenzposten', number: '01', description: 'Dorfstraßen, Häuserdeckung und offene Flanken.', theme: 'forest', seed: 713,
      ground: '#737d58', sky: '#abb6a6', road: '#999779', wall: '#a39b7e', roof: '#595e4e', fog: .0033,
      capture: { x: 0, z: -10, radius: 17 }, playerStart: [0, 80], playerRespawn: [0, 80], trainingStart: [0, 65],
      // Slot pairs: blue bot 1 ↔ red bot 1 (left), blue bot 2 ↔ red bot 2 (right), player ↔ red bot 3 (centre).
      spawns: [[-12, 80], [12, 80], [-12, -100], [12, -100], [0, -100]],
      goals: [[-8, -5], [8, -5], [-8, -15], [8, -15], [0, -15]],
      training: [[0, 3], [-25, 21], [24, -26], [-52, -48], [62, 43]],
      // Team positions mirror each other around the objective so neither side reaches it earlier.
      // Overwatch positions once the point is secured, and wide flanking waypoints for fast tanks.
      holds: { blue: [[-22, 12], [22, 14], [0, 22]], red: [[-22, -32], [22, -34], [0, -42]] },
      flanks: { blue: [[-52, 18], [50, 28]], red: [[-52, -38], [50, -48]] },
      // Durchbruch: point B lies between A and the defenders' base.
      breakthrough: { red: { x: 0, z: -65, radius: 15 }, blue: { x: 0, z: 45, radius: 15 } },
      roads: [[0, 0, 22, 304], [0, 38, 304, 17], [0, 63, 36, 32]],
      structures: [
        ['house', -35, -12, 17, 12, 7], ['house', 35, 8, 13, 14, 6], ['house', -42, -74, 20, 16, 8], ['house', 40, -66, 16, 13, 7], ['house', 83, -15, 21, 14, 5],
        ['wall', -20, 46, 12, 2, 1.9], ['wall', 21, 58, 10, 2, 1.9], ['wall', -18, -48, 2, 18, 1.9], ['wall', 22, -39, 13, 2, 1.9], ['wall', 60, 14, 2, 15, 1.9],
        // Mirrored counterparts so both teams find the same cover near point A.
        ['house', 35, -28, 13, 14, 6]
      ]
    },
    quarry: {
      id: 'quarry', name: 'Steinbruch', number: '02', description: 'Felsriegel teilen den Anmarsch. Nutze die seitlichen Zufahrten.', theme: 'quarry', seed: 1907,
      ground: '#ad9776', sky: '#cebda3', road: '#c1af8d', wall: '#928675', roof: '#5b6259', fog: .0025,
      // Point-symmetric around A: red slot i is blue slot i turned by 180°, (x, z) -> (48 - x, -8 - z).
      symmetry: 'point',
      capture: { x: 24, z: -4, radius: 17 }, playerStart: [24, 92], playerRespawn: [24, 92], trainingStart: [24, 100],
      spawns: [[12, 92], [36, 92], [36, -100], [12, -100], [24, -100]],
      goals: [[16, 1], [32, 1], [32, -9], [16, -9], [24, -9]],
      training: [[24, 66], [-6, 60], [54, 20], [66, -8], [-6, -42]],
      holds: { blue: [[8, 22], [40, 22], [24, 28]], red: [[40, -30], [8, -30], [24, -36]] },
      flanks: { blue: [[-6, 40], [54, 40]], red: [[54, -48], [-6, -48]] },
      // B lies beside the rock bar, not in its shadow, so the attackers are not funnelled round it.
      breakthrough: { red: { x: 42, z: -68, radius: 14 }, blue: { x: 6, z: 60, radius: 14 } },
      roads: [[24, 0, 18, 270], [-6, 0, 12, 230], [54, 0, 12, 230], [24, -4, 132, 16], [24, 100, 48, 24], [24, -100, 48, 24]],
      structures: [
        ['rock', 24, 40, 22, 12, 6], ['rock', 24, -48, 22, 12, 6],
        ['house', -30, 38, 24, 22, 7], ['house', 78, -46, 24, 22, 7],
        ['rock', -48, -28, 14, 60, 14], ['rock', 96, 20, 14, 60, 14],
        ['rock', 68, 65, 18, 18, 7], ['rock', -20, -73, 18, 18, 7],
        ['wall', -3, -6, 10, 4, 2.2], ['wall', 51, -2, 10, 4, 2.2],
        ['silo', -76, 60, 10, 10, 15], ['silo', -76, 43, 10, 10, 13],
        ['crane', 82, 50, 4, 4, 18],
        // Counterparts on the red side (turned by 180°).
        ['silo', 124, -68, 10, 10, 15], ['silo', 124, -51, 10, 10, 13], ['crane', -34, -58, 4, 4, 18]
      ]
    },
    valley: {
      id: 'valley', name: 'Flusstal', number: '03', description: 'Hügelkamm im Osten, trockenes Flussbett im Westen, Steinbrücke in der Mitte.', theme: 'valley', seed: 2711,
      ground: '#6f7d54', sky: '#a9bcc0', road: '#9c9478', wall: '#9e9784', roof: '#5a5f55', fog: .003,
      heightAt: valleyHeight,
      capture: { x: 0, z: -10, radius: 17 }, playerStart: [0, 80], playerRespawn: [0, 80], trainingStart: [0, 65],
      spawns: [[-12, 80], [12, 80], [-12, -100], [12, -100], [0, -100]],
      goals: [[-12, 1], [12, 1], [-12, -21], [12, -21], [0, -15]],
      training: [[0, 22], [-30, 34], [34, 30], [-58, -10], [48, -14]],
      holds: { blue: [[-24, 16], [24, 16], [0, 26]], red: [[-24, -36], [24, -36], [0, -46]] },
      // West: through the dry riverbed. East: over the hill ridge.
      flanks: { blue: [[-58, 24], [62, 18]], red: [[-58, -44], [62, -38]] },
      breakthrough: { red: { x: 0, z: -62, radius: 14 }, blue: { x: 0, z: 42, radius: 14 } },
      roads: [[0, -10, 12, 210]],
      structures: [
        // Stone bridge parapets.
        ['wall', -7.5, -10, 1, 12, 1.3], ['wall', 7.5, -10, 1, 12, 1.3],
        ['house', -30, 5, 12, 10, 6], ['house', -30, -25, 12, 10, 6],
        ['wall', 27, 7, 10, 2, 1.9], ['wall', 27, -27, 10, 2, 1.9],
        ['house', 38, 52, 16, 12, 7], ['house', 38, -72, 16, 12, 7],
        ['house', -40, 58, 14, 12, 6], ['house', -40, -78, 14, 12, 6],
        ['rock', 64, -10, 10, 8, 4], ['rock', 47, 31, 8, 7, 3], ['rock', 47, -51, 8, 7, 3]
      ]
    }
  };
  function blocked(level, x, z, radius = 2.8) {
    if (Math.abs(x) > 146 || Math.abs(z) > 146) return true;
    return level.structures.some(([, cx, cz, w, d]) => Math.max(Math.abs(x - cx) - w / 2, 0) ** 2 + Math.max(Math.abs(z - cz) - d / 2, 0) ** 2 < radius ** 2);
  }
  // Ground height in metres; flat maps are 0 everywhere.
  function height(level, x, z) { return level.heightAt ? level.heightAt(x, z) : 0; }
  // The other team's counterpart of a position: mirrored across A (z only), or turned around A on point-symmetric maps.
  function mirror(level, x, z) {
    const { x: cx, z: cz } = level.capture;
    return [level.symmetry === 'point' ? 2 * cx - x : x, 2 * cz - z];
  }
  const api = { levels, blocked, height, mirror };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else scope.IronMaps = api;
})(typeof window !== 'undefined' ? window : globalThis);
