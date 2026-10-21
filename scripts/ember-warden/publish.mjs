import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {publishLayer,SANDBOX,URL_BASE} from '../arkadia/publish-layer.mjs';
// Supported deployment: the isolated review under /ember-warden-review/ of the Arkadia sandbox.
const root='public/ember-warden/v1',hash=b=>createHash('sha256').update(b).digest('hex'),resources={},files={};
async function collect(dir){for(const e of await fs.readdir(root+'/'+dir,{withFileTypes:true})){const p=(dir?dir+'/':'')+e.name;if(e.isDirectory())await collect(p);else{const b=await fs.readFile(root+'/'+p);files['/'+p]=b.toString('base64');resources[p]=hash(b)}}}await collect('');
// Published as a layer of the one Arkadia sandbox at /ember-warden-review/ (scripts/arkadia/publish-layer.mjs).
await publishLayer({name:'ember',files,prefix:'/ember-warden-review'});
await fs.writeFile('docs/ember-warden/deployment.json',JSON.stringify({url:URL_BASE+'/ember-warden-review/',sandbox:SANDBOX,resources},null,2));console.log('Live:',URL_BASE+'/ember-warden-review/');
