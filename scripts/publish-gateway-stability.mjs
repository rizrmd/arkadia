import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
// Asset-only patch: retain the currently deployed app/hero/HUD bundles and replace just the stable gateway atlas.
const id='CS13a31c114a666008eb9cafa5',dir=path.resolve('.publish/gateway-stability'),run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:6e6}));await fs.mkdir(dir,{recursive:true});const files={};
for(const n of ['full-gateway-sheet.webp','full-gateway-sheet.json','full-gateway-open.webp','full-gateway-closed.webp'])files['/modular-stronghold/v2/'+n]=(await fs.readFile('public/modular-stronghold/v2/'+n)).toString('base64');
files['/full-gateway/stability.json']=(await fs.readFile('docs/full-gateway/stability.json')).toString('base64');
const bytes=gzipSync(JSON.stringify(files)),name='stable-gateway-'+createHash('sha256').update(bytes).digest('hex').slice(0,12)+'.gz';await fs.writeFile(dir+'/'+name,bytes);
run(['organization','home-files','transfer','--from-member','US4f550b10dab65dc9756fa429','--from',path.relative(os.homedir(),dir+'/'+name),'--to-custom-sandbox',id,'--to',name]);
const live=run(['organization','home-files','file','--custom-sandbox',id,'--path','app.mjs']).content;if(!live.includes('const types='))throw Error('Unknown release loader');
const patch=`Object.assign(files,JSON.parse(gunzipSync(readFileSync(${JSON.stringify(name)}))));`,stage=dir+'/loader';await fs.mkdir(stage,{recursive:true});await fs.writeFile(stage+'/app.mjs',live.replace('const types=',patch+'const types='));
console.log(JSON.stringify(run(['sandboxes','serve','--name','arkadia-stronghold','--dir',stage,'--cmd','node app.mjs','--port','3000','--project','PJ8758f22f61165f3d3215e454'])));
