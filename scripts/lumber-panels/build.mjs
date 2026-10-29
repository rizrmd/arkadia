import {build} from 'vite';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const stage=process.env.LUMBER_STAGE;if(!stage)throw Error('LUMBER_STAGE required');const site=stage+'/site';
await build({logLevel:'error',build:{outDir:site,copyPublicDir:false}});
await fs.cp('docs/lumber-panels',site+'/lumber-panels',{recursive:true});await fs.cp('public/lumber-panels',site+'/lumber-panels',{recursive:true});await fs.cp('public/core-upgrade/kit',site+'/core-upgrade/kit',{recursive:true});
const sizes=JSON.parse(execFileSync('curl',['--fail','--silent','--show-error','--retry','2','--max-time','30','https://arkodia.online/asset-sizes.json'],{encoding:'utf8',maxBuffer:16e6}));
for(const dir of ['public/lumber-panels','public/core-upgrade/kit'])for(const p of await fs.readdir(dir,{recursive:true})){const file=dir+'/'+p;if((await fs.stat(file)).isFile()&&/\.(png|webp)$/.test(p))sizes['/'+file.slice(7)]=(await fs.stat(file)).size;}
await fs.writeFile(site+'/asset-sizes.json',JSON.stringify(sizes));
const files={};for(const p of await fs.readdir(site,{recursive:true})){const f=site+'/'+p;if((await fs.stat(f)).isFile())files['/'+p]=createHash('sha256').update(await fs.readFile(f)).digest('hex');}
await fs.writeFile(site+'/lumber-panels/release.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),at:new Date().toISOString(),files},null,2));
