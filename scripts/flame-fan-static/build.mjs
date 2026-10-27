import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
execFileSync('npx',['vite','build','--config','vite.flame-fan-static.config.ts'],{stdio:'inherit'});
await fs.copyFile('dist-flame-fan-static/flame-fan-static.html','dist-flame-fan-static/index.html');
for(const file of await fs.readdir('public/flame-fan-static'))await fs.copyFile('public/flame-fan-static/'+file,'dist-flame-fan-static/'+file);
for(const name of ['smoke-veil-v1','smoke-split-curl-v1'])await fs.copyFile('public/flame-fan-supplemental/v1/'+name+'.png','dist-flame-fan-static/'+name+'.png');
await fs.copyFile('public/flame-fan-flipbook/hand-ignition-source.png','dist-flame-fan-static/hand-ignition-source.png');
await fs.writeFile('dist-flame-fan-static/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()}));
