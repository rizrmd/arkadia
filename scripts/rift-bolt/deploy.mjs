import {readDir,publishLayer} from '../arkodia/publish-layer.mjs';
import fs from 'node:fs/promises';
// Additive review layer only. Preserve the current game and every peer release.
const files=await readDir('dist-rift-bolt');
for(const name of await fs.readdir('docs/rift-bolt')){
 if(/\.(png|json|md)$/.test(name))files['/evidence/'+name]=(await fs.readFile('docs/rift-bolt/'+name)).toString('base64');
}
await publishLayer({name:'rift-bolt-levels',files,prefix:'/rift-runner/rift-bolt-levels',check:'/rift-runner/rift-bolt-levels/'});
