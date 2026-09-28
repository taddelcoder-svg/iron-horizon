/* Persistent cosmetic progression. No vehicle combat values depend on this state. */
(function (scope) {
  'use strict';
  const KEY = 'iron-horizon-career-v1';
  const VEHICLES = ['luchs', 'keiler', 'dachs', 'wiesel', 'baer'], MAPS = ['border', 'quarry', 'valley'];
  // A paint unlocks either by experience (xp) or by earning an award.
  const paints = Object.freeze([
    { id: 'olive', name: 'Dienstoliv', xp: 0, colors: ['#737c50'] },
    { id: 'sand', name: 'Wüstensand', xp: 500, colors: ['#c0ad79', '#958562'] },
    { id: 'forest', name: 'Waldtarn', xp: 1200, colors: ['#65724b', '#344637', '#96845e'] },
    { id: 'winter', name: 'Wintertarn', xp: 2200, colors: ['#d4d8c9', '#89978a', '#485b52'] },
    { id: 'city', name: 'Stadtgrau', xp: 3500, colors: ['#8d918c', '#5c625f', '#b9bcb4'] },
    { id: 'lions', name: 'Swimming Lions', xp: 0, award: 'ace-win', colors: ['#1d3f63', '#e3a43b', '#f1e3c0'] }
  ]);
  const awards = Object.freeze([
    { id: 'first-win', name: 'Erster Sieg', text: 'Gewinne ein Gefecht.' },
    { id: 'triple', name: 'Dreifach', text: 'Drei Abschüsse in einem Gefecht.' },
    { id: 'solo-capture', name: 'Alleingang', text: 'Erobere einen Punkt ganz allein.' },
    { id: 'thick-skin', name: 'Dickes Fell', text: 'Zehn Abpraller an deiner Panzerung, über alle Gefechte.' },
    { id: 'field-repair', name: 'Schrauber', text: 'Repariere fertig, während ein Gegner auf dich zielt.' },
    { id: 'flawless', name: 'Unversehrt', text: 'Gewinne ein Gefecht ohne eigenen Verlust.' },
    { id: 'all-maps', name: 'Ortskundig', text: 'Gewinne auf allen drei Karten.' },
    { id: 'ace-win', name: 'Ass-Sieg', text: 'Gewinne gegen Ass-Gegner. Schaltet die Tarnung „Swimming Lions“ frei.' }
  ]);
  const ranks = [{ name: 'Rekrut', xp: 0 }, { name: 'Fahrer', xp: 500 }, { name: 'Frontkämpfer', xp: 1200 }, { name: 'Veteran', xp: 2200 }, { name: 'Panzer-Ass', xp: 3500 }];
  // Vehicles behind progress are always free in training; in battles they need a rank:
  // Wiesel from Fahrer, Dachs from Frontkämpfer, Bär from Veteran.
  const VEHICLE_XP = { luchs: 0, keiler: 0, wiesel: 500, dachs: 1200, baer: 2200 };
  function vehicleUnlocked(vehicle, xp) { return xp >= (VEHICLE_XP[vehicle] ?? Infinity); }
  function empty() { return { format: 'iron-horizon', version: 1, xp: 0, matches: 0, wins: 0, draws: 0, kills: 0, hits: 0, deaths: 0, captureSeconds: 0, bestXp: 0, bounced: 0, paints: { luchs: 'olive', keiler: 'olive', dachs: 'olive', wiesel: 'olive', baer: 'olive' }, awards: [], mapWins: { border: 0, quarry: 0, valley: 0 }, recentRounds: [] }; }
  function paintUnlocked(paint, state) { return paint.award ? state.awards.includes(paint.award) : state.xp >= paint.xp; }
  const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000;
  // Older saves (0.5–0.7) lack the Dachs paint, awards, map wins and ricochet count; they load with defaults.
  function validate(value) {
    if (!value || value.format !== 'iron-horizon' || value.version !== 1) throw new Error('Das ist kein unterstützter Iron-Horizon-Spielstand.');
    const clean = empty();
    for (const field of ['xp', 'matches', 'wins', 'draws', 'kills', 'hits', 'deaths', 'captureSeconds', 'bestXp']) {
      if (!count(value[field])) throw new Error(`Ungültiger Spielstand: ${field}.`);
      clean[field] = value[field];
    }
    if (clean.wins + clean.draws > clean.matches || clean.bestXp > clean.xp) throw new Error('Die Statistik im Spielstand ist widersprüchlich.');
    if (value.bounced !== undefined) { if (!count(value.bounced)) throw new Error('Ungültiger Spielstand: bounced.'); clean.bounced = value.bounced; }
    if (value.awards !== undefined) {
      if (!Array.isArray(value.awards) || value.awards.some(id => !awards.some(a => a.id === id))) throw new Error('Der Spielstand enthält eine unbekannte Auszeichnung.');
      clean.awards = awards.map(a => a.id).filter(id => value.awards.includes(id));
    }
    if (value.mapWins !== undefined) {
      for (const map of MAPS) { const wins = value.mapWins?.[map] ?? 0; if (!count(wins)) throw new Error('Ungültiger Spielstand: Kartensiege.'); clean.mapWins[map] = wins; }
      if (MAPS.reduce((sum, map) => sum + clean.mapWins[map], 0) > clean.wins) throw new Error('Die Statistik im Spielstand ist widersprüchlich.');
    }
    for (const vehicle of VEHICLES) {
      const id = value.paints?.[vehicle] ?? (['luchs', 'keiler'].includes(vehicle) ? undefined : 'olive');
      const paint = paints.find(p => p.id === id);
      if (!paint || !paintUnlocked(paint, clean)) throw new Error('Der Spielstand enthält eine ungültige oder gesperrte Tarnung.');
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
  // Awards earned by the state after this round (stats: kills, deaths, soloCaptures, fieldRepairs).
  function earnedAwards(state, result, stats, difficulty) {
    const won = result === 'blue', number = value => Math.max(0, Math.floor(Number(value) || 0));
    const checks = {
      'first-win': won, 'triple': number(stats.kills) >= 3, 'solo-capture': number(stats.soloCaptures) > 0,
      'thick-skin': state.bounced >= 10, 'field-repair': number(stats.fieldRepairs) > 0, 'flawless': won && number(stats.deaths) === 0,
      'all-maps': MAPS.every(map => state.mapWins[map] > 0), 'ace-win': won && difficulty === 'ace'
    };
    return awards.filter(a => checks[a.id] && !state.awards.includes(a.id));
  }
  function award(state, roundId, result, stats, difficulty = 'veteran', map = 'border') {
    const next = validate(state);
    if (!['blue', 'red', 'draw'].includes(result) || !/^[a-zA-Z0-9_-]{1,100}$/.test(roundId)) throw new Error('Ungültiges Gefechtsergebnis.');
    if (next.recentRounds.includes(roundId)) return { state: next, xp: 0, breakdown: {}, unlocks: [], awards: [], duplicate: true };
    const reward = rewards(result, stats, difficulty), before = { xp: next.xp, awards: [...next.awards] };
    next.xp += reward.xp; next.matches++; next.wins += result === 'blue' ? 1 : 0; next.draws += result === 'draw' ? 1 : 0;
    for (const field of ['kills', 'hits', 'deaths', 'captureSeconds', 'bounced']) next[field] += Math.min(100000, Math.max(0, Math.floor(Number(stats[field]) || 0)));
    if (result === 'blue' && MAPS.includes(map)) next.mapWins[map]++;
    next.bestXp = Math.max(next.bestXp, reward.xp); next.recentRounds.push(roundId); next.recentRounds = next.recentRounds.slice(-64);
    const newAwards = earnedAwards(next, result, stats, difficulty); next.awards = awards.map(a => a.id).filter(id => next.awards.includes(id) || newAwards.some(a => a.id === id));
    const unlocks = paints.filter(p => !paintUnlocked(p, before) && paintUnlocked(p, next));
    return { state: validate(next), ...reward, unlocks, awards: newAwards, duplicate: false };
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
    award(id, result, stats, difficulty, map) {
      if (!this.protected) this.read();
      const earned = award(this.state, id, result, stats, difficulty, map); earned.saved = this.commit(earned.state); return earned;
    }
    choose(vehicle, paintId) {
      if (!this.protected) this.read();
      const paint = paints.find(p => p.id === paintId);
      if (!VEHICLES.includes(vehicle) || !paint || !paintUnlocked(paint, this.state)) return false;
      const next = validate(this.state); next.paints[vehicle] = paintId; this.commit(next); return true;
    }
  }
  const api = { KEY, VEHICLES, VEHICLE_XP, MAPS, paints, awards, ranks, empty, validate, rank, rewards, award, paintUnlocked, vehicleUnlocked, Store };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else scope.IronCareer = api;
})(typeof window !== 'undefined' ? window : globalThis);
