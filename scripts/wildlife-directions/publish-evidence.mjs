import {publishLayer} from '../arkodia/publish-layer.mjs';import fs from 'node:fs/promises';
const files={};for(const f of ['live-browser.json','live-verification.json','knowledge.md','README.md'])files['/'+f]=(await fs.readFile('docs/wildlife-directions/'+f)).toString('base64');
for(const f of ['live-game.png','pixi-directions-draft.png'])files['/'+f]=(await fs.readFile('public/wildlife-directions/'+f)).toString('base64');
await publishLayer({name:'wildlife-directions-evidence',prefix:'/wildlife-directions',files,check:'/wildlife-directions/live-verification.json'});
