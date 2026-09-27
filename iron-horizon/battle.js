/* Shared, deterministic match rules, navigation and bot tactics; also executable in Node for tests. */
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
  // A* over a grid of inflated static obstacles, eight directions without cutting corners.
  // Dynamic vehicles are avoided locally by the game.
  function findPath(start, goal, blocked, cell = 6, bound = 138) {
    const width = Math.floor(bound * 2 / cell) + 1;
    const grid = point => ({ x: Math.max(0, Math.min(width - 1, Math.round((point.x + bound) / cell))), z: Math.max(0, Math.min(width - 1, Math.round((point.z + bound) / cell))) });
    const world = point => ({ x: point.x * cell - bound, z: point.z * cell - bound });
    const source = grid(start), end = grid(goal), id = p => p.z * width + p.x;
    const free = new Map(), isFree = (x, z) => {
      if (x < 0 || z < 0 || x >= width || z >= width) return false;
      const key = z * width + x;
      if (!free.has(key)) { const p = world({ x, z }); free.set(key, !blocked(p.x, p.z)); }
      return free.get(key);
    };
    if (!isFree(end.x, end.z)) return [];
    const heuristic = p => { const dx = Math.abs(p.x - end.x), dz = Math.abs(p.z - end.z); return Math.max(dx, dz) + .4142 * Math.min(dx, dz); };
    const cost = new Map([[id(source), 0]]), previous = new Map([[id(source), null]]), closed = new Set();
    const open = [{ node: source, f: heuristic(source) }];
    let reached = null;
    while (open.length) {
      let best = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
      const { node: current } = open[best]; open[best] = open[open.length - 1]; open.pop();
      const currentId = id(current);
      if (closed.has(currentId)) continue;
      closed.add(currentId);
      if (current.x === end.x && current.z === end.z) { reached = current; break; }
      for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const next = { x: current.x + dx, z: current.z + dz }, key = id(next);
        if (closed.has(key) || !isFree(next.x, next.z)) continue;
        if (dx && dz && (!isFree(current.x + dx, current.z) || !isFree(current.x, current.z + dz))) continue;
        const g = cost.get(currentId) + (dx && dz ? 1.4142 : 1);
        if (cost.has(key) && cost.get(key) <= g) continue;
        cost.set(key, g); previous.set(key, current); open.push({ node: next, f: g + heuristic(next) });
      }
    }
    if (!reached) return [];
    const path = [];
    while (previous.get(id(reached))) { path.push(world(reached)); reached = previous.get(id(reached)); }
    return path.reverse();
  }
  function clearLine(a, b, blocked, step = 1) {
    const length = Math.hypot(b.x - a.x, b.z - a.z), samples = Math.max(1, Math.ceil(length / step));
    for (let i = 1; i <= samples; i++) if (blocked(a.x + (b.x - a.x) * i / samples, a.z + (b.z - a.z) * i / samples)) return false;
    return true;
  }
  // Removes zig-zag grid corners: keep only waypoints needed to steer around obstacles.
  function smoothPath(start, path, blocked) {
    const result = []; let anchor = start, index = 0;
    while (index < path.length) {
      let furthest = index;
      for (let j = path.length - 1; j > index; j--) if (clearLine(anchor, path[j], blocked)) { furthest = j; break; }
      result.push(path[furthest]); anchor = path[furthest]; index = furthest + 1;
    }
    return result;
  }
  // Decides where a bot drives next. Pure so the tactics can be tested without rendering.
  // ctx: { team, position, hp, threatened, guard, owner, contested, progress, capture, slot, hold, flank }
  function botObjective(ctx) {
    const sign = ctx.team === 'blue' ? 1 : -1;
    const toZone = Math.hypot(ctx.position.x - ctx.capture.x, ctx.position.z - ctx.capture.z);
    const secured = ctx.owner === ctx.team && !ctx.contested && ctx.progress * sign >= .999;
    if (ctx.hp < 35 && ctx.threatened && ctx.hold && !(ctx.guard && secured)) return { kind: 'retreat', point: ctx.hold };
    if (secured && !ctx.guard && ctx.hold) return { kind: 'hold', point: ctx.hold };
    if (ctx.flank && toZone > ctx.capture.radius + 25) return { kind: 'flank', point: ctx.flank };
    return { kind: 'capture', point: ctx.slot };
  }
  const api = { Match, findPath, smoothPath, clearLine, botObjective };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.IronBattle = api;
})(typeof window !== 'undefined' ? window : globalThis);
