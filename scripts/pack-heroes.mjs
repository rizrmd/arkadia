// Packs the two selectable heroes, the Rift Runner and the Ember Warden, into Stronghold character atlases next to
// the knight's (public/assets/characters/), plus a portrait for the hero picker. Both source sets are drawn in all
// eight facings without mirroring; the Stronghold shows six of them (hero.ts): the four diagonals and straight
// up/down. Each hero is scaled once so its standing idle is as tall as the knight's (99 atlas px), and every
// combat clip is retimed to the knight's, which the co-op server simulates (server/internal/sim/fighter.go):
// a 6-frame swing at 12 fps landing on frame 3 and a 200 ms hit stun.
//   node scripts/pack-heroes.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const OUT='public/assets/characters/',KNIGHT_HEIGHT=99,GUTTER=4,COLUMNS=16;
const VIEWS=['SE','SW','NE','NW','S','N'];
// Movement plays by stride (hero.ts): one stride is 38.4 world px of ground and the hero walks about 105 px/s, so
// a cycle of `seconds` at its authored speed spans seconds*105/38.4 strides.
const strideScale=seconds=>+(seconds*105/(88*.48/1.1)).toFixed(2);
// Picks n evenly spread frames of a clip, always keeping the last.
const spread=(list,n)=>list.length<=n?list:[...Array(n).keys()].map(i=>list[Math.round(i*(list.length-1)/(n-1))]);
const json=async p=>JSON.parse(await fs.readFile(p,'utf8'));

// A source frame: an image file, its cell rectangle and the ground pivot inside it.
async function riftRunner(){
 const dir='public/rift-runner/v1/',m=await json(dir+'manifest.json');
 const frames=(action,d)=>{const c=m.clips.find(c=>c.id===`${action}-${d}`&&c.layer==='body');if(!c)throw Error('Rift Runner has no '+action+'-'+d);
  // Painted replacements (v3) name their sheet file relative to v1; the original sheets list per-frame pivots.
  const s=m.sheets.find(s=>s.name===c.sheet);
  if(c.cellSize)return {fps:c.fps,list:c.frames.map(([col,row])=>({file:dir+s.file,rect:[col*c.cellSize,row*c.cellSize,c.cellSize,c.cellSize],pivot:c.pivot}))};
  return {fps:c.fps,list:c.frames.map(([col,row])=>({file:dir+s.file,rect:[col*256,row*256,256,256],pivot:s.frames.find(f=>f.column===col&&f.row===row).pivot}))};};
 return {id:'rift-runner',name:'Rift Runner',frames,actions:{idle:'idle',move:'run',attack:'pulse-shot',hit:'hurt',die:'death'},source:'public/rift-runner/v1/manifest.json'};
}
async function emberWarden(){
 // Painted art was previously confined to review pages. Pack it into the actual game assets.
 const dir='public/ember-warden/',atlas=await json(dir+'v3/atlas.json');
 const frames=(action,d)=>{
  // Turnaround and run study provide real unmirrored headings. The authored combat
  // animation export currently covers SE only; reuse that painted clip for other headings.
  if(d!=='SE'&&(action==='idle'||action==='run')){
   const files=action==='idle'?[`idle-${d}.png`]:[0,1,2,3].map(i=>`run-${d}-${i}.png`);
   return {fps:action==='idle'?6:8,list:files.map(file=>({file:dir+'v2/sprites/'+file,rect:[0,0,384,384],pivot:[192,320]}))};
  }
  const entries=Object.entries(atlas.frames).filter(([name])=>name.startsWith(action+'-SE-'));
  if(!entries.length)throw Error('Missing painted Ember clip '+action);
  return {fps:1000/entries[0][1].duration,list:entries.map(([,f])=>({file:dir+'v3/ember-warden-SE.png',rect:[f.frame.x,f.frame.y,f.frame.w,f.frame.h],pivot:[192,320]}))};
 };
 return {id:'ember-warden',name:'Ember Warden',frames,actions:{idle:'idle',move:'run',attack:'flame-fan',hit:'hurt',die:'death'},source:'public/ember-warden/v3/atlas.json + public/ember-warden/v2/manifest.json'};
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
 // Game clips per view: idle and move loop; attack, hit and die are one-shot poses with the knight's timing.
 const clips={},sources=[];
 const add=(name,src,fps,loop,extra={})=>{clips[name]={fps,loop,...extra,frames:src.map(f=>{sources.push(f);return sources.length-1;})};};
 for(const v of VIEWS){
  const idle=hero.frames(hero.actions.idle,v),move=hero.frames(hero.actions.move,v),attack=hero.frames(hero.actions.attack,v),hit=hero.frames(hero.actions.hit,v),die=hero.frames(hero.actions.die,v);
  add('idle-'+v,idle.list,idle.fps,true);
  add('move-'+v,move.list,move.fps,true,{strideScale:strideScale(move.list.length/move.fps)});
  add('attack-'+v,spread(attack.list,6),12,false,{impact:3});
  add('hit-'+v,spread(hit.list.slice(1),4),20,false);
  add('die-'+v,spread(die.list,8),9,false);
 }
 // One scale: the standing idle (front view) as tall as the knight's, toe to crown.
 const stand=await bounds(hero.frames(hero.actions.idle,'S').list[0]),scale=KNIGHT_HEIGHT/(stand.b-stand.t);
 const all=(await Promise.all(sources.map(bounds))).filter(Boolean);
 const ext={l:Math.min(...all.map(b=>b.l)),t:Math.min(...all.map(b=>b.t)),r:Math.max(...all.map(b=>b.r)),b:Math.max(...all.map(b=>b.b))};
 const pivot={x:Math.ceil(-ext.l*scale)+2,y:Math.ceil(-ext.t*scale)+2},cell={w:pivot.x+Math.ceil(ext.r*scale)+2,h:pivot.y+Math.ceil(ext.b*scale)+2,pivot};
 // Each frame scaled whole (pivot to pivot) into its cell, so every clip shares one ground point.
 const rows=Math.ceil(sources.length/COLUMNS),width=COLUMNS*(cell.w+GUTTER)+GUTTER,height=rows*(cell.h+GUTTER)+GUTTER,frames=[],parts=[];
 for(const [i,f] of sources.entries()){
  const col=i%COLUMNS,row=Math.floor(i/COLUMNS),x=GUTTER+col*(cell.w+GUTTER),y=GUTTER+row*(cell.h+GUTTER);
  const [sx,sy,sw,sh]=f.rect,w=Math.round(sw*scale),h=Math.round(sh*scale),left=Math.round(pivot.x-f.pivot[0]*scale),top=Math.round(pivot.y-f.pivot[1]*scale);
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
 console.log(hero.id,`${width}x${height}`,(image.length/1024).toFixed(0)+' KB',sources.length+' frames','scale '+scale.toFixed(3),'cell',cell.w+'x'+cell.h);
 return {id:hero.id,name:hero.name,image:file,revision:createHash('sha256').update(image).digest('hex').slice(0,16),portrait:'portraits/'+hero.id+'.webp',
  source:hero.source,scale:+scale.toFixed(4),atlasSize:[width,height],gutter:GUTTER,cell,
  direction:'Six unmirrored views: SE, SW, NE, NW diagonals and straight S/N; clips are named <state>-<view>',views:VIEWS,clips,frames};
}

const path=OUT+'manifest.json',manifest=await json(path);
for(const hero of (process.argv.includes('--ember-only')?[await emberWarden()]:[await riftRunner(),await emberWarden()]))manifest.characters[hero.id]=await pack(hero);
await fs.writeFile(path,JSON.stringify(manifest,null,1));
