import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';
execFileSync('npx',['tsc','--noEmit'],{stdio:'inherit'});execFileSync('npx',['vite','build','--config','vite.flame-fan-preview.config.ts'],{stdio:'inherit'});
await fs.copyFile('dist-flame-fan-preview/flame-fan-preview.html','dist-flame-fan-preview/index.html');
