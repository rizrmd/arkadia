import fs from 'node:fs/promises';
import {readDir,publishLayer} from '../arkodia/publish-layer.mjs';
const files={};
for(const [name,data] of Object.entries(await readDir('dist-flame-fan-preview')))files['/flame-fan-preview'+name]=data;
for(const [dir,prefix] of [['docs/flame-fan-preview','/flame-fan-preview/evidence/'],['docs/flame-fan-gameplay','/flame-fan-gameplay/']])for(const name of await fs.readdir(dir))if(/\.(png|json|md)$/.test(name))files[prefix+name]=(await fs.readFile(dir+'/'+name)).toString('base64');
await publishLayer({name:'flame-fan-automatic-evidence',files,prefix:'/ember-warden-review',check:'/ember-warden-review/flame-fan-preview/'});
