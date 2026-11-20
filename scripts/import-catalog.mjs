import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const inventoryPath = resolve(root, 'db/v0-inventory.json');
const schema = readFileSync(resolve(root, 'db/schema.sql'), 'utf8');
// The CLI owns the transaction so initial schema creation rolls back with the data.
const transaction = schema.match(/^BEGIN;\s*([\s\S]+?)^COMMIT;\s*$/m);
assert.ok(transaction, 'Expected a single transaction in db/schema.sql');
const schemaBody = transaction[1];

async function checkSource(inventory) {
  const { revision, path } = inventory.source;
  assert.match(revision, /^[0-9a-f]{40}$/);
  assert.equal(path, 'game/dist/engine.js');
  const source = execFileSync('git', ['show', revision + ':' + path], { cwd: root });
  const engine = await import('data:text/javascript;base64,' + source.toString('base64'));
  const original = Object.entries(engine.actions);
  assert.deepEqual(Object.keys(inventory.actions).sort(), original.map(([slug]) => slug).sort());
  const start = engine.fresh();
  for (const [slug, action] of original) {
    const row = inventory.actions[slug];
    const gates = new Set(original.filter(([, parent]) => parent.reveal?.includes(action.node))
      .map(([parentSlug]) => parentSlug));
    if (action.requires) gates.add(action.requires);
    assert.ok(start.discovered.includes(action.node) || gates.size, 'Hidden action: ' + slug);
    assert.deepEqual(
      [row.name, row.desc, row.durationHours, row.cost, row.bonus, row.repeatable, row.repsRequired],
      [action.label, action.description, action.time, action.cost ?? {}, action.gain ?? {}, !action.once, 1],
      'Source fields differ for ' + slug);
    assert.deepEqual([...row.prerequisiteIds].sort(), [...gates].map(key => inventory.actions[key].id).sort(),
      'Unlocks differ for ' + slug);
  }
  for (const [key, value] of Object.entries(inventory.character.stats)) assert.equal(start[key], value, key);
  assert.equal(engine.WAVE_TIME, inventory.rules.timeBudgetHours);
}

function catalogRows({ actions, character, rules, statKeys }) {
  const rows = {
    stat: statKeys.map(key => [key]),
    character: [[character.id, character.name]],
    character_start_stat: Object.entries(character.stats).map(entry => [character.id, ...entry]),
    run_rules: [[rules.id, rules.timeBudgetHours]],
    survival_minimum: Object.entries(rules.survivalMinimums).map(entry => [rules.id, ...entry]),
    action: [], action_prerequisite: [], action_stat: [], action_required_stat: [], action_beneficial_stat: [],
  };
  const byId = new Map(Object.values(actions).map(action => [action.id, action]));
  const visited = new Set();
  const visiting = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    assert.ok(byId.has(id), 'Unknown prerequisite ' + id);
    assert.ok(!visiting.has(id), 'Prerequisite cycle at ' + id);
    visiting.add(id);
    byId.get(id).prerequisiteIds.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  for (const a of Object.values(actions)) {
    visit(a.id);
    rows.action.push([a.id, a.name, a.desc, a.durationHours, a.repsRequired, Number(a.repeatable)]);
    for (const id of a.prerequisiteIds) rows.action_prerequisite.push([a.id, id]);
    for (const phase of ['cost', 'bonus', 'completion']) {
      for (const [key, amount] of Object.entries(a[phase])) rows.action_stat.push([a.id, phase, key, amount]);
    }
    for (const entry of Object.entries(a.requiredStats)) rows.action_required_stat.push([a.id, ...entry]);
    for (const [reward, benefits] of Object.entries(a.beneficialStats)) {
      for (const key of benefits) rows.action_beneficial_stat.push([a.id, reward, key, 'bonus']);
    }
  }
  return rows;
}

export async function importCatalog(path, inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'))) {
  await checkSource(inventory);
  const rows = catalogRows(inventory);
  const db = new DatabaseSync(path);
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE');
    const fresh = !db.prepare("SELECT 1 FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' LIMIT 1").get();
    if (fresh) db.exec(schemaBody);
    // A schema-only database can be seeded too. Any existing catalog must match in full.
    const seeded = Object.keys(rows).some(table => db.prepare('SELECT 1 FROM ' + table + ' LIMIT 1').get());
    for (const [table, values] of Object.entries(rows)) {
      if (seeded) {
        const query = db.prepare('SELECT * FROM ' + table);
        const canonical = records => records.map(row => JSON.stringify(row)).sort();
        assert.deepEqual(canonical(query.all().map(row => Object.values(row))), canonical(values), 'Incompatible catalog in ' + table);
      } else if (values.length) {
        const placeholders = values[0].map(() => '?').join(',');
        const insert = db.prepare('INSERT INTO ' + table + ' VALUES (' + placeholders + ')');
        for (const row of values) insert.run(...row);
      }
    }
    assert.ok(!db.prepare('PRAGMA foreign_key_check').get(), 'Database has a broken foreign key');
    db.exec('COMMIT');
    return seeded ? 'Catalog matches' : 'Catalog imported';
  } finally {
    db.close(); // SQLite rolls back an uncommitted transaction on close.
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const path = resolve(process.argv[2] ?? resolve(root, 'db/catalog.sqlite'));
  try {
    console.log(await importCatalog(path), path);
  } catch (error) {
    console.error('Catalog import failed:', error.message);
    process.exitCode = 1;
  }
}
