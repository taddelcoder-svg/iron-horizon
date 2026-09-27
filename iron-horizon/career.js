/* Persistent cosmetic progression. No vehicle combat values depend on this state. */
(function (scope) {
  'use strict';
  const KEY = 'iron-horizon-career-v1';
  const paints = Object.freeze([
    { id: 'olive', name: 'Dienstoliv', xp: 0, colors: ['#737c50'] },
    { id: 'sand', name: 'Wüstensand', xp: 500, colors: ['#c0ad79', '#958562'] },
    { id: 'forest', name: 'Waldtarn', xp: 1200, colors: ['#65724b', '#344637', '#96845e'] },
    { id: 'winter', name: 'Wintertarn', xp: 2200, colors: ['#d4d8c9', '#89978a', '#485b52'] }
  ]);
  const ranks = [{ name: 'Rekrut', xp: 0 }, { name: 'Fahrer', xp: 500 }, { name: 'Frontkämpfer', xp: 1200 }, { name: 'Veteran', xp: 2200 }, { name: 'Panzer-Ass', xp: 3500 }];
  function empty() { return { format: 'iron-horizon', version: 1, xp: 0, matches: 0, wins: 0, draws: 0, kills: 0, hits: 0, deaths: 0, captureSeconds: 0, bestXp: 0, paints: { luchs: 'olive', keiler: 'olive' }, recentRounds: [] }; }
  function validate(value) {
    if (!value || value.format !== 'iron-horizon' || value.version !== 1) throw new Error('Das ist kein unterstützter Iron-Horizon-Spielstand.');
    const clean = empty();
    for (const field of ['xp', 'matches', 'wins', 'draws', 'kills', 'hits', 'deaths', 'captureSeconds', 'bestXp']) {
      if (!Number.isSafeInteger(value[field]) || value[field] < 0 || value[field] > 1000000000) throw new Error(`Ungültiger Spielstand: ${field}.`);
      clean[field] = value[field];
    }
    if (clean.wins + clean.draws > clean.matches || clean.bestXp > clean.xp) throw new Error('Die Statistik im Spielstand ist widersprüchlich.');
    for (const vehicle of ['luchs', 'keiler']) {
      const paint = paints.find(p => p.id === value.paints?.[vehicle]);
      if (!paint || paint.xp > clean.xp) throw new Error('Der Spielstand enthält eine ungültige oder gesperrte Tarnung.');
      clean.paints[vehicle] = paint.id;
    }
    if (!Array.isArray(value.recentRounds) || value.recentRounds.length > 64 || value.recentRounds.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))) throw new Error('Ungültige Gefechtskennung im Spielstand.');
    clean.recentRounds = [...new Set(value.recentRounds)]; return clean;
  }
  function rank(xp) { const index = ranks.findLastIndex(r => xp >= r.xp); return { current: ranks[Math.max(0, index)], next: ranks[index + 1] || null }; }
  // Harder bots pay more: the Ass level adds 25 % on top of the whole reward.
  const DIFFICULTY_BONUS = { recruit: 0, veteran: 0, ace: .25 };
  function rewards(result, stats, difficulty = 'veteran') {
    const safe = (value, maximum) => Math.min(maximum, Math.max(0, Math.floor(Number(value) || 0)));
    const breakdown = { participation: 100, outcome: result === 'blue' ? 200 : result === 'draw' ? 100 : 0, kills: safe(stats.kills, 100) * 75, hits: safe(stats.hits, 1000) * 10, objective: safe(stats.captureSeconds, 200) * 3 };
    const base = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    breakdown.difficulty = Math.round(base * (DIFFICULTY_BONUS[difficulty] || 0));
    return { breakdown, xp: base + breakdown.difficulty };
  }
  function award(state, roundId, result, stats, difficulty = 'veteran') {
    const next = validate(state);
    if (!['blue', 'red', 'draw'].includes(result) || !/^[a-zA-Z0-9_-]{1,100}$/.test(roundId)) throw new Error('Ungültiges Gefechtsergebnis.');
    if (next.recentRounds.includes(roundId)) return { state: next, xp: 0, breakdown: {}, unlocks: [], duplicate: true };
    const reward = rewards(result, stats, difficulty), oldXp = next.xp;
    next.xp += reward.xp; next.matches++; next.wins += result === 'blue' ? 1 : 0; next.draws += result === 'draw' ? 1 : 0;
    for (const field of ['kills', 'hits', 'deaths', 'captureSeconds']) next[field] += Math.min(100000, Math.max(0, Math.floor(Number(stats[field]) || 0)));
    next.bestXp = Math.max(next.bestXp, reward.xp); next.recentRounds.push(roundId); next.recentRounds = next.recentRounds.slice(-64);
    return { state: validate(next), ...reward, unlocks: paints.filter(p => p.xp > oldXp && p.xp <= next.xp), duplicate: false };
  }
  class Store {
    constructor(storage) { this.storage = storage; this.state = empty(); this.warning = ''; this.protected = false; this.read(); }
    read() {
      try {
        const raw = this.storage.getItem(KEY);
        if (raw) this.state = validate(JSON.parse(raw));
        this.warning = ''; this.protected = false;
      } catch (error) {
        this.warning = 'Lokaler Spielstand nicht verfügbar oder beschädigt. Fortschritt bleibt vorerst in dieser Sitzung; Export ist möglich.';
        this.protected = true;
      }
      return this.state;
    }
    commit(state, replace = false) {
      this.state = validate(state);
      if (this.protected && !replace) return false;
      try { this.storage.setItem(KEY, JSON.stringify(this.state)); this.protected = false; this.warning = ''; return true; }
      catch (_) { this.protected = true; this.warning = 'Speichern im Browser nicht möglich. Bitte sichere den Fortschritt per Export.'; return false; }
    }
    award(id, result, stats, difficulty) {
      if (!this.protected) this.read();
      const earned = award(this.state, id, result, stats, difficulty); earned.saved = this.commit(earned.state); return earned;
    }
    choose(vehicle, paintId) {
      if (!this.protected) this.read();
      const paint = paints.find(p => p.id === paintId);
      if (!['luchs', 'keiler'].includes(vehicle) || !paint || paint.xp > this.state.xp) return false;
      const next = validate(this.state); next.paints[vehicle] = paintId; this.commit(next); return true;
    }
  }
  const api = { KEY, paints, ranks, empty, validate, rank, rewards, award, Store };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else scope.IronCareer = api;
})(typeof window !== 'undefined' ? window : globalThis);
