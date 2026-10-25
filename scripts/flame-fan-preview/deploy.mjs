import {readDir,publishLayer} from '../arkodia/publish-layer.mjs';import fs from 'node:fs/promises';
const files=await readDir('dist-flame-fan-preview');
for(const name of await fs.readdir('docs/flame-fan-preview'))if(/\.(png|json|md)$/.test(name))files['/evidence/'+name]=(await fs.readFile('docs/flame-fan-preview/'+name)).toString('base64');
await publishLayer({name:'flame-fan-preview',files,prefix:'/ember-warden-review/flame-fan-preview',check:'/ember-warden-review/flame-fan-preview/'});
