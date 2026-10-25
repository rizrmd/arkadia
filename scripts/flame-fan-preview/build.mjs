import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';
execFileSync('npx',['tsc','--noEmit'],{stdio:'inherit'});execFileSync('npx',['vite','build','--config','vite.flame-fan-preview.config.ts'],{stdio:'inherit'});
await fs.copyFile('dist-flame-fan-preview/flame-fan-preview.html','dist-flame-fan-preview/index.html');

const manifest=JSON.parse(await fs.readFile('public/assets/characters/manifest.json','utf8'));
const characters=Object.fromEntries(['ember-warden','revenant'].map(id=>[id,manifest.characters[id]]));
await fs.mkdir('dist-flame-fan-preview/assets/actors',{recursive:true});
await fs.writeFile('dist-flame-fan-preview/assets/actors/manifest.json',JSON.stringify({characters}));
for(const m of Object.values(characters))await fs.copyFile('public/assets/characters/'+m.image,'dist-flame-fan-preview/assets/actors/'+m.image);
