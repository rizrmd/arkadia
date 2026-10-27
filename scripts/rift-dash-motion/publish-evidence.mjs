import fs from 'node:fs/promises';import {publishLayer} from '../arkodia/publish-layer.mjs';
const files={};for(const f of await fs.readdir('docs/rift-dash-motion'))if(/\.(png|json|md)$/.test(f))files['/'+f]=(await fs.readFile('docs/rift-dash-motion/'+f)).toString('base64');
const layer=await publishLayer({name:'rift-dash-motion-evidence',files,prefix:'/rift-dash/motion/evidence',check:'/healthz'});console.log(JSON.stringify({layer,files:Object.keys(files).length}));
