'use strict';
// Iron Horizon – Server: liefert nur die Spieldateien aus, hinter dem gemeinsamen Passwort (zugang.js).
// Das Gefecht selbst läuft komplett im Browser; der Server speichert keine Spieldaten.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zugang = require('./zugang')({ titel: 'Iron Horizon' });
const olymp = require('./olymp')({ spiel: 'ironhorizon' });

const PORT = Number(process.env.PORT) || 10400;
const HOST = process.env.HOST || '0.0.0.0';
const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json'
};

// Nur diese Dateiarten werden ausgeliefert (keine Tests, kein .git, keine Serverdateien).
const FREIGABEN = [
  /^\/iron-horizon\/[\w-]+\.(html|js|css|webmanifest)$/,
  /^\/iron-horizon\/vendor\/[\w.-]+\.(js|txt)$/,
  /^\/fonts\/[\w.-]+\.(woff2|txt)$/
];
function dateiFuer(pfad){
  if (pfad === '/datenschutz' || pfad === '/datenschutz.html') return 'datenschutz.html';
  if (pfad === '/iron-horizon/') return 'iron-horizon/index.html';
  return FREIGABEN.some(muster => muster.test(pfad)) && !pfad.includes('..') ? pfad.slice(1) : null;
}

function senden(res, datei, cache){
  const voll = path.join(__dirname, datei);
  fs.readFile(voll, (fehler, daten) => {
    if (fehler){ res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Nicht gefunden'); }
    res.writeHead(200, { 'Content-Type': TYPEN[path.extname(voll)] || 'application/octet-stream', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
    res.end(daten);
  });
}

/* Olympiade: Die Gefechts-Challenge läuft im Browser. Der meldet hier „bin da“ und am Ende
   seine Gefechtswerte; die Punktzahl rechnet der Server aus und schickt sie an die Olympiade.
   Pro Ticket zählt nur die erste Meldung (ein Versuch). */
const olympGemeldet = new Set();
function olympPunkte(e) {
  const zahl = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const kills = zahl(e.kills, 60), hits = zahl(e.hits, 400), deaths = zahl(e.deaths, 60), sekunden = zahl(e.captureSeconds, 1800);
  const sieg = e.result === 'blue', unentschieden = e.result === 'draw';
  const punkte = Math.max(0, (sieg ? 1000 : unentschieden ? 400 : 0) + kills * 300 + hits * 50 + sekunden * 5 - deaths * 150);
  const teile = [sieg ? 'Sieg' : unentschieden ? 'Unentschieden' : 'Niederlage', `${kills} ${kills === 1 ? 'Abschuss' : 'Abschüsse'}`];
  return { punkte, text: `${punkte.toLocaleString('de-DE')} Punkte · ${teile.join(' · ')}` };
}
function olympAnfrage(req, res) {
  let d = '';
  req.on('data', c => { d += c; if (d.length > 8000) req.destroy(); });
  req.on('end', () => {
    const antwort = (status, daten) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(daten)); };
    let m;
    try { m = JSON.parse(d); } catch (_) { return antwort(400, { fehler: 'JSON' }); }
    const t = olymp.ticketPruefen(m && m.ticket);
    if (!t) return antwort(403, { fehler: 'Das Olympia-Ticket ist ungültig oder abgelaufen.' });
    const schluessel = t.l + ':' + t.s;
    if (m.art === 'da') { olymp.da(t, t.s); return antwort(200, { ok: true, schonGespielt: olympGemeldet.has(schluessel) }); }
    if (m.art !== 'ergebnis' || !m.werte || typeof m.werte !== 'object') return antwort(400, { fehler: 'Meldung unvollständig' });
    const w = olympPunkte(m.werte);
    if (olympGemeldet.has(schluessel)) return antwort(409, { fehler: 'Dein Versuch ist schon gewertet.', ...w });
    olympGemeldet.add(schluessel);
    olymp.wertMelden(t, t.s, w.punkte, w.text);
    antwort(200, { ok: true, ...w });
  });
}

const server = http.createServer((req, res) => {
  let pfad;
  try { pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (_){ res.writeHead(400); return res.end('Ungültige Anfrage'); }
  if (req.method === 'GET' && pfad === '/healthz'){ res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":true}'); }
  if (req.method === 'GET' && pfad.startsWith('/datenschutz')) return senden(res, 'datenschutz.html', 'no-cache');
  if (req.method === 'POST' && pfad === '/api/olymp') return olympAnfrage(req, res);
  if (zugang.pruefen(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'HEAD'){ res.writeHead(405); return res.end(); }
  if (pfad === '/' || pfad === '/index.html' || pfad === '/iron-horizon'){ res.writeHead(302, { Location: '/iron-horizon/' }); return res.end(); }
  const datei = dateiFuer(pfad);
  if (datei) return senden(res, datei, /vendor|fonts/.test(datei) ? 'public, max-age=604800' : 'no-cache');
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Nicht gefunden');
});

server.listen(PORT, HOST, () => console.log(`Iron Horizon läuft auf http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/iron-horizon/`));
