import fs from 'node:fs/promises';import {publishLayer} from '../arkodia/publish-layer.mjs';
const files={};for(const f of await fs.readdir('docs/rift-skill-fix'))if(/\.(png|json|md|html)$/.test(f))files['/'+f]=(await fs.readFile('docs/rift-skill-fix/'+f)).toString('base64');
const layer=await publishLayer({name:'rift-skill-live-evidence',files,prefix:'/rift-runner/skill-fix/evidence',check:'/healthz'});console.log(JSON.stringify({layer,files:Object.keys(files).length}));
