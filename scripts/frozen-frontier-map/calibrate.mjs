import {chromium} from 'playwright';import fs from 'node:fs/promises';import path from 'node:path';import {launchOptions} from '../typography/browser.mjs';
// Collision calibration sheet: every Frozen Frontier sprite drawn at its ground pivot over the 2:1 tile grid, with its
// block rectangles (src/world/maps/frozen-frontier.json kit) in red and a 1.8 m hero bar for scale.
//   node scripts/frozen-frontier-map/calibrate.mjs [out.png]
const out=process.argv[2]||'docs/frozen-frontier-map/collision-calibration.png';
const root=path.resolve('public');
const catalog=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8'));
const {kit}=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier.json','utf8'));
const atlas='file://'+root+catalog.atlas,items=Object.entries(catalog.assets).map(([id,a])=>({id,...a,layer:kit[id].layer,block:kit[id].block}));
const html=`<!doctype html><body style="margin:0;background:#cfd8df"><canvas id=c></canvas><script>
const items=${JSON.stringify(items)},atlas=new Image(),CW=420,CH=420,COLS=5;
const c=document.getElementById('c');c.width=CW*COLS;c.height=Math.ceil(items.length/COLS)*CH;const g=c.getContext('2d');
const P=(u,v)=>[(u-v)*64,(u+v)*32];
new Promise(r=>{atlas.onload=r;atlas.src=${JSON.stringify(atlas)};}).then(()=>{
 items.forEach((it,k)=>{const ox=(k%COLS)*CW+CW/2,oy=Math.floor(k/COLS)*CH+CH-60,s=Math.min(2.6,330/Math.max(it.world[0],it.world[1]*1.1));
  g.save();g.translate(ox,oy);g.scale(s,s);
  g.strokeStyle='#8899aa';g.lineWidth=1/s;for(let t=-3;t<=3;t++){g.beginPath();g.moveTo(...P(t,-3));g.lineTo(...P(t,3));g.stroke();g.beginPath();g.moveTo(...P(-3,t));g.lineTo(...P(3,t));g.stroke();}
  const [w,h]=it.world;g.globalAlpha=.9;g.drawImage(atlas,...it.frame,-w*it.pivot[0],-h*it.pivot[1],w,h);g.globalAlpha=1;
  for(const [u0,v0,u1,v1] of it.block){g.beginPath();[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].forEach(([u,v],i)=>i?g.lineTo(...P(u,v)):g.moveTo(...P(u,v)));g.closePath();g.fillStyle='rgba(230,30,30,.35)';g.fill();g.strokeStyle='#d00';g.lineWidth=1.5/s;g.stroke();}
  g.fillStyle='#e33';g.fillRect(-2/s,-2/s,4/s,4/s);
  g.fillStyle='rgba(20,40,160,.8)';g.fillRect(w*.5+6,-66.6,5,66.6);
  g.restore();g.fillStyle='#123';g.font='bold 15px sans-serif';g.fillText(it.id+' · '+it.layer+' · x'+s.toFixed(2),ox-CW/2+8,oy-CH+80);
 });document.body.dataset.done=1;});
</script>`;
const tmp=path.resolve(process.env.TMPDIR||'/tmp','ff-calibrate.html');await fs.writeFile(tmp,html);
const browser=await chromium.launch(launchOptions(['--allow-file-access-from-files']));
try{const page=await browser.newPage({viewport:{width:2100,height:2600}});await page.goto('file://'+tmp);await page.waitForFunction(()=>document.body.dataset.done,null,{timeout:60000});
 await fs.mkdir(path.dirname(out),{recursive:true});await page.locator('canvas').screenshot({path:out});console.log('wrote',out);}
finally{await browser.close();}
