import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
execFileSync('npx',['tsc','--noEmit'],{stdio:'inherit'});
execFileSync('npx',['vite','build','--config','vite.rift-bolt.config.ts'],{stdio:'inherit'});
await fs.rename('dist-rift-bolt/rift-bolt-player.html','dist-rift-bolt/index.html');
