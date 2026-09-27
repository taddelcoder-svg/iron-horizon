const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('./career.js');
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }; };
test('completed match rewards and statistics are deterministic', () => {
  const initial = C.empty(), earned = C.award(initial, 'round-1', 'blue', { kills: 2, hits: 7, deaths: 1, captureSeconds: 23.8 });
  assert.equal(earned.xp, 589); assert.equal(initial.xp, 0); assert.equal(earned.state.wins, 1); assert.equal(earned.state.matches, 1);
  assert.equal(earned.state.captureSeconds, 23); assert.deepEqual(earned.unlocks.map(p => p.id), ['sand']); assert.equal(C.rank(589).current.name, 'Fahrer');
  assert.equal(C.rewards('red', {}).xp, 100); assert.equal(C.rewards('draw', {}).xp, 200);
});
test('same round cannot award twice, including across store instances', () => {
  const storage = memory(), a = new C.Store(storage), b = new C.Store(storage);
  a.award('same-round', 'blue', {}); const duplicate = b.award('same-round', 'blue', {});
  assert.equal(duplicate.duplicate, true); assert.equal(b.state.xp, 300); assert.equal(b.state.matches, 1);
});
test('cosmetic selection is gated by experience and independent per vehicle', () => {
  const store = new C.Store(memory()); assert.equal(store.choose('luchs', 'forest'), false);
  store.award('one', 'blue', { kills: 4 }); assert.equal(store.choose('keiler', 'sand'), true);
  assert.equal(store.state.paints.keiler, 'sand'); assert.equal(store.state.paints.luchs, 'olive');
  assert.equal(store.choose('unknown', 'olive'), false);
});
test('imports validate schema, consistency and paint unlocks without mutating source', () => {
  const valid = C.empty(); assert.deepEqual(C.validate(JSON.parse(JSON.stringify(valid))), valid);
  assert.throws(() => C.validate({ ...valid, xp: -1 })); assert.throws(() => C.validate({ ...valid, version: 9 }));
  assert.throws(() => C.validate({ ...valid, wins: 1 })); assert.throws(() => C.validate({ ...valid, paints: { luchs: 'winter', keiler: 'olive' } }));
  assert.throws(() => C.validate({ ...valid, recentRounds: ['<script>'] })); assert.throws(() => C.validate({ ...valid, xp: Infinity }));
});
test('unavailable storage preserves rewards for export in this session', () => {
  const store = new C.Store({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
  const first = store.award('one', 'blue', {}); assert.equal(first.saved, false); assert.equal(store.state.xp, 300);
  store.award('two', 'draw', {}); assert.equal(store.state.xp, 500); assert.ok(store.warning);
});
test('malformed stored data is not silently overwritten', () => {
  const storage = memory(); storage.setItem(C.KEY, '{bad json'); const store = new C.Store(storage);
  store.award('one', 'blue', {}); assert.equal(storage.getItem(C.KEY), '{bad json'); assert.equal(store.state.xp, 300);
  assert.equal(store.commit(C.empty(), true), true); assert.equal(JSON.parse(storage.getItem(C.KEY)).xp, 0);
});
test('the Ass difficulty adds a quarter on top; lower levels do not', () => {
  const stats = { kills: 2, hits: 7, captureSeconds: 23 };
  assert.equal(C.rewards('blue', stats).xp, 589); assert.equal(C.rewards('blue', stats, 'recruit').xp, 589);
  const ace = C.rewards('blue', stats, 'ace'); assert.equal(ace.breakdown.difficulty, 147); assert.equal(ace.xp, 736);
  assert.equal(C.award(C.empty(), 'r', 'blue', stats, 'ace').state.xp, 736);
});
test('old saves without Dachs, awards or map wins still load', () => {
  const old = { ...C.empty() }; delete old.awards; delete old.mapWins; delete old.bounced; old.paints = { luchs: 'olive', keiler: 'olive' };
  const clean = C.validate(old); assert.equal(clean.paints.dachs, 'olive'); assert.deepEqual(clean.awards, []); assert.equal(clean.mapWins.valley, 0);
});
test('awards: first win, triple, flawless, Ass-Sieg unlocks the Swimming Lions paint', () => {
  const earned = C.award(C.empty(), 'a', 'blue', { kills: 3, deaths: 0 }, 'ace', 'quarry');
  assert.deepEqual(earned.awards.map(a => a.id), ['first-win', 'triple', 'flawless', 'ace-win']);
  assert.ok(earned.unlocks.some(p => p.id === 'lions')); assert.equal(earned.state.mapWins.quarry, 1);
  const store = new C.Store(memory()); assert.equal(store.choose('dachs', 'lions'), false);
  store.award('b', 'blue', {}, 'ace', 'border'); assert.equal(store.choose('dachs', 'lions'), true);
  assert.throws(() => C.validate({ ...C.empty(), paints: { luchs: 'lions', keiler: 'olive', dachs: 'olive' } }));
});
test('awards: map tour, thick skin and field repairs accumulate across rounds', () => {
  let state = C.empty();
  state = C.award(state, 'r1', 'blue', { bounced: 6 }, 'veteran', 'border').state;
  state = C.award(state, 'r2', 'blue', { bounced: 5, fieldRepairs: 1 }, 'veteran', 'quarry').state;
  assert.ok(state.awards.includes('thick-skin') && state.awards.includes('field-repair') && !state.awards.includes('all-maps'));
  const last = C.award(state, 'r3', 'blue', {}, 'veteran', 'valley'); assert.ok(last.awards.some(a => a.id === 'all-maps'));
  assert.equal(C.award(last.state, 'r4', 'red', { soloCaptures: 1 }, 'recruit', 'valley').awards[0].id, 'solo-capture');
});
test('the Dachs needs rank Frontkämpfer for battles', () => {
  assert.equal(C.vehicleUnlocked('dachs', 1199), false); assert.equal(C.vehicleUnlocked('dachs', 1200), true); assert.equal(C.vehicleUnlocked('luchs', 0), true);
});
