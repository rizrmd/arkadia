import fs from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';
// A dedicated asset review site: no shared gameplay loader, bundles, server, or peer assets.
const stage=path.resolve('.publish/enemies');await fs.mkdir(stage+'/enemies',{recursive:true});await fs.cp('public/enemies/v1',stage+'/enemies/v1',{recursive:true});await fs.copyFile('scripts/enemies/server.mjs',stage+'/server.mjs');
const receipt=JSON.parse(execFileSync('fural-agent',['sandboxes','serve','--name','arkadia-enemies','--slug','arkadia-enemies','--dir',stage,'--cmd','node server.mjs','--port','3000','--project','PJ8758f22f61165f3d3215e454'],{encoding:'utf8',timeout:120000,maxBuffer:4e6}));
await fs.writeFile('docs/enemies-v1/deployment.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
