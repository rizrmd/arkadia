import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const id='CS13a31c114a666008eb9cafa5',dir=path.resolve('.publish/gateway-lighting'),run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:6e6}));await fs.mkdir(dir,{recursive:true});const files={};
files['/index.html']=(await fs.readFile('dist/index.html')).toString('base64');
for(const n of await fs.readdir('dist/assets'))if(/\.(js|css)$/.test(n))files['/assets/'+n]=(await fs.readFile('dist/assets/'+n)).toString('base64');
for(const n of ['manifest.json','hero.png','revenant.png'])files['/assets/characters/'+n]=(await fs.readFile('public/assets/characters/'+n)).toString('base64');
for(const n of ['full-gateway-v3-sheet.webp','full-gateway-v3-sheet.json','full-gateway-v3-open.webp','full-gateway-v3-closed.webp'])files['/modular-stronghold/v2/'+n]=(await fs.readFile('public/modular-stronghold/v2/'+n)).toString('base64');
for(const n of await fs.readdir('docs/gateway-lighting'))if(/\.(png|json)$/.test(n))files['/gateway-lighting/'+n]=(await fs.readFile('docs/gateway-lighting/'+n)).toString('base64');
const bytes=gzipSync(JSON.stringify(files)),version=createHash('sha256').update(bytes).digest('hex').slice(0,10),parts=[];for(let offset=0;offset<bytes.length;offset+=2e6){const n=`gateway-light-${version}-${parts.length}.gzpart`;await fs.writeFile(dir+'/'+n,bytes.subarray(offset,offset+2e6));parts.push(n);}
for(const n of parts)run(['organization','home-files','transfer','--from-member','US4f550b10dab65dc9756fa429','--from',path.relative(os.homedir(),dir+'/'+n),'--to-custom-sandbox',id,'--to',n]);
const live=run(['organization','home-files','file','--custom-sandbox',id,'--path','app.mjs']).content;if(!live.includes('const types='))throw Error('Unknown release loader');
const patch=`Object.assign(files,JSON.parse(gunzipSync(Buffer.concat(${JSON.stringify(parts)}.map(n=>readFileSync(n))))));`,stage=dir+'/loader';await fs.mkdir(stage,{recursive:true});await fs.writeFile(stage+'/app.mjs',live.replace('const types=',patch+'const types='));
console.log(JSON.stringify(run(['sandboxes','serve','--name','arkadia-stronghold','--dir',stage,'--cmd','node app.mjs','--port','3000','--project','PJ8758f22f61165f3d3215e454'])));
