import {publishLayer} from '../arkodia/publish-layer.mjs';import fs from 'node:fs/promises';
const files={};for(const f of await fs.readdir('docs/wildlife-sprites'))files['/'+f]=(await fs.readFile('docs/wildlife-sprites/'+f)).toString('base64');
for(const f of ['deer-source.png','crocodile-source.png'])files['/'+f]=(await fs.readFile('assets-src/wildlife/'+f)).toString('base64');
await publishLayer({name:'wildlife-png-evidence',prefix:'/wildlife-sprites',files});
