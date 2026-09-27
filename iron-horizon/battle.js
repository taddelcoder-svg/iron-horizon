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
  // Durchbruch: attackers take the points one after another; defenders win on time or when the
  // attackers run out of tickets. Same update/lose interface as Match so the game treats both alike.
  class Breakthrough {
    constructor(attacker = 'blue', stages = 2) {
      this.mode = 'breakthrough'; this.attacker = attacker; this.defender = attacker === 'blue' ? 'red' : 'blue'; this.stages = stages;
      this.stage = 0; this.time = 300; this.tickets = { [this.attacker]: Breakthrough.TICKETS, [this.defender]: Infinity };
      this.owner = this.defender; this.progress = 0; this.contested = false; this.result = null; this.captured = 0;
    }
    update(dt, blue, red) {
      if (this.result) return;
      this.time = Math.max(0, this.time - dt);
      const attackers = this.attacker === 'blue' ? blue : red, defenders = this.attacker === 'blue' ? red : blue;
      // Attackers need at least twice the defenders in the circle: 10 s alone, 30 s against a defence.
      // A stronger defence freezes the capture; progress slowly drains when the attackers leave.
      const pushing = attackers > 0 && attackers >= defenders * 2;
      this.contested = attackers > 0 && defenders > 0 && !pushing;
      if (pushing) this.progress = Math.min(1, this.progress + dt / (defenders ? 30 : 10));
      else if (!attackers) this.progress = Math.max(0, this.progress - dt / 20);
      if (this.progress >= 1) {
        this.stage++; this.captured++; this.progress = 0;
        if (this.stage >= this.stages) this.result = this.attacker; else this.time += 180;
      }
      this.finish();
    }
    // 100 tickets = 20 losses; tuned with the balance tournament so attackers win about half their matches.
    static get TICKETS() { return 100; }
    lose(team, amount = 5) { if (this.result || team !== this.attacker) return; this.tickets[team] = Math.max(0, this.tickets[team] - amount); this.finish(); }
    finish() {
      if (this.result) return;
      if (this.time <= 0 || this.tickets[this.attacker] <= 0) this.result = this.defender;
    }
  }
  // Nearest free spot on a spiral around (x, z); used to fit generated positions into any map.
  function freeNear(x, z, blocked, step = 3, rings = 8) {
    if (!blocked(x, z)) return [x, z];
    for (let ring = 1; ring <= rings; ring++) for (let i = 0; i < ring * 8; i++) {
      const angle = i / (ring * 8) * Math.PI * 2, px = x + Math.cos(angle) * ring * step, pz = z + Math.sin(angle) * ring * step;
      if (!blocked(px, pz)) return [Math.round(px * 10) / 10, Math.round(pz * 10) / 10];
    }
    return [x, z];
  }
  // Positions around an objective. side = +1 when the team comes from +z, -1 from -z.
  function pointLayout(point, side) {
    const { x, z } = point;
    return {
      slots: [[x - 7, z + 5 * side], [x + 7, z + 5 * side], [x, z + 5 * side]],
      holds: [[x - 22, z + 20 * side], [x + 22, z + 20 * side], [x, z + 30 * side]],
      spawns: [[x - 12, z + 34 * side], [x + 12, z + 34 * side], [x, z + 38 * side]]
    };
  }
  // Grid offset so that grid lines pass through the given point (the objective).
  function gridShift(cell, bound, through) {
    const shift = value => ((value + bound) % cell + cell) % cell;
    return through ? { x: shift(through.x), z: shift(through.z) } : { x: 0, z: 0 };
  }
  // A* over a grid of inflated static obstacles, eight directions without cutting corners.
  // Dynamic vehicles are avoided locally by the game. `through` (the objective) puts grid lines through
  // that point, so the grid is the same for both teams on mirrored and point-symmetric maps.
  function findPath(start, goal, blocked, cell = 6, bound = 136, through = null) {
    const width = Math.floor(bound * 2 / cell) + 1, shift = gridShift(cell, bound, through);
    const grid = point => ({ x: Math.max(0, Math.min(width - 1, Math.round((point.x - shift.x + bound) / cell))), z: Math.max(0, Math.min(width - 1, Math.round((point.z - shift.z + bound) / cell))) });
    const world = point => ({ x: point.x * cell - bound + shift.x, z: point.z * cell - bound + shift.z });
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
  // Bot difficulty: reaction time range (s), extra aim error (rad), extra reload time on top of the tank's
  // own (s, plus up to 1 s at random) and which tactics are allowed. The reload is the strongest lever.
  const difficulties = Object.freeze({
    recruit: Object.freeze({ id: 'recruit', name: 'Rekrut', reaction: [1.2, 1.8], error: .022, reload: 1.4, flank: false, smoke: false, lowAim: false, xp: 1 }),
    veteran: Object.freeze({ id: 'veteran', name: 'Veteran', reaction: [.8, 1.3], error: .011, reload: 1, flank: true, smoke: true, lowAim: false, xp: 1 }),
    ace: Object.freeze({ id: 'ace', name: 'Ass', reaction: [.55, .85], error: .007, reload: .8, flank: true, smoke: true, lowAim: true, xp: 1.25 })
  });
  const sideText = { FRONT: 'in die Front', SEITE: 'in die Seite', HECK: 'ins Heck' };
  // Picks the one moment of the round worth retelling, plus one concrete tip.
  // events: player kills { type: 'kill', victim, vehicle, where, distance, zone }, solo captures { type: 'capture' },
  // deaths { type: 'death', where }. zone = the kill relieved pressure on point A.
  function keyMoment(events, stats, result) {
    let best = null, bestScore = 0;
    for (const event of events) {
      let score = 0;
      if (event.type === 'kill') score = 1 + (event.zone ? 2.5 : 0) + (event.distance >= 70 ? 1 : 0) + (event.where !== 'FRONT' ? .5 : 0);
      else if (event.type === 'capture') score = 3;
      if (score > bestScore) { best = event; bestScore = score; }
    }
    let moment = null;
    if (best?.type === 'capture') moment = 'Du hast Punkt A allein erobert.';
    else if (best) moment = `Dein Treffer ${sideText[best.where] || ''} von ${best.victim} (${best.vehicle}) aus ${Math.round(best.distance)} m ${best.zone ? 'hat Punkt A entlastet.' : 'war dein bester Schuss.'}`.replace('  ', ' ');
    const flanked = events.filter(e => e.type === 'death' && e.where !== 'FRONT').length;
    let tip = null;
    if ((stats.ricochets || 0) >= 3) tip = `${stats.ricochets} Abpraller: Ziele möglichst senkrecht auf die Panzerung.`;
    else if (flanked >= 2) tip = `Du wurdest ${flanked}× von der Seite oder von hinten ausgeschaltet. Behalte deine Flanken im Blick.`;
    else if (result === 'red' && (stats.captureSeconds || 0) < 15) tip = 'Punkt A entscheidet: Solange der Gegner ihn hält, verliert dein Team laufend Tickets.';
    else if (!(stats.kills || 0) && (stats.hits || 0) >= 3) tip = 'Viele Treffer, kein Abschuss: Seite und Heck nehmen deutlich mehr Schaden als die Front.';
    return { moment, tip };
  }
  const api = { Match, Breakthrough, freeNear, pointLayout, gridShift, findPath, smoothPath, clearLine, botObjective, difficulties, keyMoment };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.IronBattle = api;
})(typeof window !== 'undefined' ? window : globalThis);
