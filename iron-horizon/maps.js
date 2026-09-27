/* Map geometry and tactical locations share one source for rendering and navigation. */
(function (scope) {
  'use strict';
  const levels = {
    border: {
      id: 'border', name: 'Grenzposten', number: '01', description: 'Dorfstraßen, Häuserdeckung und offene Flanken.', theme: 'forest', seed: 713,
      ground: '#737d58', sky: '#abb6a6', road: '#999779', wall: '#a39b7e', roof: '#595e4e', fog: .0033,
      capture: { x: 0, z: -10, radius: 17 }, playerStart: [0, 65], playerRespawn: [0, 90],
      spawns: [[-12, 85], [12, 85], [-12, -100], [0, -100], [12, -100]],
      goals: [[-8, -5], [8, -5], [-8, -17], [0, -20], [8, -17]],
      training: [[0, 3], [-25, 21], [28, -29], [-52, -48], [62, 43]],
      roads: [[0, 0, 22, 304], [0, 38, 304, 17], [0, 63, 36, 32]],
      structures: [
        ['house', -35, -12, 17, 12, 7], ['house', 35, 8, 13, 14, 6], ['house', -42, -74, 20, 16, 8], ['house', 40, -66, 16, 13, 7], ['house', 83, -15, 21, 14, 5],
        ['wall', -20, 46, 12, 2, 1.9], ['wall', 21, 58, 10, 2, 1.9], ['wall', -18, -48, 2, 18, 1.9], ['wall', 22, -39, 13, 2, 1.9], ['wall', 60, 14, 2, 15, 1.9]
      ]
    },
    quarry: {
      id: 'quarry', name: 'Steinbruch', number: '02', description: 'Felsriegel teilen den Anmarsch. Nutze die seitlichen Zufahrten.', theme: 'quarry', seed: 1907,
      ground: '#ad9776', sky: '#cebda3', road: '#c1af8d', wall: '#928675', roof: '#5b6259', fog: .0025,
      capture: { x: 24, z: -4, radius: 17 }, playerStart: [24, 100], playerRespawn: [24, 108],
      spawns: [[12, 96], [36, 96], [12, -100], [24, -100], [36, -100]],
      goals: [[16, 1], [32, 1], [16, -11], [24, -14], [32, -11]],
      training: [[24, 66], [-6, 60], [54, 20], [66, -8], [-6, -42]],
      roads: [[24, 0, 18, 270], [-6, 0, 12, 230], [54, 0, 12, 230], [24, -4, 132, 16], [24, 100, 48, 24], [24, -100, 48, 24]],
      structures: [
        ['rock', 24, 40, 22, 12, 6], ['rock', 24, -48, 22, 12, 6],
        ['house', -30, 38, 24, 22, 7], ['house', 78, -46, 24, 22, 7],
        ['rock', -48, -28, 14, 60, 14], ['rock', 96, 20, 14, 60, 14],
        ['rock', 68, 65, 18, 18, 7], ['rock', -20, -73, 18, 18, 7],
        ['wall', -3, -6, 10, 4, 2.2], ['wall', 51, -2, 10, 4, 2.2],
        ['silo', -76, 60, 10, 10, 15], ['silo', -76, 43, 10, 10, 13],
        ['crane', 82, 50, 4, 4, 18]
      ]
    }
  };
  function blocked(level, x, z, radius = 2.8) {
    if (Math.abs(x) > 146 || Math.abs(z) > 146) return true;
    return level.structures.some(([, cx, cz, w, d]) => Math.max(Math.abs(x - cx) - w / 2, 0) ** 2 + Math.max(Math.abs(z - cz) - d / 2, 0) ** 2 < radius ** 2);
  }
  const api = { levels, blocked };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else scope.IronMaps = api;
})(typeof window !== 'undefined' ? window : globalThis);
