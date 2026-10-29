import {build} from 'vite';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const stage=process.env.CORE_UPGRADE_STAGE;if(!stage)throw Error('CORE_UPGRADE_STAGE required');
const site=stage+'/site';
await build({logLevel:'error',build:{outDir:site,copyPublicDir:false}});
const paths=['buildings/stronghold-core/painted/manifest.json','buildings/starting-campfire/campfire-v1.png'];
for(const p of paths){await fs.mkdir(site+'/'+p.split('/').slice(0,-1).join('/'),{recursive:true});await fs.copyFile('public/'+p,site+'/'+p);}
await fs.cp('docs/core-upgrade',site+'/core-upgrade',{recursive:true});
await fs.cp('public/core-upgrade',site+'/core-upgrade',{recursive:true});
const r=await fetch('https://arkodia.online/asset-sizes.json',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Live inventory unavailable');const sizes=await r.json();for(const p of await fs.readdir('public/core-upgrade',{recursive:true})){const file='public/core-upgrade/'+p;if((await fs.stat(file)).isFile()&&/\.(png|webp)$/.test(p))sizes['/'+file.slice(7)]=(await fs.stat(file)).size;}await fs.writeFile(site+'/asset-sizes.json',JSON.stringify(sizes));
const files={};for(const p of [...((await fs.readdir('docs/core-upgrade')).filter(p=>!['release.json','production.json'].includes(p))), 'design.png'])files['/core-upgrade/'+p]=createHash('sha256').update(await fs.readFile(site+'/core-upgrade/'+p)).digest('hex');for(const p of ['index.html',...paths,...(await fs.readdir(site+'/assets')).map(f=>'assets/'+f)])files['/'+p]=createHash('sha256').update(await fs.readFile(site+'/'+p)).digest('hex');
for(const p of await fs.readdir('public/core-upgrade',{recursive:true})){const file='core-upgrade/'+p;if((await fs.stat(site+'/'+file)).isFile())files['/'+file]=createHash('sha256').update(await fs.readFile(site+'/'+file)).digest('hex');}
await fs.writeFile(site+'/core-upgrade/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),files},null,2));
