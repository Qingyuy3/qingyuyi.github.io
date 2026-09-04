// One-time cleanup of OUR initial integration-test fixtures only.
// Refuses to run once handed over, or when any real student data exists.
import {readFile,writeFile,readdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
const root=resolve('learning-platform');
try{await access(resolve(root,'private/pilot-finalized.json'));throw new Error('Already handed over; refusing cleanup');}catch(e){if(e.code!=='ENOENT')throw e;}
const backups=(await readdir(resolve(root,'private/backups'))).sort();
const latest=resolve(root,'private/backups',backups.at(-1));
const manifest=JSON.parse(await readFile(resolve(latest,'manifest.json'),'utf8'));
if(manifest.restoredIntegrity!=='ok')throw new Error('Verified backup required');
const db=new DatabaseSync(':memory:');db.exec(await readFile(resolve(latest,'database.sql'),'utf8'));
const users=db.prepare('SELECT id,name,email,className,role FROM user').all();
const teacher=users.find(u=>u.email==='teacher@students.invalid'&&u.role==='admin');
if(!teacher)throw new Error('Teacher not found');
const students=users.filter(u=>u.id!==teacher.id);
if(students.some(u=>u.className!=='系统验证'||!/^qa\d+@students\.invalid$/.test(u.email)||!/^验证学生[12]$/.test(u.name)))throw new Error('Non-test account found; refusing cleanup');
const studentIds=new Set(students.map(u=>u.id));
const uploads=db.prepare('SELECT * FROM uploads').all();
if(uploads.some(f=>!studentIds.has(f.owner_id)&&!(f.owner_id===teacher.id&&f.title==='系统验证文件'&&f.filename==='教师资料验证.html')))throw new Error('Non-test file found; refusing cleanup');
const posts=db.prepare('SELECT id,author_id,parent_id FROM posts').all();
if(posts.some(p=>!studentIds.has(p.author_id)))throw new Error('Non-test discussion found; refusing cleanup');
const assignments=db.prepare("SELECT id,title FROM assignments WHERE id NOT IN ('a01','a02','a03','a04')").all();
if(assignments.some(a=>a.title!=='系统验证作业'))throw new Error('Non-test assignment found; refusing cleanup');
const literal=value=>`'${String(value).replaceAll("'","''")}'`;
const list=rows=>rows.map(r=>literal(r.id)).join(',')||"''";
const exec=promisify(execFile),wrangler=resolve('node_modules/wrangler-platform/bin/wrangler.js');
async function command(args){
 for(let attempt=0;attempt<3;attempt++){
  try{return (await exec(process.execPath,[wrangler,...args],{cwd:root,maxBuffer:4*1024*1024,timeout:30000})).stdout;}
  catch(error){if(attempt===2)throw new Error(`Cloudflare operation failed after retries: ${args.slice(0,3).join(' ')}`);}
 }
}
for(const file of uploads.filter(f=>f.status==='ready')){
 if(!manifest.files.some(f=>f.id===file.id))throw new Error('Missing file backup');
 await command(['r2','object','delete',`xjtu-learning-pilot/${file.object_key}`,'--remote']);
}
const sql=`
DELETE FROM upload_parts WHERE upload_id IN (${list(uploads)});
DELETE FROM uploads WHERE id IN (${list(uploads)});
DELETE FROM posts WHERE id IN (${list(posts.filter(p=>p.parent_id))});
DELETE FROM posts WHERE id IN (${list(posts.filter(p=>!p.parent_id))});
DELETE FROM user WHERE id IN (${list(students)});
DELETE FROM assignments WHERE id IN (${list(assignments)});
UPDATE user SET mustChangePassword=1,temporaryExpires=${Date.now()+7*86400000} WHERE id=${literal(teacher.id)};
DELETE FROM session WHERE userId=${literal(teacher.id)};
`;
await writeFile(resolve(root,'private/finalize.sql'),sql);
await command(['d1','execute','xjtu-learning-pilot','--remote','--config','wrangler.jsonc','--file','private/finalize.sql']);
const {password}=JSON.parse(await readFile(resolve(root,'private/test-remote.json'),'utf8'));
await writeFile(resolve(root,'private/教师首次登录.txt'),`网址：https://xjtu-learning-pilot.pages.dev/\n教师账号：teacher\n临时密码：${password}\n首次登录必须修改密码；7 天内有效。请勿上传 GitHub 或发到群里。\n`);
await writeFile(resolve(root,'private/pilot-finalized.json'),JSON.stringify({at:new Date().toISOString(),backup:latest,removedTestUsers:students.length,removedTestFiles:uploads.length}));
db.close();
console.log('Test fixtures removed with verified backup; teacher handover credentials saved privately.');
