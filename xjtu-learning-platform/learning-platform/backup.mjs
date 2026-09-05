// Read-only cloud backup. Sensitive output is confined to ignored private/.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
const exec = promisify(execFile);
const root = resolve('learning-platform');
const wrangler = resolve('node_modules/wrangler-platform/bin/wrangler.js');
const directory = resolve(
  root,
  'private',
  'backups',
  new Date().toISOString().replaceAll(':', '-'),
);
await mkdir(resolve(directory, 'objects'), { recursive: true });
async function command(args) {
  try {
    return (
      await exec(
        process.execPath,
        ['--dns-result-order=ipv4first', wrangler, ...args],
        { cwd: root, maxBuffer: 8 * 1024 * 1024, timeout: 300000 },
      )
    ).stdout;
  } catch {
    throw new Error(
      '备份步骤失败，未标记为完整备份。请检查 Cloudflare 授权和网络后重试；详细凭据与导出链接不会输出。',
    );
  }
}
async function digest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
await command([
  'd1',
  'export',
  'xjtu-learning-pilot',
  '--remote',
  '--config',
  'wrangler.jsonc',
  '--output',
  resolve(directory, 'database.sql'),
]);
// A restore drill to a NEW in-memory database, never the live database.
const restored = new DatabaseSync(':memory:');
restored.exec(await readFile(resolve(directory, 'database.sql'), 'utf8'));
const integrity = restored.prepare('PRAGMA integrity_check').get();
if (integrity.integrity_check !== 'ok')
  throw new Error('Backup restore integrity check failed');
if (restored.prepare('PRAGMA foreign_key_check').all().length)
  throw new Error('Backup foreign key check failed');
const pending = restored
  .prepare(
    "SELECT COUNT(*) AS n FROM uploads WHERE status IN ('uploading','completing') OR visibility='deleting'",
  )
  .get().n;
if (pending)
  throw new Error(
    '存在上传中或删除中的文件，请等操作完成后再备份。此次快照不标记为完整。',
  );
const rows = restored
  .prepare(
    "SELECT id,object_key,filename,bytes FROM uploads WHERE status='ready' AND visibility!='deleted'",
  )
  .all();
for (const row of rows) {
  if (
    !/^[a-f0-9-]{36}$/.test(row.id) ||
    !row.object_key.startsWith('course-001/')
  )
    throw new Error('Unexpected file metadata');
  await command([
    'r2',
    'object',
    'get',
    `xjtu-learning-pilot/${row.object_key}`,
    '--remote',
    '--file',
    resolve(directory, 'objects', row.id),
  ]);
  const info = await stat(resolve(directory, 'objects', row.id));
  if (info.size !== row.bytes) throw new Error('Backup object size mismatch');
  row.sha256 = await digest(resolve(directory, 'objects', row.id));
}
await writeFile(
  resolve(directory, 'manifest.json'),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      databaseSha256: await digest(resolve(directory, 'database.sql')),
      files: rows,
      restoredIntegrity: 'ok',
      foreignKeys: 'ok',
    },
    null,
    2,
  ),
);
restored.close();
console.log(
  `Backup complete and database restore verified; ${rows.length} file(s). Private location: ${directory}`,
);
