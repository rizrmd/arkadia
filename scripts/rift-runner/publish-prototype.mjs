import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {publishLayer,SANDBOX,URL_BASE} from '../arkadia/publish-layer.mjs';
// Static task-only overlay. Never replace gameplay HTML, bundles, or unrelated assets.
const files={};
async function collect(base){for(const e of await fs.readdir(base,{withFileTypes:true})){const f=base+'/'+e.name;if(e.isDirectory())await collect(f);else files['/'+f.slice('public/'.length)]=(await fs.readFile(f)).toString('base64')}}
await collect('public/rift-runner/v2');await collect('public/rift-runner/v3');
for(const p of ['index.html','manifest.json'])files['/rift-runner/v1/'+p]=(await fs.readFile('public/rift-runner/v1/'+p)).toString('base64');
if(Object.keys(files).some(p=>!p.startsWith('/rift-runner/v2/')&&!p.startsWith('/rift-runner/v3/')&&!['/rift-runner/v1/index.html','/rift-runner/v1/manifest.json'].includes(p)))throw Error('Overlay escaped task prefix');
const allFiles={...files},hashes=Object.fromEntries(Object.entries(allFiles).map(([p,b])=>[p,createHash('sha256').update(Buffer.from(b,'base64')).digest('hex')]));
let previous={};try{previous=JSON.parse(await fs.readFile('docs/rift-runner-v2/deployment.json','utf8')).resources||{}}catch{}
for(const p of Object.keys(files))if(previous[p]===hashes[p])delete files[p];
if(!Object.keys(files).length){console.log('No changed task resources to deploy');process.exit(0)}
// A layer of the one Arkadia sandbox (scripts/arkadia/publish-layer.mjs); the gateway serves the review folders.
const version=createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,12);
await publishLayer({name:'rift-runner-v2',files,check:'/rift-runner/v2/'});
await fs.writeFile('docs/rift-runner-v2/deployment.json',JSON.stringify({prefix:'/rift-runner/v2/',version,url:URL_BASE+'/rift-runner/v2/',sandbox:SANDBOX,changedResources:Object.keys(files),resources:hashes},null,2));console.log(JSON.stringify({version,resources:Object.keys(files).length,url:URL_BASE+'/rift-runner/v2/'}));
