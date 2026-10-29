import {build} from 'vite';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const stage=process.env.CORE_CAMPFIRE_STAGE;if(!stage)throw Error('CORE_CAMPFIRE_STAGE required');
const site=stage+'/site';
await build({logLevel:'error',build:{outDir:site,copyPublicDir:false}});
const paths=['buildings/stronghold-core/painted/manifest.json','buildings/starting-campfire/campfire-v1.png'];
for(const p of paths){await fs.mkdir(site+'/'+p.split('/').slice(0,-1).join('/'),{recursive:true});await fs.copyFile('public/'+p,site+'/'+p);}
await fs.cp('docs/core-campfire',site+'/core-campfire',{recursive:true});
const r=await fetch('https://arkodia.online/asset-sizes.json',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Live inventory unavailable');await fs.writeFile(site+'/asset-sizes.json',JSON.stringify(await r.json()));
const files={};for(const p of ['index.html',...paths,...(await fs.readdir(site+'/assets')).map(f=>'assets/'+f)])files['/'+p]=createHash('sha256').update(await fs.readFile(site+'/'+p)).digest('hex');
await fs.writeFile(site+'/core-campfire/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),files},null,2));
