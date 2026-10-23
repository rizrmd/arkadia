// Packs the two selectable heroes, the Rift Runner and the Ember Warden, into Stronghold character atlases next to
// the knight's (public/assets/characters/), plus a portrait for the hero picker.
// Stores ONLY 1 side in the atlas (SE, NE, S, N — 100 frames instead of 150, saving 33% space);
// SW and NW reuse the SE and NE frame indices and are mirrored horizontally at runtime in src/stronghold/hero.ts.
//   node scripts/pack-heroes.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const OUT='public/assets/characters/',KNIGHT_HEIGHT=99,GUTTER=4,COLUMNS=16;
const STORED_VIEWS=['SE','NE','S','N'];
const MIRROR_OF={SW:'SE',NW:'NE'};
const ALL_VIEWS=['SE','SW','NE','NW','S','N'];
// Row indices inside the 5-row 1-side sheets in assets-src/sprite-player/{hero}-{pose}.png
const SHEET_ROW={N:0,NE:1,E:2,SE:3,S:4};

// Movement plays by stride (hero.ts): one stride is 38.4 world px of ground and the hero walks about 105 px/s, so
// a cycle of `seconds` at its authored speed spans seconds*105/38.4 strides.
const strideScale=seconds=>+(seconds*105/(88*.48/1.1)).toFixed(2);
// Picks n evenly spread frames of a clip, always keeping the last.
const spread=(list,n)=>list.length<=n?list:[...Array(n).keys()].map(i=>list[Math.round(i*(list.length-1)/(n-1))]);
const json=async p=>JSON.parse(await fs.readFile(p,'utf8'));

function sheetFrames(heroId,pose,d,fps){
 const row=SHEET_ROW[d];
 if(row===undefined)throw Error(`No 1-side row for ${d}`);
 const file=`assets-src/sprite-player/${heroId}-${pose}.png`;
 return {
  fps,
  list:[...Array(8).keys()].map(col=>({file,rect:[col*384,row*384,384,384],pivot:[192,360]}))
 };
}

async function riftRunner(){
 const dir='public/rift-runner/v1/',m=await json(dir+'manifest.json');
 const attackFrames=d=>{
  const c=m.clips.find(c=>c.id===`pulse-shot-${d}`&&c.layer==='body');if(!c)throw Error('Rift Runner has no pulse-shot-'+d);
  const s=m.sheets.find(s=>s.name===c.sheet);
  if(c.cellSize)return {fps:c.fps,list:c.frames.map(([col,row])=>({file:dir+s.file,rect:[col*c.cellSize,row*c.cellSize,c.cellSize,c.cellSize],pivot:c.pivot}))};
  return {fps:c.fps,list:c.frames.map(([col,row])=>({file:dir+s.file,rect:[col*256,row*256,256,256],pivot:s.frames.find(f=>f.column===col&&f.row===row).pivot}))};
 };
 const frames=(action,d)=>{
  if(action==='pulse-shot')return attackFrames(d);
  return sheetFrames('rift-runner',action,d,action==='idle'?6:action==='run'?10:8);
 };
 return {id:'rift-runner',name:'Rift Runner',frames,actions:{idle:'idle',move:'run',attack:'pulse-shot',hit:'hurt',die:'death'},source:'assets-src/sprite-player/rift-runner-*.png (1-side mirrored)'};
}

async function emberWarden(){
 const dir='public/ember-warden/',atlas=await json(dir+'v3/atlas.json');
 const attackFrames=()=>{
  const entries=Object.entries(atlas.frames).filter(([name])=>name.startsWith('flame-fan-SE-'));
  if(!entries.length)throw Error('Missing painted Ember clip flame-fan');
  return {fps:1000/entries[0][1].duration,list:entries.map(([,f])=>({file:dir+'v3/ember-warden-SE.png',rect:[f.frame.x,f.frame.y,f.frame.w,f.frame.h],pivot:[192,320]}))};
 };
 const frames=(action,d)=>{
  if(action==='flame-fan')return attackFrames();
  return sheetFrames('ember-warden',action,d,action==='idle'?6:action==='run'?10:8);
 };
 return {id:'ember-warden',name:'Ember Warden',frames,actions:{idle:'idle',move:'run',attack:'flame-fan',hit:'hurt',die:'death'},source:'assets-src/sprite-player/ember-warden-*.png (1-side mirrored)'};
}

const raws=new Map();
async function raw(file){let r=raws.get(file);if(!r){r=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});raws.set(file,r);}return r;}
// Opaque bounds of a source frame, relative to its pivot.
async function bounds(f){
 const {data,info}=await raw(f.file),[x0,y0,w,h]=f.rect;let l=w,t=h,r=-1,b=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[((y0+y)*info.width+x0+x)*4+3]>8){if(x<l)l=x;if(x>r)r=x;if(y<t)t=y;if(y>b)b=y;}
 return r<0?null:{l:l-f.pivot[0],t:t-f.pivot[1],r:r+1-f.pivot[0],b:b+1-f.pivot[1]};
}

async function pack(hero){
 const stand=await bounds(hero.frames(hero.actions.idle,'S').list[0]),baseScale=KNIGHT_HEIGHT/(stand.b-stand.t);
 // Game clips per canonical 1-side view (SE, NE, S, N); SW and NW reuse SE and NE frame indices and mirror at runtime.
 const clips={},sources=[];
 const add=(name,src,fps,loop,clipScale,extra={})=>{clips[name]={fps,loop,...extra,frames:src.map(f=>{sources.push({...f,scale:clipScale});return sources.length-1;})};};
 let sharedAtkFrames=null;
 for(const v of STORED_VIEWS){
  const idle=hero.frames(hero.actions.idle,v),move=hero.frames(hero.actions.move,v),attack=hero.frames(hero.actions.attack,v),hit=hero.frames(hero.actions.hit,v),die=hero.frames(hero.actions.die,v);
  const atkB=await bounds(attack.list[0]),atkScale=atkB?KNIGHT_HEIGHT/(atkB.b-atkB.t):baseScale;
  add('idle-'+v,idle.list,idle.fps,true,baseScale);
  add('move-'+v,move.list,move.fps,true,baseScale,{strideScale:strideScale(move.list.length/move.fps)});
  if(hero.id==='ember-warden'&&sharedAtkFrames){
   clips['attack-'+v]={fps:12,loop:false,impact:3,frames:sharedAtkFrames};
  }else{
   add('attack-'+v,spread(attack.list,6),12,false,atkScale,{impact:3});
   if(hero.id==='ember-warden')sharedAtkFrames=clips['attack-'+v].frames;
  }
  add('hit-'+v,spread(hit.list.slice(1),4),20,false,baseScale);
  add('die-'+v,spread(die.list,8),9,false,baseScale);
 }
 // Alias mirrored views (SW -> SE, NW -> NE) to the exact same frame indices so zero duplicate frames are stored!
 for(const [mir,src] of Object.entries(MIRROR_OF)){
  for(const act of ['idle','move','attack','hit','die']){
   clips[`${act}-${mir}`]={...clips[`${act}-${src}`]};
  }
 }

 const all=(await Promise.all(sources.map(async f=>{const b=await bounds(f);return b?{l:b.l*f.scale,t:b.t*f.scale,r:b.r*f.scale,b:b.b*f.scale}:null;}))).filter(Boolean);
 const ext={l:Math.min(...all.map(b=>b.l)),t:Math.min(...all.map(b=>b.t)),r:Math.max(...all.map(b=>b.r)),b:Math.max(...all.map(b=>b.b))};
 const pivot={x:Math.ceil(-ext.l)+2,y:Math.ceil(-ext.t)+2},cell={w:pivot.x+Math.ceil(ext.r)+2,h:pivot.y+Math.ceil(ext.b)+2,pivot};
 // Each frame scaled whole (pivot to pivot) into its cell, so every clip shares one ground point.
 const rows=Math.ceil(sources.length/COLUMNS),width=COLUMNS*(cell.w+GUTTER)+GUTTER,height=rows*(cell.h+GUTTER)+GUTTER,frames=[],parts=[];
 for(const [i,f] of sources.entries()){
  const s=f.scale,col=i%COLUMNS,row=Math.floor(i/COLUMNS),x=GUTTER+col*(cell.w+GUTTER),y=GUTTER+row*(cell.h+GUTTER);
  const [sx,sy,sw,sh]=f.rect,w=Math.round(sw*s),h=Math.round(sh*s),left=Math.round(pivot.x-f.pivot[0]*s),top=Math.round(pivot.y-f.pivot[1]*s);
  const scaled=await sharp(f.file).extract({left:sx,top:sy,width:sw,height:sh}).resize(w,h,{kernel:'lanczos3'}).png().toBuffer();
  // Clip to the cell: margins beyond every frame's opaque bounds are transparent.
  const cl=Math.max(0,-left),ct=Math.max(0,-top),cw=Math.min(w-cl,cell.w-Math.max(0,left)),ch=Math.min(h-ct,cell.h-Math.max(0,top));
  parts.push({input:await sharp(scaled).extract({left:cl,top:ct,width:cw,height:ch}).toBuffer(),left:x+Math.max(0,left),top:y+Math.max(0,top)});
  frames.push({x,y,w:cell.w,h:cell.h});
 }
 const image=await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(parts).webp({quality:90,alphaQuality:100,effort:6}).toBuffer();
 const file=hero.id+'.webp';await fs.writeFile(OUT+file,image);
 // Picker portrait: the front idle, trimmed, 200 px tall for every hero.
 const front=hero.frames(hero.actions.idle,'S').list[0],ps=200/(stand.b-stand.t),[px,py,pw,ph]=front.rect;
 await fs.mkdir(OUT+'portraits',{recursive:true});
 const portrait=await sharp(await sharp(front.file).extract({left:px,top:py,width:pw,height:ph}).resize(Math.round(pw*ps),Math.round(ph*ps),{kernel:'lanczos3'}).png().toBuffer()).trim({threshold:1}).webp({quality:90,alphaQuality:100}).toBuffer();
 await fs.writeFile(OUT+'portraits/'+hero.id+'.webp',portrait);
 console.log(hero.id,`${width}x${height}`,(image.length/1024).toFixed(0)+' KB',sources.length+' stored frames (1-side mirrored)','scale '+baseScale.toFixed(3),'cell',cell.w+'x'+cell.h);
 return {id:hero.id,name:hero.name,image:file,revision:createHash('sha256').update(image).digest('hex').slice(0,16),portrait:'portraits/'+hero.id+'.webp',
  source:hero.source,scale:+baseScale.toFixed(4),atlasSize:[width,height],gutter:GUTTER,cell,
  direction:'One-side stored views (SE, NE, S, N) with runtime horizontal mirroring for SW (from SE) and NW (from NE)',views:ALL_VIEWS,clips,frames};
}

const path=OUT+'manifest.json',manifest=await json(path);
for(const hero of (process.argv.includes('--ember-only')?[await emberWarden()]:[await riftRunner(),await emberWarden()]))manifest.characters[hero.id]=await pack(hero);
await fs.writeFile(path,JSON.stringify(manifest,null,1));
