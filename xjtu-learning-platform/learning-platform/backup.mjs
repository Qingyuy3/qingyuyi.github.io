// Read-only cloud backup. Sensitive output is confined to ignored private/.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const exec=promisify(execFile);
const root=resolve('learning-platform');
const wrangler=resolve('node_modules/wrangler-platform/bin/wrangler.js');
const directory=resolve(root,'private','backups',new Date().toISOString().replaceAll(':','-'));
await mkdir(resolve(directory,'objects'),{recursive:true});
async function command(args){return (await exec(process.execPath,[wrangler,...args],{cwd:root,maxBuffer:8*1024*1024})).stdout;}
await command(['d1','export','xjtu-learning-pilot','--remote','--config','wrangler.jsonc','--output',resolve(directory,'database.sql')]);
// A restore drill to a NEW in-memory database, never the live database.
const restored=new DatabaseSync(':memory:');
restored.exec(await readFile(resolve(directory,'database.sql'),'utf8'));
const integrity=restored.prepare('PRAGMA integrity_check').get();
if(integrity.integrity_check!=='ok')throw new Error('Backup restore integrity check failed');
const rows=restored.prepare("SELECT id,object_key,filename,bytes FROM uploads WHERE status='ready'").all();
for(const row of rows){
 if(!/^[a-f0-9-]{36}$/.test(row.id)||!row.object_key.startsWith('course-001/'))throw new Error('Unexpected file metadata');
 await command(['r2','object','get',`xjtu-learning-pilot/${row.object_key}`,'--remote','--file',resolve(directory,'objects',row.id)]);
 const info=await stat(resolve(directory,'objects',row.id));
 if(info.size!==row.bytes)throw new Error('Backup object size mismatch');
}
await writeFile(resolve(directory,'manifest.json'),JSON.stringify({at:new Date().toISOString(),files:rows,restoredIntegrity:'ok'},null,2));
restored.close();
console.log(`Backup complete and database restore verified; ${rows.length} file(s). Private location: ${directory}`);
