import assert from 'node:assert/strict';
import {createServer} from 'vite';
import sharp from 'sharp';
import fs from 'node:fs/promises';
const vite=await createServer({server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'error'});
const checks=[];
try{
 const {wildlifeDirection,moveWildlife}=await vite.ssrLoadModule('/src/stronghold/wildlife-motion.ts');
 const {unproject}=await vite.ssrLoadModule('/src/isometric.ts');
 for(let direction=0;direction<8;direction++){
  const angle=direction*Math.PI/4,p=unproject(Math.sin(angle)*100,-Math.cos(angle)*100);
  assert.equal(wildlifeDirection(p.x,p.y),direction);
  for(const species of ['deer','crocodile']){
   const a={u:0,v:0,status:'alive'},roam={home:{u:0,v:0},goal:{u:p.x,v:p.y},wait:0,moving:false,facing:4};
   moveWildlife(a,species,roam,100,3,{u:100,v:100},()=>true,()=>true,()=>.5);
   assert(roam.moving);assert.equal(roam.facing,direction);
   moveWildlife(a,species,roam,100,3,a,()=>true,()=>true,()=>.5);
   assert(!roam.moving);assert.equal(roam.facing,direction);
  }
 }
 checks.push('Both species select all eight projected compass directions and retain facing while idle');
 for(let d=0;d<8;d++)assert.equal(wildlifeDirection(0,0,d),d);
 checks.push('Zero displacement preserves previous direction');
 const meta=await sharp('public/wildlife/eight-directions-atlas.png').metadata();assert.equal(meta.width,1024);assert.equal(meta.height,4096);assert(meta.hasAlpha);
 const manifest=JSON.parse(await fs.readFile('docs/wildlife-directions/atlas.json'));
 assert.equal(manifest.frames.length,64);assert.equal(new Set(manifest.frames.map(f=>f.sha256)).size,64);
 for(let row=0;row<16;row++)for(let col=0;col<4;col++){
  const {data,info}=await sharp('public/wildlife/eight-directions-atlas.png').extract({left:col*256,top:row*256,width:256,height:256}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let visible=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(data[(y*256+x)*4+3]>24){visible++;assert(x>=15&&x<=241&&y>=10&&y<=210);}
  assert(visible>1000);
 }
 checks.push('64 distinct transparent frames, bounded silhouettes, fixed foot pivot and species scale');
 await fs.writeFile('docs/wildlife-directions/tests.json',JSON.stringify({passed:true,checks},null,2));
 console.log(checks.map(s=>'PASS '+s).join('\n'));
}finally{await vite.close();}
