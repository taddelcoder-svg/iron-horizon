/* Shared, deterministic match rules; also executable in Node for tests. */
(function (scope) {
  'use strict';
  class Match {
    constructor() { this.time = 420; this.tickets = { blue: 100, red: 100 }; this.owner = null; this.progress = 0; this.contested = false; this.result = null; this.drain = 0; }
    update(dt, blue, red) {
      if (this.result) return;
      this.time = Math.max(0, this.time - dt); this.contested = blue > 0 && red > 0;
      const team = blue > 0 ? 'blue' : red > 0 ? 'red' : null;
      if (team && !this.contested) {
        const sign = team === 'blue' ? 1 : -1;
        if (this.owner && this.owner !== team) {
          this.progress += sign * dt / 5;
          if (this.progress * sign >= 0) { this.owner = null; this.progress = 0; }
        } else if (!this.owner) {
          this.progress = Math.max(-1, Math.min(1, this.progress + sign * dt / 10));
          if (Math.abs(this.progress) >= 1) this.owner = team;
        } else this.progress = sign;
      }
      if (this.owner && !this.contested) {
        this.drain += dt;
        while (this.drain >= 2) { this.drain -= 2; this.lose(this.owner === 'blue' ? 'red' : 'blue', 1); }
      } else this.drain = 0;
      this.finish();
    }
    lose(team, amount = 5) { if (this.result) return; this.tickets[team] = Math.max(0, this.tickets[team] - amount); this.finish(); }
    finish() {
      if (this.result) return;
      if (this.time <= 0 || this.tickets.blue <= 0 || this.tickets.red <= 0) this.result = this.tickets.blue === this.tickets.red ? 'draw' : this.tickets.blue > this.tickets.red ? 'blue' : 'red';
    }
  }
  // Grid search uses inflated static obstacles. Dynamic vehicles are avoided locally.
  function findPath(start, goal, blocked, cell = 6, bound = 138) {
    const width = Math.floor(bound * 2 / cell) + 1;
    const grid = point => ({ x: Math.max(0, Math.min(width - 1, Math.round((point.x + bound) / cell))), z: Math.max(0, Math.min(width - 1, Math.round((point.z + bound) / cell))) });
    const world = point => ({ x: point.x * cell - bound, z: point.z * cell - bound });
    const source = grid(start), end = grid(goal), id = p => p.z * width + p.x;
    const queue = [source], previous = new Map([[id(source), null]]); let reached = null;
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      if (current.x === end.x && current.z === end.z) { reached = current; break; }
      for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const next = { x: current.x + dx, z: current.z + dz }, key = id(next);
        if (next.x < 0 || next.z < 0 || next.x >= width || next.z >= width || previous.has(key)) continue;
        const position = world(next);
        if (blocked(position.x, position.z)) continue;
        previous.set(key, current); queue.push(next);
      }
    }
    if (!reached) return [];
    const path = [];
    while (previous.get(id(reached))) { path.push(world(reached)); reached = previous.get(id(reached)); }
    return path.reverse();
  }
  const api = { Match, findPath };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.IronBattle = api;
})(typeof window !== 'undefined' ? window : globalThis);
