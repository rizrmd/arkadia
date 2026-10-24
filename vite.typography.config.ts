import fs from 'node:fs';import path from 'node:path';
import {defineConfig,type Plugin} from 'vite';
// Typography rendering sample (src/typography), built on its own: npx vite -c vite.typography.config.ts [build].
// Served at /typography/: v2/ is public/typography/v2 (fonts, HUD frames, references), kit/ the Choosing Hero kit files it
// references read-only, reference.png the HUD reference. The build copies exactly those into dist/typography-sample.
const KIT=['labels.en.json','backgrounds/castle-desktop.png','backgrounds/castle-mobile.png','heroes/ember-warden.png','heroes/rift-runner.png','cards/ember-warden-portrait.png','cards/rift-runner-portrait.png',
 ...['card-frame','card-frame-selected','selected-badge','back','divider','panel-desktop','panel-mobile','button-default','skill-flame-fan','skill-rift-bolt','skill-empty'].map(n=>`components/${n}.png`)];
const MOUNTS:[string,string][]=[['v2/','public/typography/v2/'],['kit/','public/choosing-hero/v1/'],['reference.png','public/typography/reference.png']];
const TYPES:Record<string,string>={'.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.fnt':'text/plain','.txt':'text/plain'};
const assets=():Plugin=>{let out='';return {name:'typography-assets',
 configResolved(c){out=path.resolve(c.root,c.build.outDir);},
 configureServer(s){s.middlewares.use((req,res,next)=>{
  const url=decodeURIComponent((req.url||'').split('?')[0]);if(!url.startsWith('/typography/'))return next();
  const rel=url.slice('/typography/'.length),m=MOUNTS.find(([p])=>rel.startsWith(p));if(!m)return next();
  const file=path.resolve(m[1]+rel.slice(m[0].length));if(!fs.existsSync(file)||!fs.statSync(file).isFile())return next();
  res.setHeader('Content-Type',TYPES[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });},
 closeBundle(){
  fs.cpSync('public/typography/v2',path.join(out,'v2'),{recursive:true});
  for(const f of KIT){fs.mkdirSync(path.dirname(path.join(out,'kit',f)),{recursive:true});fs.copyFileSync(path.join('public/choosing-hero/v1',f),path.join(out,'kit',f));}
  fs.copyFileSync('public/typography/reference.png',path.join(out,'reference.png'));
 }};};
export default defineConfig({root:'src/typography',base:'/typography/',publicDir:false,plugins:[assets()],server:{host:'127.0.0.1',port:3047},preview:{host:'127.0.0.1',port:3047},
 build:{outDir:'../../dist/typography-sample',emptyOutDir:true,target:'es2022'}});
