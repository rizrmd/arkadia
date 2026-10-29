import {chromium} from 'playwright';import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';import {launchOptions} from '../typography/browser.mjs';
// Close-up of one Frozen Frontier area, drawn from the atlas exactly as frontier-view.ts draws it (ground bands, flips,
// ground-plane turns, caps over their walls), on a plain snow ground. For composing ruins without booting the game;
// FOOT=1 overlays the solid footprints (red) and path corridors (blue).
//   node scripts/frozen-frontier-map/preview.mjs u0 v0 u1 v1 out.png [zoom=2]      (court-local tiles)
const [u0,v0,u1,v1]=process.argv.slice(2,6).map(Number),out=process.argv[6]||'preview.png',K=Number(process.argv[7]||2);
const data=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier.json','utf8'));
const catalog=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8'));
const map=JSON.parse(await fs.readFile('src/world/maps/arkodia-01.json','utf8'));
const prefab=JSON.parse(await fs.readFile('src/stronghold/prefabs/stronghold.json','utf8'));
const OU=map.prefabs[0].at.u-prefab.anchor.u,OV=map.prefabs[0].at.v-prefab.anchor.v;
const items=data.placements.map((p,i)=>{const k=data.kit[p.a];return {...p,i,u:p.u-OU,v:p.v-OV,s:p.s??1,layer:k.layer,band:k.band==='under'?-1:k.band==='over'?1:0,block:k.block,sprite:catalog.assets[p.a]};})
 .filter(p=>p.u>u0-3&&p.u<u1+3&&p.v>v0-3&&p.v<v1+3);
const paths=process.env.FOOT?JSON.parse(await fs.readFile(process.env.PATHS||'/dev/null','utf8').catch(()=>'[]')):[];
const atlas='file://'+path.resolve('public')+catalog.atlas;
const html=`<!doctype html><body style="margin:0"><canvas id=c></canvas><script>
const items=${JSON.stringify(items)},K=${K},FOOT=${!!process.env.FOOT},paths=${JSON.stringify(paths)};
const P=(u,v)=>[(u-v)*64,(u+v)*32];
const corners=[P(${u0},${v0}),P(${u1},${v0}),P(${u1},${v1}),P(${u0},${v1})];
const x0=Math.min(...corners.map(c=>c[0])),x1=Math.max(...corners.map(c=>c[0])),y0=Math.min(...corners.map(c=>c[1]))-120,y1=Math.max(...corners.map(c=>c[1]));
const c=document.getElementById('c');c.width=Math.ceil((x1-x0)*K);c.height=Math.ceil((y1-y0)*K);const g=c.getContext('2d');
g.fillStyle='#e2e9f1';g.fillRect(0,0,c.width,c.height);
// A little low-frequency mottling so decals are judged against something like the real snow.
for(let i=0;i<900;i++){const x=Math.random()*c.width,y=Math.random()*c.height,r=8+Math.random()*40*K;g.fillStyle=Math.random()<.5?'rgba(200,212,226,.18)':'rgba(246,249,252,.25)';g.beginPath();g.ellipse(x,y,r,r/2,0,0,7);g.fill();}
g.translate(-x0*K,-y0*K);g.scale(K,K);
g.strokeStyle='rgba(120,140,160,.25)';g.lineWidth=1/K;for(let t=-10;t<=50;t++){g.beginPath();g.moveTo(...P(t,-10));g.lineTo(...P(t,50));g.stroke();g.beginPath();g.moveTo(...P(-10,t));g.lineTo(...P(50,t));g.stroke();}
const atlas=new Image();atlas.onload=()=>{
 const draw=it=>{const [x,y]=P(it.u,it.v),sp=it.sprite,w=sp.world[0]*it.s,h=sp.world[1]*it.s;g.save();g.translate(x,y-(it.lift||0));
  if(it.layer==='ground'&&it.r){const r=it.r*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r);g.transform(cs,.5*sn,-2*sn,cs,0,0);}
  if(it.f)g.scale(-1,1);g.drawImage(atlas,...sp.frame,-w*sp.pivot[0],-h*sp.pivot[1],w,h);g.restore();};
 items.filter(i=>i.layer==='ground').sort((a,b)=>a.band-b.band||(a.u+a.v)-(b.u+b.v)||a.i-b.i).forEach(draw);
 items.filter(i=>i.layer!=='ground').sort((a,b)=>(a.u+a.v+(a.layer==='cap'?.0016:0))-(b.u+b.v+(b.layer==='cap'?.0016:0))||a.i-b.i).forEach(draw);
 if(FOOT){for(const it of items)for(let [a,b,cc,d] of it.block){if(it.f)[a,b,cc,d]=[b,a,d,cc];g.beginPath();[[a,b],[cc,b],[cc,d],[a,d]].forEach(([p,q],j)=>{const [x,y]=P(it.u+p*it.s,it.v+q*it.s);j?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();g.fillStyle='rgba(220,30,30,.3)';g.fill();}
  for(const p of paths){const [x,y]=P(p.u,p.v);g.beginPath();g.ellipse(x,y,p.r*90,p.r*45,0,0,7);g.strokeStyle='rgba(30,80,220,.35)';g.stroke();}
  g.font='bold 9px sans-serif';g.fillStyle='#123';for(let u=Math.ceil(${u0});u<=${u1};u++)for(let v=Math.ceil(${v0});v<=${v1};v++){const [x,y]=P(u,v);g.fillText(u+','+v,x-8,y+3);}}
 document.body.dataset.done=1;};atlas.src=${JSON.stringify(atlas)};
</script>`;
const tmp=path.resolve(process.env.TMPDIR||'/tmp',`ff-preview-${process.pid}.html`);await fs.writeFile(tmp,html);
const browser=await chromium.launch(launchOptions(['--allow-file-access-from-files']));
try{const page=await browser.newPage({viewport:{width:2000,height:1400}});await page.goto('file://'+tmp);await page.waitForFunction(()=>document.body.dataset.done,null,{timeout:60000});
 const png=await page.locator('canvas').screenshot();await sharp(png).toFile(out);console.log('wrote',out);}
finally{await browser.close();await fs.unlink(tmp);}
