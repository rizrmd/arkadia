// Extend the existing painted tree kit with Ember icons; shared rings, pips and panel art stay in skill-tree/v1.
// Flame Fan reuses the hero-picker master. Cinder Step, Ember Snare and molten attacks are extracted from the
// approved Stage 1 painted reference. Blessings and concept silhouettes reuse the shared painted kit in ember colours.
import sharp from 'sharp';import fs from 'node:fs/promises';
const out='public/skill-tree/ember-v1';await fs.mkdir(out,{recursive:true});
const defs=[
 ['flame-fan','flame-fan',null],['cinder-step',null,[380,455,49]],['ember-snare',null,[595,455,49]],
 ['molten-cleave',null,[1135,378,36]],['molten-slam',null,[1135,546,36]],
 ['inferno-avatar','phantom-legion'],['caldera-eruption','event-horizon'],['solar-fan','rift-lance'],
 ...['second-wind','titan-strike','arc-nova','soul-feast','chrono-surge','furnace-heart','ascendant-star'].map(id=>[id,id])
];
const frames={};const previews=[];
for(const [id,source,crop] of defs){
 const passive=['second-wind','titan-strike','arc-nova','soul-feast','chrono-surge','furnace-heart','ascendant-star'].includes(id),size=passive?112:94,px=size*3;
 let art;
 if(crop){const [cx,cy,r]=crop;art=await sharp('public/ember-tree-stage1/generated-desktop.png').extract({left:cx-r,top:cy-r,width:r*2,height:r*2}).resize(px,px).ensureAlpha().raw().toBuffer();}
 else if(id==='flame-fan')art=await sharp('assets-src/choosing-hero/v1/skill-flame-fan.png').extract({left:327,top:325,width:600,height:600}).resize(px,px).ensureAlpha().raw().toBuffer();
 else art=await sharp(`public/skill-tree/v1/@3x/icon-${source}.png`).resize(px,px).ensureAlpha().raw().toBuffer();
 const colour=Buffer.from(art),dim=Buffer.from(art);
 for(let i=0;i<px*px;i++){
  const j=i*4,v=Math.round(art[j]*.2126+art[j+1]*.7152+art[j+2]*.0722);
  if(id!=='flame-fan'&&id!=='cinder-step'&&id!=='ember-snare'){
   colour[j]=Math.min(255,v*1.6+10);colour[j+1]=Math.min(240,v*.95);colour[j+2]=Math.min(180,v*.42);
  }
  dim[j]=dim[j+1]=dim[j+2]=v;
  if(!passive){const a=Math.hypot(i%px-px/2,Math.floor(i/px)-px/2)<px/2?255:0;colour[j+3]=dim[j+3]=a;}
 }
 for(const [suffix,data] of [['',colour],['-dim',dim]]){
  const name=`icon-${id}${suffix}`;frames[name]={width:size,height:size};
  for(const scale of [1,2,3]){await fs.mkdir(`${out}/@${scale}x`,{recursive:true});await sharp(data,{raw:{width:px,height:px,channels:4}}).resize(size*scale,size*scale).png().toFile(`${out}/@${scale}x/${name}.png`);}
 }
 previews.push({input:await sharp(colour,{raw:{width:px,height:px,channels:4}}).resize(94,94).png().toBuffer(),left:(previews.length%5)*140+23,top:Math.floor(previews.length/5)*140+10});
}
await fs.writeFile(`${out}/manifest.json`,JSON.stringify({frames},null,2)+'\n');
await fs.mkdir('docs/ember-tree',{recursive:true});await sharp({create:{width:700,height:420,channels:4,background:'#161210'}}).composite(previews).png().toFile('docs/ember-tree/icon-sheet.png');
console.log('Built 15 Ember icons and dim variants at 1x/2x/3x');
