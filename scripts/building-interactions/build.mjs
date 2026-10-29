import {build} from 'vite';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const stage=process.env.BUILDING_STAGE;if(!stage)throw Error('BUILDING_STAGE required');const site=stage+'/site';
// A normal additive release layer preserves the latest ground assets, maps, saved games and peer evidence.
await build({logLevel:'error',build:{outDir:site,copyPublicDir:false}});
await fs.cp('docs/building-interactions',site+'/building-interactions',{recursive:true});
// Receipts are generated after packaging/verification, never hash a stale or self-referential manifest.
for(const name of ['release.json','production.json'])await fs.rm(site+'/building-interactions/'+name,{force:true});
const files={};for(const p of await fs.readdir(site,{recursive:true})){const f=site+'/'+p;if((await fs.stat(f)).isFile())files['/'+p]=createHash('sha256').update(await fs.readFile(f)).digest('hex');}
await fs.writeFile(site+'/building-interactions/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),files},null,2));
