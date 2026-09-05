// Offline recovery drill only. Never imports into Cloudflare or prints personal records.
import { readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { resolve, sep } from 'node:path';
import assert from 'node:assert/strict';
const directory = resolve(process.argv[2] || '');
const allowed = resolve('learning-platform/private/backups') + sep;
assert.ok(
  directory.startsWith(allowed),
  'Choose an exact private backup directory.',
);
const manifest = JSON.parse(
  await readFile(resolve(directory, 'manifest.json'), 'utf8'),
);
async function digest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
assert.equal(
  await digest(resolve(directory, 'database.sql')),
  manifest.databaseSha256,
);
const db = new DatabaseSync(':memory:');
try {
  db.exec(await readFile(resolve(directory, 'database.sql'), 'utf8'));
  assert.equal(
    db.prepare('PRAGMA integrity_check').get().integrity_check,
    'ok',
  );
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  const rows = db
    .prepare(
      "SELECT id,bytes,object_key FROM uploads WHERE status='ready' AND visibility!='deleted'",
    )
    .all();
  assert.equal(rows.length, manifest.files.length);
  for (const row of rows) {
    assert.match(row.id, /^[a-f0-9-]{36}$/);
    const file = manifest.files.find((f) => f.id === row.id);
    assert.ok(
      file && file.object_key === row.object_key && file.bytes === row.bytes,
    );
    assert.equal(
      await digest(resolve(directory, 'objects', row.id)),
      file.sha256,
    );
  }
  console.log(
    `PASS: offline SQL restore, foreign keys, database SHA-256 and ${rows.length} file checksum(s). No live data changed.`,
  );
} finally {
  db.close();
}
