import {readDir,publishLayer} from '../arkodia/publish-layer.mjs';
import fs from 'node:fs/promises';
// Additive review layer only. Preserve the current game and every peer release.
const files=await readDir('dist-flame-fan');
for(const name of await fs.readdir('docs/flame-fan')){
 if(/\.(png|json|md)$/.test(name))files['/evidence/'+name]=(await fs.readFile('docs/flame-fan/'+name)).toString('base64');
}
await publishLayer({name:'flame-fan-levels',files,prefix:'/ember-warden-review/flame-fan-levels',check:'/ember-warden-review/flame-fan-levels/'});
