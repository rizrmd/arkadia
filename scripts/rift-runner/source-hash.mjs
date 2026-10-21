import fs from 'node:fs';import {createHash} from 'node:crypto';
export function sourceHash(){const source=fs.readFileSync('scripts/rift-runner/rig.py','utf8').split('mode=sys.argv')[0],texture=fs.readFileSync('public/rift-runner/v2/source/material-atlas.png');return createHash('sha256').update(source).update('cycles24-denoise-320').update(texture).digest('hex').slice(0,12)}
if(process.argv[1]?.endsWith('source-hash.mjs'))console.log(sourceHash());
