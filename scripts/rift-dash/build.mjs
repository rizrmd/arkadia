import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';
execFileSync('npx',['vite','build','--config','vite.rift-dash.config.ts'],{stdio:'inherit'});
await fs.copyFile('dist-rift-dash/rift-dash-player.html','dist-rift-dash/index.html');
await fs.mkdir('dist-rift-dash/vfx',{recursive:true});
for(const n of ['departure.webp','arrival.webp','particles.webp','trail.webp','manifest.json'])await fs.copyFile('public/rift-dash/v2/'+n,'dist-rift-dash/vfx/'+n);
await fs.mkdir('dist-rift-dash/actors',{recursive:true});
await fs.copyFile('public/rift-runner/sprite-player/sheets/rift-runner-run.webp','dist-rift-dash/actors/rift-runner-run.webp');
