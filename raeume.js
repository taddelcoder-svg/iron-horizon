'use strict';
// Online-Räume: Lobby mit Raumcode, freie Team- und Panzerwahl, Weiterleitung im Gefecht.
// Das Gefecht rechnet der Browser des Gastgebers; der Server verteilt nur Nachrichten:
// Eingaben der Mitspieler gehen an den Gastgeber, Lagebilder und Ereignisse des Gastgebers an alle anderen.
// Transportunabhängig: jedes Mitglied braucht nur send(text).
// Olympiade: Wer mit Ticket kommt, landet mit seiner ganzen Gruppe (Lauf + Gruppe) im selben Raum.
// Karte und Bots stehen im Ticket; sind alle Erwarteten da, startet das Gefecht nach kurzem Countdown.
// Jeder Spieler meldet am Ende seine eigenen Werte über /api/olymp (server.js), es gibt genau ein Gefecht.

const FAHRZEUGE = ['luchs', 'keiler', 'dachs', 'wiesel', 'baer'];
const KARTEN = ['border', 'quarry', 'valley'];
const MODI = ['domination', 'attack', 'defense', 'conquest', 'laststand'];
const STUFEN = ['recruit', 'veteran', 'ace'];
const MAX = 6;
// Sechs feste Plätze: Blau 0 (Mitte), 1, 2 · Rot 5 (Mitte), 3, 4. Spiegelpaare 0↔5, 1↔3, 2↔4.
const PLAETZE = { blue: [0, 1, 2], red: [5, 3, 4] };
const PARTNER = [5, 3, 4, 1, 2, 0];
const OLYMP_COUNTDOWN = 8000;
const HOST_VERSTECKT_MS = 2000;   // so lange darf der Tab des Gastgebers im Hintergrund sein, dann übernimmt jemand anderes
const OLYMP_WARTEN = 90_000;   // fehlt jemand, startet das Olympia-Gefecht spätestens so lange nach dem Öffnen des Raums

function raeume({ zufall = Math.random, olymp = null } = {}) {
  const liste = new Map(), olympRaeume = new Map();
  let naechsteId = 1;
  const code = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(zufall() * 23)]).join(''); } while (liste.has(c)); return c; };
  const name = n => String(n || '').replace(/[<>&"]/g, '').trim().slice(0, 14) || 'Spieler';
  const senden = (m, daten) => { try { m.send(JSON.stringify(daten)); } catch (_) { /* Verbindung schon zu */ } };

  function zustand(raum) {
    const o = raum.olymp, da = new Set(raum.members.map(m => m.olympId));
    return { t: 'room', code: raum.code, host: raum.host, phase: raum.phase, settings: raum.settings,
      members: raum.members.map(m => ({ id: m.id, name: m.name, team: m.team, vehicle: m.vehicle })),
      olymp: o ? { expected: o.t.m.map(e => ({ name: e.n, here: da.has(e.s) })), started: o.gestartet, startIn: o.startBis ? Math.max(0, o.startBis - Date.now()) : null } : null };
  }
  function verteilen(raum) { for (const m of raum.members) senden(m, { ...zustand(raum), you: m.id }); }
  // Neues Mitglied ins kleinere Team
  function freiesTeam(raum) {
    const blau = raum.members.filter(m => m.team === 'blue').length, rot = raum.members.length - blau;
    return blau <= rot ? 'blue' : 'red';
  }

  // Plätze beim Start: Menschen zuerst auf die Mitte, Bots füllen auf. Ein Bot fährt den Panzer
  // seines Spiegelpartners, sonst wird ein Paar ausgelost – so bleibt es fair.
  function aufstellung(raum) {
    const plaetze = Array.from({ length: 6 }, (_, slot) => ({ slot, human: null, name: null, vehicle: null }));
    for (const team of ['blue', 'red']) raum.members.filter(m => m.team === team).forEach((m, i) => Object.assign(plaetze[PLAETZE[team][i]], { human: m.id, name: m.name, vehicle: m.vehicle }));
    for (const p of plaetze) if (!p.human) {
      const partner = plaetze[PARTNER[p.slot]];
      p.vehicle = partner.vehicle || (partner.vehicle = FAHRZEUGE[Math.floor(zufall() * FAHRZEUGE.length)]);
    }
    return plaetze;
  }

  function starten(raum) {
    if (raum.phase !== 'lobby' || !raum.members.length || raum.olymp?.gestartet) return;
    raum.phase = 'battle'; raum.seed = Math.floor(zufall() * 2 ** 31) + 1;
    if (raum.olymp) { raum.olymp.gestartet = true; clearTimeout(raum.olymp.uhr); raum.olymp.uhr = null; raum.olymp.startBis = 0; olymp?.status(raum.olymp.t, raum.members.map(m => m.olympId).filter(Boolean), 'laeuft'); }
    const start = { t: 'start', slots: aufstellung(raum), settings: raum.settings, seed: raum.seed, host: raum.host };
    for (const x of raum.members) senden(x, { ...start, you: x.id });
    verteilen(raum); hostPruefen(raum);
  }
  // Olympia-Raum: sind alle Erwarteten da, startet das Gefecht nach dem Countdown von selbst.
  // Fehlt jemand, geht es spätestens OLYMP_WARTEN nach dem Öffnen des Raums los.
  function olympPruefen(raum) {
    const o = raum.olymp; if (!o || o.gestartet) return;
    const da = raum.members.map(m => m.olympId);
    olymp?.status(o.t, da, 'warten');
    let ziel = 0;
    if (raum.phase === 'lobby' && da.length) {
      ziel = o.spaetestens;
      if (o.t.m.every(e => da.includes(e.s))) ziel = Math.min(ziel, o.uhr && o.startBis < o.spaetestens ? o.startBis : Date.now() + OLYMP_COUNTDOWN);
    }
    if (ziel === o.startBis && (o.uhr || !ziel)) return;
    clearTimeout(o.uhr); o.uhr = null; o.startBis = 0;
    if (ziel) { o.startBis = ziel; o.uhr = setTimeout(() => { o.uhr = null; if (liste.get(raum.code) === raum) starten(raum); }, Math.max(0, ziel - Date.now())); o.uhr.unref?.(); }
    verteilen(raum);
  }
  function olympBeitreten(m, d) {
    const t = olymp?.ticketPruefen(d.ticket);
    if (!t) return senden(m, { t: 'error', text: 'Das Olympia-Ticket ist ungültig oder abgelaufen. Geh zurück zur Olympiade.' });
    const schluessel = t.l + ':' + t.g;
    let ziel = liste.get(olympRaeume.get(schluessel));
    if (!ziel) {
      const c = t.c || {};
      ziel = { code: code(), host: m.id, phase: 'lobby', members: [], olymp: { t, gestartet: false, uhr: null, startBis: 0, spaetestens: Date.now() + OLYMP_WARTEN },
        settings: { map: KARTEN.includes(c.karte) ? c.karte : 'border', mission: MODI.includes(c.modus) ? c.modus : 'domination', difficulty: STUFEN.includes(c.bots) ? c.bots : 'veteran' } };
      liste.set(ziel.code, ziel); olympRaeume.set(schluessel, ziel.code);
    }
    if (ziel.olymp.gestartet) return senden(m, { t: 'error', text: 'Die Olympia-Schlacht deiner Gruppe läuft schon oder ist vorbei.' });
    // Derselbe Spieler kommt wieder (neu geladen): alten Eintrag ersetzen
    for (const alt of ziel.members.filter(x => x.olympId === t.s && x !== m)) verlassen(alt);
    if (!liste.has(ziel.code)) { liste.set(ziel.code, ziel); olympRaeume.set(schluessel, ziel.code); }
    if (m.raum === ziel) return verteilen(ziel);
    if (ziel.members.length >= MAX) return senden(m, { t: 'error', text: 'Der Raum ist voll (6 Spieler).' });
    if (m.raum) verlassen(m);
    m.olympId = t.s; m.name = name(t.n); if (FAHRZEUGE.includes(d.vehicle)) m.vehicle = d.vehicle; m.team = freiesTeam(ziel);
    if (!ziel.members.length) ziel.host = m.id;
    ziel.members.push(m); m.raum = ziel; verteilen(ziel); olympPruefen(ziel);
  }

  // Gastgeber-Wechsel: Der Browser des Gastgebers rechnet Bots, Treffer und Punkte. Ist sein Tab
  // im Hintergrund (Handy weggelegt) oder ist er weg, übernimmt ein anderer mit dem letzten Lagebild.
  const sichtbar = (raum, ausser) => raum.members.find(x => x !== ausser && !x.versteckt);
  function hostWechseln(raum, neu, weg) {
    raum.host = neu.id;
    for (const x of raum.members) senden(x, { t: 'host', id: neu.id, left: weg ? weg.id : null });
  }
  function hostPruefen(raum) {
    const host = raum.members.find(x => x.id === raum.host);
    if (raum.phase !== 'battle' || !host || !host.versteckt) { clearTimeout(raum.hostUhr); raum.hostUhr = null; return; }
    if (raum.hostUhr) return;
    raum.hostUhr = setTimeout(() => {
      raum.hostUhr = null;
      const alt = raum.members.find(x => x.id === raum.host), neu = alt && sichtbar(raum, alt);
      if (liste.get(raum.code) !== raum || raum.phase !== 'battle' || !alt?.versteckt || !neu) return;
      hostWechseln(raum, neu, null); verteilen(raum);
    }, HOST_VERSTECKT_MS);
    raum.hostUhr.unref?.();
  }

  function verlassen(m) {
    const raum = m.raum; if (!raum) return;
    raum.members = raum.members.filter(x => x !== m); m.raum = null;
    if (!raum.members.length) {
      liste.delete(raum.code);
      if (raum.olymp) { clearTimeout(raum.olymp.uhr); olymp?.status(raum.olymp.t, [], 'warten'); }
      return;
    }
    olympPruefen(raum);
    if (raum.host === m.id) {
      const neu = sichtbar(raum) || raum.members[0];
      if (raum.phase === 'battle') hostWechseln(raum, neu, m);
      else raum.host = neu.id;
    } else if (raum.phase === 'battle') {
      const host = raum.members.find(x => x.id === raum.host); if (host) senden(host, { t: 'left', id: m.id });
    }
    verteilen(raum);
  }

  // Ein Mitglied verbinden. Rückgabe: Funktionen für eingehende Nachrichten und das Trennen.
  function verbinden(transport) {
    const m = { id: naechsteId++, name: 'Spieler', team: 'blue', vehicle: 'luchs', raum: null, send: t => transport.send(t) };
    const fehler = text => senden(m, { t: 'error', text });
    function nachricht(text) {
      let d; try { d = JSON.parse(text); } catch (_) { return; }
      if (!d || typeof d.t !== 'string') return;
      const raum = m.raum, istHost = raum && raum.host === m.id;
      switch (d.t) {
        case 'create': {
          if (raum) verlassen(m);
          const neu = { code: code(), host: m.id, phase: 'lobby', members: [], settings: { map: 'border', mission: 'domination', difficulty: 'veteran' } };
          liste.set(neu.code, neu); m.name = name(d.name); m.team = 'blue'; if (FAHRZEUGE.includes(d.vehicle)) m.vehicle = d.vehicle;
          neu.members.push(m); m.raum = neu; verteilen(neu); return;
        }
        case 'join': {
          const ziel = liste.get(String(d.code || '').toUpperCase().trim());
          if (!ziel) return fehler('Diesen Raum gibt es nicht.');
          if (ziel === raum) return;
          if (ziel.members.length >= MAX) return fehler('Der Raum ist voll (6 Spieler).');
          if (ziel.phase !== 'lobby') return fehler('In diesem Raum läuft gerade ein Gefecht. Versuch es gleich nochmal.');
          if (raum) verlassen(m);
          m.name = name(d.name); if (FAHRZEUGE.includes(d.vehicle)) m.vehicle = d.vehicle; m.team = freiesTeam(ziel);
          ziel.members.push(m); m.raum = ziel; verteilen(ziel); return;
        }
        case 'olymp': olympBeitreten(m, d); return;
        case 'leave': verlassen(m); senden(m, { t: 'room', code: null }); return;
        case 'sicht': m.versteckt = d.v === false; if (raum) hostPruefen(raum); return;
      }
      if (!raum) return;
      if (raum.phase === 'lobby') {
        if (d.t === 'team' && ['blue', 'red'].includes(d.team)) {
          if (raum.members.filter(x => x.team === d.team && x !== m).length >= 3) return fehler('Dieses Team ist schon voll.');
          m.team = d.team; verteilen(raum);
        } else if (d.t === 'vehicle' && FAHRZEUGE.includes(d.vehicle)) { m.vehicle = d.vehicle; verteilen(raum); }
        else if (d.t === 'name') { m.name = name(d.name); verteilen(raum); }
        else if (d.t === 'settings' && istHost && !raum.olymp) {
          const s = raum.settings;
          if (KARTEN.includes(d.map)) s.map = d.map;
          if (MODI.includes(d.mission)) s.mission = d.mission;
          if (STUFEN.includes(d.difficulty)) s.difficulty = d.difficulty;
          verteilen(raum);
        } else if (d.t === 'start' && istHost) starten(raum);
        return;
      }
      // Im Gefecht: Eingaben zum Gastgeber, Lagebilder und Ereignisse vom Gastgeber an alle anderen.
      if (d.t === 'in' && !istHost) { const host = raum.members.find(x => x.id === raum.host); if (host) senden(host, { ...d, from: m.id }); }
      else if ((d.t === 'snap' || d.t === 'ev') && istHost) { for (const x of raum.members) if (x !== m) senden(x, d); }
      else if (d.t === 'end' && istHost) { for (const x of raum.members) if (x !== m) senden(x, d); raum.phase = 'lobby'; verteilen(raum); }
    }
    return { nachricht, getrennt: () => verlassen(m), mitglied: m };
  }
  return { verbinden, liste, aufstellung };
}

module.exports = { raeume, PLAETZE, PARTNER };
