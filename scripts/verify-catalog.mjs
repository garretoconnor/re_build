// Read the shipped catalog directly. Use the inventory only for the source pin and stable IDs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const inventory = JSON.parse(readFileSync(new URL('db/v0-inventory.json', root)));
const pin = inventory.source.revision;
assert.match(pin, /^[0-9a-f]{40}$/);
const source = execFileSync('git', ['show', pin + ':game/dist/engine.js'], {cwd: root});
const v0 = await import('data:text/javascript;base64,' + source.toString('base64'));
const db = new DatabaseSync(process.argv[2] ?? fileURLToPath(new URL('db/catalog.sqlite', root)), {readOnly: true});
const rows = (sql, ...params) => db.prepare(sql).all(...params);
const pairs = (sql, ...params) => Object.fromEntries(rows(sql, ...params).map(Object.values));
assert.deepEqual(rows('PRAGMA foreign_key_check'), []);
assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');

const slugs = Object.keys(v0.actions);
const ids = Object.fromEntries(slugs.map(slug => [slug, inventory.actions[slug].id]));
assert.deepEqual(rows('SELECT id FROM action').map(row => row.id).sort(), Object.values(ids).sort());
const actions = {};
for (const [slug, original] of Object.entries(v0.actions)) {
  const id = ids[slug];
  const row = db.prepare('SELECT * FROM action WHERE id=?').get(id);
  assert.deepEqual([row.name, row.description, row.duration_hours, row.reps_required, row.repeatable],
    [original.label, original.description, original.time, 1, Number(!original.once)], slug);
  const amounts = phase => pairs('SELECT stat_key, amount FROM action_stat WHERE action_id=? AND phase=?', id, phase);
  const action = {
    hours: row.duration_hours, repeatable: Boolean(row.repeatable),
    gates: rows('SELECT prerequisite_id FROM action_prerequisite WHERE action_id=?', id).map(r => r.prerequisite_id),
    required: pairs('SELECT stat_key, minimum FROM action_required_stat WHERE action_id=?', id),
    cost: amounts('cost'), bonus: amounts('bonus'), completion: amounts('completion'),
    benefits: rows('SELECT reward_stat, benefit_stat FROM action_beneficial_stat WHERE action_id=?', id).map(Object.values),
  };
  assert.deepEqual(action.cost, original.cost ?? {}, slug);
  assert.deepEqual(action.bonus, original.gain ?? {}, slug);
  assert.deepEqual(action.completion, slug === 'cultivate' ? {gathering: 6} : {}, slug);
  assert.deepEqual(action.benefits, slug === 'harvest' ? [['food', 'gathering']] : [], slug);
  assert.deepEqual(action.required, {}, slug);
  actions[slug] = action;
}

const baseKeys = ['defense', 'food', 'people', 'scrap'];
assert.deepEqual(rows('SELECT key FROM stat ORDER BY key').map(r => r.key), [...baseKeys, 'gathering'].sort());
assert.deepEqual(rows('SELECT id, name FROM character').map(Object.values), [[inventory.character.id, 'Noah']]);
const initial = pairs('SELECT stat_key, value FROM character_start_stat');
assert.deepEqual(initial, Object.fromEntries(baseKeys.map(k => [k, v0.fresh()[k]])));
const [[rulesId, budget]] = rows('SELECT id, time_budget_hours FROM run_rules').map(Object.values);
assert.equal(rows('SELECT id FROM run_rules').length, 1);
assert.equal(rulesId, inventory.rules.id);
assert.equal(budget, v0.WAVE_TIME);
const thresholds = pairs('SELECT stat_key, minimum FROM survival_minimum');
assert.deepEqual(thresholds, {defense: 12, people: 3});

function meets(stats, minimums) {
  return Object.entries(minimums).every(([k, min]) => (stats[k] ?? 0) >= min);
}
function pay(stats, action) {
  if (!meets(stats, action.required) || !meets(stats, action.cost)) return false;
  for (const [k, value] of Object.entries(action.cost)) stats[k] -= value;
  return true;
}
function finish(stats, action) {
  const gains = {...action.bonus};
  for (const [reward, skill] of action.benefits) gains[reward] += stats[skill] ?? 0;
  for (const phase of [gains, action.completion]) {
    for (const [k, amount] of Object.entries(phase)) stats[k] = (stats[k] ?? 0) + amount;
  }
}

// Compare every gate with the engine's real location/requires logic, including
// counterfactual completion sets so redundant direct gates are observable.
for (let mask = 0; mask < 2 ** slugs.length; mask++) {
  const s = v0.fresh();
  s.done = slugs.filter((_, i) => mask & (1 << i));
  s.discovered.push(...s.done.flatMap(k => v0.actions[k].reveal ?? []));
  s.food = s.scrap = 100;
  const done = new Set(s.done.map(k => ids[k]));
  for (const [slug, a] of Object.entries(actions)) {
    const open = a.gates.every(id => done.has(id)) && (a.repeatable || !done.has(ids[slug]));
    assert.equal(open, !v0.reason(s, slug), 'Unlock mismatch: ' + slug + ' after ' + s.done);
  }
}

function replay(route, elapsed = 0) {
  const s = v0.fresh();
  s.time = elapsed;
  const stats = {...initial};
  const done = new Set();
  const compareStats = () => {
    for (const key of baseKeys) assert.equal(stats[key], s[key], key + ' at hour ' + s.time);
  };
  for (const slug of route) {
    const a = actions[slug];
    assert.ok(a.gates.every(id => done.has(id)) && (a.repeatable || !done.has(ids[slug])), slug);
    assert.ok(pay(stats, a), slug);
    assert.ok(v0.start(s, slug), slug);
    compareStats();
    const step = Math.min(a.hours, budget - elapsed);
    elapsed += step;
    if (step === a.hours) {
      finish(stats, a);
      done.add(ids[slug]);
    }
    v0.advance(s, a.hours);
    assert.equal(elapsed, s.time);
    compareStats();
    assert.deepEqual(done, new Set(s.done.map(k => ids[k])));
  }
  if (elapsed < budget) v0.resolve(s);
  const outcome = meets(stats, thresholds) ? 'won' : 'lost';
  assert.equal(outcome, s.outcome);
  return {elapsed, stats, outcome};
}

const winning = ['salvage','shelter','scout','supplies','harvest','crossing','rescue','salvage','barricade','barricade'];
const win = replay(winning);
assert.deepEqual([win.elapsed, win.stats.defense, win.stats.people, win.outcome], [140, 15, 3, 'won']);
assert.equal(replay(winning, 20).outcome, 'won'); // Final barricade takes defense from 11 to 15.
assert.equal(replay(winning, 21).outcome, 'lost');
replay(['scout','salvage','harvest','cultivate','harvest','supplies']);
replay(['scout','salvage','crossing','supplies','harvest','rescue','signal']);

// V0 has no required-stat rows. Exercise rebuild-only behavior with an in-memory fixture.
const fixture = {...actions.harvest, required: {gathering: 3}, cost: {gathering: 2},
  bonus: {food: 6, wood: 2}, completion: {gathering: 1}};
for (const stats of [{}, {gathering: 2}]) {
  const before = {...stats};
  assert.equal(pay(stats, fixture), false);
  assert.deepEqual(stats, before);
}
const exact = {gathering: 3};
assert.equal(pay(exact, fixture), true);
assert.equal(exact.gathering, 1);
for (const level of [0, 3]) {
  const stats = level ? {gathering: level} : {};
  finish(stats, fixture);
  assert.deepEqual(stats, {food: 6 + level, wood: 2, gathering: level + 1});
  finish(stats, fixture);
  assert.equal(stats.food, 13 + 2 * level);
}
db.close();
console.log('Verified all ' + slugs.length + ' actions and ' + (slugs.length * 2 ** slugs.length) +
  ' unlock comparisons against ' + pin + '.');
console.log('Winning route: 140 hours, 15 defense, 3 people. Deadline, farm, and skill cases passed.');
