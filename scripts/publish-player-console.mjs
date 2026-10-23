import {readFile} from 'node:fs/promises';
import {publishLayer} from './arkodia/publish-layer.mjs';
// Publish review assets only; the game itself is released by scripts/fural-deploy.sh.
const names=['index.html','reference.png','reported-result.png','mobile-annotated-issue.png','console-detail.png','live-console-detail.png','live-desktop.png','live-mobile.png','live-landscape.png','live-resize.png','verification.json','live-verification.json','live-asset-audit.json','materials.png','rift-portrait.png','ember-portrait.png','implementation.md','review.md'];
const files=Object.fromEntries(await Promise.all(names.map(async n=>['/'+n,(await readFile('docs/player-console/'+n)).toString('base64')])));
await publishLayer({name:'player-console-evidence',files,prefix:'/player-console'});
