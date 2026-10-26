import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
execFileSync('npx',['vite','build','--config','vite.houdini-flame-fan.config.ts'],{stdio:'inherit'});
await fs.copyFile('dist-houdini-flame-fan/houdini-flame-fan.html','dist-houdini-flame-fan/index.html');
await fs.cp('experiments/houdini-flame-fan/player/artifacts','dist-houdini-flame-fan/artifacts',{recursive:true});
await fs.cp('docs/houdini-flame-fan','dist-houdini-flame-fan/evidence',{recursive:true});
await fs.copyFile('experiments/houdini-flame-fan/master-1280x720.zip','dist-houdini-flame-fan/master-1280x720.zip');
