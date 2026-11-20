import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { importCatalog } from '../../scripts/import-catalog.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'rebuild-catalog-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  const inventory = JSON.parse(readFileSync(new URL('../../db/v0-inventory.json', import.meta.url)));
  return { path: join(dir, 'test.sqlite'), inventory };
}

test('repeat import preserves catalog and a saved run, and rejects catalog drift', async t => {
  const {path, inventory} = fixture(t);
  assert.equal(await importCatalog(path), 'Catalog imported');
  const db = new DatabaseSync(path);
  t.after(() => db.close());
  db.prepare('INSERT INTO run VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    'saved', inventory.character.id, 'Noah', inventory.rules.id, 148, 'playing', null, null);
  db.exec("INSERT INTO run_stat VALUES ('saved','scrap',12)");
  const before = readFileSync(path);
  assert.equal(await importCatalog(path), 'Catalog matches');
  assert.deepEqual(readFileSync(path), before);
  db.exec("UPDATE action SET duration_hours = 99 WHERE name = 'Salvage materials'");
  const edited = readFileSync(path);
  await assert.rejects(importCatalog(path), /Incompatible catalog in action/);
  assert.deepEqual(readFileSync(path), edited);
});

test('invalid beneficial stat rolls back both schema and catalog on a fresh import', async t => {
  const {path, inventory} = fixture(t);
  inventory.actions.harvest.beneficialStats.wood = ['gathering'];
  await assert.rejects(importCatalog(path, inventory), /FOREIGN KEY/);
  const db = new DatabaseSync(path);
  assert.equal(db.prepare('SELECT count(*) AS n FROM sqlite_schema').get().n, 0);
  db.close();
  assert.equal(await importCatalog(path), 'Catalog imported');
});
