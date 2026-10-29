import {build} from 'vite';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const stage=process.env.INFINITE_STAGE;if(!stage)throw Error('INFINITE_STAGE required');const site=stage+'/site';
await build({logLevel:'error',build:{outDir:site,copyPublicDir:false}});
await fs.cp('docs/infinite-resources',site+'/infinite-resources',{recursive:true});
await fs.mkdir(site+'/typography/v2/fonts',{recursive:true});for(const ext of ['fnt','png'])await fs.copyFile(`public/typography/v2/fonts/garamond-medium-infinite-v1.${ext}`,`${site}/typography/v2/fonts/garamond-medium-infinite-v1.${ext}`);
const enabled=/INFINITE_WOOD_FOOD = true/.test(await fs.readFile('src/stronghold/resource-mode.ts','utf8'));
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();await fs.writeFile(site+'/infinite-resources/mode.json',JSON.stringify({commit,infiniteWoodFood:enabled,configuration:'src/stronghold/resource-mode.ts',finiteSaveBalances:true},null,2));
const files={};for(const p of await fs.readdir(site,{recursive:true})){const f=site+'/'+p;if((await fs.stat(f)).isFile())files['/'+p]=createHash('sha256').update(await fs.readFile(f)).digest('hex');}
await fs.writeFile(site+'/infinite-resources/release.json',JSON.stringify({commit,at:new Date().toISOString(),infiniteWoodFood:enabled,files},null,2));
