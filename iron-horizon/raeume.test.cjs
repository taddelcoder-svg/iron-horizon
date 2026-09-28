const { test } = require('node:test');
const assert = require('node:assert/strict');
const { raeume, PARTNER } = require('../raeume.js');

// Fake connection: records every message it receives.
function client(r) {
  const inbox = [], c = r.verbinden({ send: text => inbox.push(JSON.parse(text)) });
  return { ...c, inbox, send: data => c.nachricht(JSON.stringify(data)), last: t => [...inbox].reverse().find(m => m.t === t) };
}

test('create, join by code, teams are balanced and a full team refuses', () => {
  const r = raeume({ zufall: () => .3 }), a = client(r), b = client(r);
  a.send({ t: 'create', name: 'Anna', vehicle: 'keiler' });
  const code = a.last('room').code; assert.match(code, /^[A-Z]{4}$/);
  b.send({ t: 'join', code: code.toLowerCase(), name: 'Ben<script>' });
  const room = b.last('room');
  assert.equal(room.members.length, 2); assert.equal(room.members[1].name, 'Benscript'); assert.equal(room.members[1].team, 'red');
  assert.equal(room.you, b.mitglied.id); assert.equal(room.host, a.mitglied.id);
  const c = client(r), d = client(r); c.send({ t: 'join', code, name: 'C' }); d.send({ t: 'join', code, name: 'D' });
  b.send({ t: 'team', team: 'blue' }); c.send({ t: 'team', team: 'blue' });
  d.send({ t: 'team', team: 'blue' }); assert.match(d.last('error').text, /voll/);
  client(r).send({ t: 'join', code: 'ZZZZ' });
});

test('only the host changes settings and starts; everyone picks a vehicle freely', () => {
  const r = raeume({ zufall: () => .5 }), a = client(r), b = client(r);
  a.send({ t: 'create', name: 'A' }); const code = a.last('room').code; b.send({ t: 'join', code, name: 'B' });
  b.send({ t: 'settings', map: 'quarry' }); assert.equal(a.last('room').settings.map, 'border');
  a.send({ t: 'settings', map: 'valley', mission: 'attack', difficulty: 'ace' });
  assert.deepEqual(b.last('room').settings, { map: 'valley', mission: 'attack', difficulty: 'ace' });
  a.send({ t: 'vehicle', vehicle: 'dachs' }); b.send({ t: 'vehicle', vehicle: 'dachs' }); b.send({ t: 'team', team: 'blue' });
  b.send({ t: 'start' }); assert.equal(b.last('start'), undefined);
  a.send({ t: 'start' });
  const start = b.last('start'); assert.equal(start.host, a.mitglied.id);
  // Both humans on blue take the centre and the left slot; bots mirror their partner's tank.
  assert.equal(start.slots[0].human, a.mitglied.id); assert.equal(start.slots[1].human, b.mitglied.id);
  for (const s of start.slots) assert.equal(s.vehicle, start.slots[PARTNER[s.slot]].vehicle);
  assert.equal(start.slots[5].human, null); assert.equal(start.slots[5].vehicle, 'dachs');
  client(r).send({ t: 'join', code, name: 'late' });
});

test('in battle: inputs go to the host, snapshots to the others; leaving is handled', () => {
  const r = raeume(), a = client(r), b = client(r), c = client(r);
  a.send({ t: 'create', name: 'A' }); const code = a.last('room').code;
  b.send({ t: 'join', code, name: 'B' }); c.send({ t: 'join', code, name: 'C' }); a.send({ t: 'start' });
  b.send({ t: 'in', x: 1 }); assert.deepEqual(a.last('in'), { t: 'in', x: 1, from: b.mitglied.id }); assert.equal(c.last('in'), undefined);
  a.send({ t: 'snap', v: [1] }); assert.deepEqual(b.last('snap'), { t: 'snap', v: [1] }); assert.equal(a.last('snap'), undefined);
  b.send({ t: 'snap', v: [2] }); assert.deepEqual(c.last('snap'), { t: 'snap', v: [1] }, 'only the host may send snapshots');
  c.getrennt(); assert.deepEqual(a.last('left'), { t: 'left', id: c.mitglied.id });
  a.getrennt(); assert.match(b.last('closed').text, /Gastgeber/); assert.equal(b.last('room').host, b.mitglied.id); assert.equal(b.last('room').phase, 'lobby');
  b.getrennt(); assert.equal(r.liste.size, 0);
});

test('the host ends the battle and the room returns to the lobby', () => {
  const r = raeume(), a = client(r), b = client(r);
  a.send({ t: 'create', name: 'A' }); b.send({ t: 'join', code: a.last('room').code, name: 'B' }); a.send({ t: 'start' });
  a.send({ t: 'end', result: 'red' }); assert.deepEqual(b.last('end'), { t: 'end', result: 'red' }); assert.equal(b.last('room').phase, 'lobby');
});

test('Olympiade: a group meets in one room, settings come from the ticket, all present starts it once', async () => {
  const status = [], tickets = { A: 'a', B: 'b' };
  const olymp = {
    ticketPruefen: ticket => ticket === 'bad' ? null : { l: 'lauf1', g: 0, s: tickets[ticket] || ticket, n: ticket.toUpperCase(), m: [{ s: 'a', n: 'A' }, { s: 'b', n: 'B' }], c: { karte: 'valley', bots: 'ace' } },
    status: (t, da, phase) => status.push([da.length, phase])
  };
  const r = raeume({ olymp }), a = client(r), b = client(r), again = client(r);
  client(r).send({ t: 'olymp', ticket: 'bad' });
  a.send({ t: 'olymp', ticket: 'A', vehicle: 'dachs' });
  let room = a.last('room'); assert.deepEqual(room.settings, { map: 'valley', mission: 'domination', difficulty: 'ace' });
  assert.deepEqual(room.olymp.expected, [{ name: 'A', here: true }, { name: 'B', here: false }]); assert.equal(room.olymp.startIn, null);
  a.send({ t: 'settings', map: 'border' }); assert.equal(a.last('room').settings.map, 'valley', 'ticket settings are fixed');
  b.send({ t: 'olymp', ticket: 'B' }); room = b.last('room');
  assert.equal(room.code, a.last('room').code); assert.equal(room.members.find(m => m.name === 'B').team, 'red'); assert.ok(room.olymp.startIn > 0);
  again.send({ t: 'olymp', ticket: 'B' }); assert.equal(again.last('room').members.length, 2, 'a reload replaces the old connection');
  a.send({ t: 'start' }); const start = again.last('start'); assert.ok(start);
  assert.equal(start.slots.find(s => s.human === a.mitglied.id).vehicle, 'dachs');
  a.send({ t: 'end', result: 'blue' }); a.send({ t: 'start' });
  assert.equal(again.inbox.filter(m => m.t === 'start').length, 1, 'exactly one battle');
  const late = client(r); late.send({ t: 'olymp', ticket: 'A' }); assert.match(late.last('error').text, /läuft schon/);
  assert.ok(status.some(([, phase]) => phase === 'laeuft'));
});
