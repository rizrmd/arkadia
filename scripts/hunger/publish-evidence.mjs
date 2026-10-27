import {publishLayer} from '../arkodia/publish-layer.mjs';import fs from 'node:fs/promises';
const files={};for(const f of await fs.readdir('docs/hunger'))files['/'+f]=(await fs.readFile('docs/hunger/'+f)).toString('base64');
await publishLayer({name:'hunger-evidence',prefix:'/hunger-verification',files});
