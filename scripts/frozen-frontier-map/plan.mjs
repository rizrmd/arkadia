import {chromium} from 'playwright';import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';import {launchOptions} from '../typography/browser.mjs';
// Placement map for the Knowledge page: the whole Frozen Frontier drawn from its real sprites in the game's 2:1
// projection around the Stronghold court (outline), the raised terrain (outlines), solid footprints (red) and the
// zone names. node scripts/frozen-frontier-map/plan.mjs [out.webp]
const out=process.argv[2]||'docs/frozen-frontier-map/placement-map.webp';
const data=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier.json','utf8'));
const sprites=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8')).assets;
const map=JSON.parse(await fs.readFile('src/world/maps/arkodia-01.json','utf8'));
const prefab=JSON.parse(await fs.readFile('src/stronghold/prefabs/stronghold.json','utf8'));
const OU=map.prefabs[0].at.u-prefab.anchor.u,OV=map.prefabs[0].at.v-prefab.anchor.v;
const items=data.placements.map(p=>{const k=data.kit[p.a];return {...p,u:p.u-OU,v:p.v-OV,s:p.s??1,layer:k.layer,band:k.band==='under'?-1:k.band==='over'?1:0,block:k.block.map(r=>p.f?[r[1],r[0],r[3],r[2]]:r),sprite:sprites[p.a]};});
const atlas='file://'+path.resolve('public')+JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8')).atlas;
const relief=map.terrain.features.map(f=>(f.outline??[]).map(([u,v])=>[u-OU,v-OV]));
const html=`<!doctype html><body style="margin:0"><canvas id=c></canvas><script>
const items=${JSON.stringify(items)},relief=${JSON.stringify(relief)},N=${prefab.court.size};
const P=(u,v)=>[(u-v)*64,(u+v)*32];
let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;for(const it of items){const [x,y]=P(it.u,it.v);x0=Math.min(x0,x-140);x1=Math.max(x1,x+140);y0=Math.min(y0,y-280);y1=Math.max(y1,y+60);}
const K=.42,c=document.getElementById('c');c.width=Math.ceil((x1-x0)*K);c.height=Math.ceil((y1-y0)*K)+60;const g=c.getContext('2d');
g.fillStyle='#dfe7ee';g.fillRect(0,0,c.width,c.height);g.translate(-x0*K,-y0*K+40);g.scale(K,K);
const poly=(pts,fill,stroke,w=3)=>{g.beginPath();pts.forEach(([u,v],i)=>i?g.lineTo(...P(u,v)):g.moveTo(...P(u,v)));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.stroke();}};
g.strokeStyle='rgba(120,140,160,.25)';g.lineWidth=1.5;for(let t=-20;t<=45;t+=1){g.beginPath();g.moveTo(...P(t,-20));g.lineTo(...P(t,45));g.stroke();g.beginPath();g.moveTo(...P(-20,t));g.lineTo(...P(45,t));g.stroke();}
poly([[0,0],[N,0],[N,N],[0,N]],'rgba(176,150,110,.35)','#7a6040',5);
for(const r of relief)poly(r,'rgba(150,160,175,.45)','#5a6878',4);
const atlas=new Image();new Promise(r=>{atlas.onload=r;atlas.src=${JSON.stringify(atlas)};}).then(()=>{
 // As frontier-view.ts draws them: mirrored, ground decals turned in the ground plane and sorted in their bands.
 const draw=it=>{const [x,y]=P(it.u,it.v),w=it.sprite.world[0]*it.s,h=it.sprite.world[1]*it.s;g.save();g.translate(x,y-(it.lift||0));
  if(it.layer==='ground'&&it.r){const r=it.r*Math.PI/180;g.transform(Math.cos(r),.5*Math.sin(r),-2*Math.sin(r),Math.cos(r),0,0);}
  if(it.f)g.scale(-1,1);g.drawImage(atlas,...it.sprite.frame,-w*it.sprite.pivot[0],-h*it.sprite.pivot[1],w,h);g.restore();};
 items.filter(i=>i.layer==='ground').sort((a,b)=>a.band-b.band||a.u+a.v-b.u-b.v).forEach(draw);
 for(const it of items)for(const [a,b,cc,d] of it.block)poly([[it.u+a*it.s,it.v+b*it.s],[it.u+cc*it.s,it.v+b*it.s],[it.u+cc*it.s,it.v+d*it.s],[it.u+a*it.s,it.v+d*it.s]],'rgba(220,30,30,.35)',null);
 items.filter(i=>i.layer!=='ground').sort((a,b)=>a.u+a.v-b.u-b.v||(a.layer==='cap')-(b.layer==='cap')).forEach(draw);
 const zones={};for(const it of items){(zones[it.zone]??=[]).push(it);}
 g.font='bold 44px sans-serif';g.textAlign='center';
 for(const [z,l] of Object.entries(zones)){const u=l.reduce((a,i)=>a+i.u,0)/l.length,v=l.reduce((a,i)=>a+i.v,0)/l.length,[x,y]=P(u,v);g.lineWidth=8;g.strokeStyle='rgba(255,255,255,.9)';g.strokeText(z,x,y+70);g.fillStyle='#1d3557';g.fillText(z,x,y+70);}
 const [sx,sy]=P(N/2,N/2);g.font='bold 60px sans-serif';g.lineWidth=10;g.strokeText('Stronghold court',sx,sy);g.fillStyle='#5a3d1a';g.fillText('Stronghold court',sx,sy);
 document.body.dataset.done=1;});
</script>`;
const tmp=path.resolve(process.env.TMPDIR||'/tmp','ff-plan.html');await fs.writeFile(tmp,html);
const browser=await chromium.launch(launchOptions(['--allow-file-access-from-files']));
try{const page=await browser.newPage({viewport:{width:2400,height:1800}});await page.goto('file://'+tmp);await page.waitForFunction(()=>document.body.dataset.done,null,{timeout:60000});
 const png=await page.locator('canvas').screenshot();await fs.mkdir(path.dirname(out),{recursive:true});await sharp(png).webp({quality:82}).toFile(out);console.log('wrote',out,(await sharp(png).metadata()).width);}
finally{await browser.close();}
