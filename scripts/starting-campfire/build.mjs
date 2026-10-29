import {build} from 'vite';

import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const stage=process.env.CAMPFIRE_STAGE;if(!stage)throw Error('CAMPFIRE_STAGE required');
const site=stage+'/site';await build({logLevel:'error',build:{outDir:site,copyPublicDir:false}});

await fs.mkdir(site+'/buildings/starting-campfire',{recursive:true});await fs.copyFile('public/buildings/starting-campfire/campfire-v1.png',site+'/buildings/starting-campfire/campfire-v1.png');
await fs.mkdir(site+'/coop',{recursive:true});await fs.copyFile('public/coop/nav.json',site+'/coop/nav.json');
await fs.cp('docs/starting-campfire',site+'/starting-campfire',{recursive:true});
const r=await fetch('https://arkodia.online/asset-sizes.json',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Live asset inventory unavailable');const sizes=await r.json();sizes['/buildings/starting-campfire/campfire-v1.png']=(await fs.stat('public/buildings/starting-campfire/campfire-v1.png')).size;await fs.writeFile(site+'/asset-sizes.json',JSON.stringify(sizes));
const files={};for(const rel of ['index.html','buildings/starting-campfire/campfire-v1.png','coop/nav.json',...(await fs.readdir(site+'/assets')).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)])files['/'+rel]=createHash('sha256').update(await fs.readFile(site+'/'+rel)).digest('hex');
await fs.writeFile(site+'/starting-campfire/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),files},null,2));
