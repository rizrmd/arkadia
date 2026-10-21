import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
// Publish the walk-behind collision fix (index.html + loading bar) and its screenshots (/walk-behind/) through the canonical
// managed sandbox, preserving the live SPA route handler.
// Run from a clean checkout of the commit being released, after npm run build and node scripts/verify-walk-behind.mjs.
const id='CS13a31c114a666008eb9cafa5',dir=path.resolve('.publish/walk-behind'),from=path.relative(os.homedir(),dir),run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:6e6}));await fs.mkdir(dir,{recursive:true});const files={};
files['/index.html']=(await fs.readFile('dist/index.html')).toString('base64');
for(const n of await fs.readdir('dist/assets'))if(/\.(js|css)$/.test(n))files['/assets/'+n]=(await fs.readFile('dist/assets/'+n)).toString('base64');
for(const n of ['manifest.json','hero.png'])files['/assets/characters/'+n]=(await fs.readFile('public/assets/characters/'+n)).toString('base64');
for(const n of await fs.readdir('docs/walk-behind'))files['/walk-behind/'+n]=(await fs.readFile('docs/walk-behind/'+n)).toString('base64');
const bytes=gzipSync(JSON.stringify(files)),version=createHash('sha256').update(bytes).digest('hex').slice(0,10),parts=[];for(let offset=0;offset<bytes.length;offset+=2e6){const n=`stronghold-only-${version}-${parts.length}.gzpart`;await fs.writeFile(dir+'/'+n,bytes.subarray(offset,offset+2e6));parts.push(n);}console.log('Packaged',Object.keys(files).length,'resources in',parts.length,'parts;',bytes.length,'bytes');
for(const n of parts)run(['organization','home-files','transfer','--from-member','US4f550b10dab65dc9756fa429','--from',from+'/'+n,'--to-custom-sandbox',id,'--to',n]);
let live=run(['organization','home-files','file','--custom-sandbox',id,'--path','app.mjs']).content;if(!live.includes('const types='))throw Error('Unknown release loader');
const patch=`Object.assign(files,JSON.parse(gunzipSync(Buffer.concat(${JSON.stringify(parts)}.map(n=>readFileSync(n))))));`;const stage=dir+'/loader';await fs.mkdir(stage,{recursive:true});await fs.writeFile(stage+'/app.mjs',live.includes(patch)?live:live.replace('const types=',patch+'const types='));console.log(JSON.stringify(run(['sandboxes','serve','--name','arkadia-stronghold','--dir',stage,'--cmd','node app.mjs','--port','3000','--project','PJ8758f22f61165f3d3215e454'])));
