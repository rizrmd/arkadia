import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
execFileSync('npx',['tsc','--noEmit'],{stdio:'inherit'});
execFileSync('npx',['vite','build','--config','vite.flame-fan.config.ts'],{stdio:'inherit'});
await fs.rename('dist-flame-fan/flame-fan-player.html','dist-flame-fan/index.html');
