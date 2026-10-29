import {build} from 'vite';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const stage=process.env.FARM_STAGE;if(!stage)throw Error('FARM_STAGE required');const site=stage+'/site';
await build({logLevel:'error',build:{outDir:site,copyPublicDir:false}});
await fs.cp('docs/farm-panels',site+'/farm-panels',{recursive:true});await fs.cp('public/farm-panels',site+'/farm-panels',{recursive:true});await fs.cp('public/core-upgrade/kit',site+'/core-upgrade/kit',{recursive:true});
await fs.cp('public/lumber-panels',site+'/lumber-panels',{recursive:true});
const response=await fetch('https://arkodia.online/asset-sizes.json',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Live inventory unavailable');const sizes=await response.json();
for(const dir of ['public/farm-panels','public/lumber-panels','public/core-upgrade/kit'])for(const p of await fs.readdir(dir,{recursive:true})){const file=dir+'/'+p;if((await fs.stat(file)).isFile()&&/\.(png|webp)$/.test(p))sizes['/'+file.slice(7)]=(await fs.stat(file)).size;}
await fs.writeFile(site+'/asset-sizes.json',JSON.stringify(sizes));
const files={};for(const p of await fs.readdir(site,{recursive:true})){const f=site+'/'+p;if((await fs.stat(f)).isFile())files['/'+p]=createHash('sha256').update(await fs.readFile(f)).digest('hex');}
await fs.writeFile(site+'/farm-panels/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),files},null,2));
