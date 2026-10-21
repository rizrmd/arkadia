import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
// Static task-only overlay. Never replace gameplay HTML, bundles, or unrelated assets.
const id='CS13a31c114a666008eb9cafa5',dir=path.resolve('.publish/rift-runner'),run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:8e6}));
await fs.mkdir(dir,{recursive:true});const files={};
async function collect(base){for(const e of await fs.readdir(base,{withFileTypes:true})){const f=base+'/'+e.name;if(e.isDirectory())await collect(f);else files['/'+f.slice('public/'.length)]=(await fs.readFile(f)).toString('base64')}}
await collect('public/rift-runner/v1');
if(Object.keys(files).some(p=>!p.startsWith('/rift-runner/v1/')))throw Error('Overlay escaped task prefix');
const bytes=gzipSync(JSON.stringify(files)),version=createHash('sha256').update(bytes).digest('hex').slice(0,12),parts=[];
for(let offset=0;offset<bytes.length;offset+=2e6){const n=`rift-runner-${version}-${parts.length}.gzpart`;await fs.writeFile(dir+'/'+n,bytes.subarray(offset,offset+2e6));parts.push(n)}
console.log(JSON.stringify({resources:Object.keys(files).length,bytes:bytes.length,parts:parts.length}));
for(const n of parts)try{run(['organization','home-files','transfer','--from-member','US4f550b10dab65dc9756fa429','--from',path.relative(os.homedir(),dir)+'/'+n,'--to-custom-sandbox',id,'--to',n])}catch(e){if(!String(e.stdout).includes('already exists'))throw e}
// Read the latest loader after staging, retaining peers' published overlays.
let live=run(['organization','home-files','file','--custom-sandbox',id,'--path','app.mjs']).content;
if(!live.includes('const types='))throw Error('Unknown release loader');
// Add only the review directory route; retain the existing SPA redirect behavior elsewhere.
if(!live.includes("p.startsWith('/rift-runner/v1/')")){
 if(!live.includes("const key=p.endsWith('/')"))throw Error('Unknown path resolver');
 live=live.replace("p.endsWith('.html')&&","p.endsWith('.html')&&!p.startsWith('/rift-runner/v1/')&&");
 live=live.replace("const key=p.endsWith('/')","const key=p.startsWith('/rift-runner/v1/')?(p.endsWith('/')?p+'index.html':p):p.endsWith('/')");
}
if(!live.includes("webm:'video/webm'"))live=live.replace("const types={","const types={webm:'video/webm',");
const patch=`Object.assign(files,JSON.parse(gunzipSync(Buffer.concat(${JSON.stringify(parts)}.map(n=>readFileSync(n))))));`;
const stage=dir+'/loader';await fs.mkdir(stage,{recursive:true});await fs.writeFile(stage+'/app.mjs',live.includes(patch)?live:live.replace('const types=',patch+'const types='));
const receipt=run(['sandboxes','serve','--name','arkadia-stronghold','--dir',stage,'--cmd','node app.mjs','--port','3000','--project','PJ8758f22f61165f3d3215e454']);
const hashes=Object.fromEntries(await Promise.all(Object.keys(files).map(async p=>[p,createHash('sha256').update(Buffer.from(files[p],'base64')).digest('hex')])));
await fs.writeFile('docs/rift-runner-v1/deployment.json',JSON.stringify({prefix:'/rift-runner/v1/',version,resources:hashes,receipt},null,2));console.log(JSON.stringify({version,resources:Object.keys(files).length,receipt}));
