import fs from 'node:fs/promises';import sharp from 'sharp';import {createHash} from 'node:crypto';
// Raster compositing of original imagegen materials, never the concept screenshot.
const out='public/frozen-terrain-apply/v1',root='public/frozen-terrain-review/v1';await fs.mkdir(out,{recursive:true});
const names=['snow-ground','packed-snow','frozen-dirt','cracked-ice','rocky-ground','ruined-stone-paving'];
const textures={};const hashes={};for(const n of [...names,'snow-dirt-edge','snow-ice-edge','snow-paving-edge']){const b=await fs.readFile(`${root}/${n}.png`);hashes[n]=createHash('sha256').update(b).digest('hex');textures[n]=await sharp(b).resize(512,512).removeAlpha().raw().toBuffer();}
// Annotation pixel coordinates. Magma/Plains/Undead side of this polyline is excluded.
const boundary=[[0,0],[385,0],[375,45],[350,100],[353,145],[385,173],[425,205],[445,225],[520,242],[595,262],[720,266],[790,287],[865,341],[897,390],[928,451],[970,510],[970,590],[990,654],[986,681],[959,727],[937,801],[901,850],[835,871],[750,875],[650,892],[565,911],[500,912],[449,877],[395,820],[363,791],[316,787],[290,805],[280,837],[243,869],[190,904],[150,919],[90,960],[0,1016]];
const scale=6,anchor=[637,480],origin=[577,320];const toWorld=([x,y])=>[origin[0]+(x-anchor[0])*scale,origin[1]+(y-anchor[1])*scale];
const poly=boundary.map(toWorld);const world=(p)=>[577+(p.u-p.v)*64,-160+(p.u+p.v-921)*32];
const mapPoint=([x,y])=>({u:460.5+(x-577)/128+(y+160)/64,v:460.5+(y+160)/64-(x-577)/128});
const ff=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier.json'));const paths=ff.placements.filter(p=>/road|trail|approach|avenue|crosswalk/i.test(p.zone)).filter((p,i)=>i%3===0).map(world);
const paving=ff.placements.filter(p=>['paving','floor-sunk','foundation'].includes(p.a)).map(world);
const rocks=ff.placements.filter(p=>/rubble|stone-chips/.test(p.a)).map(world);
const seg=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
function inside(x,y){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
const near=(x,y,ps)=>{let d=1e9;for(const p of ps)d=Math.min(d,Math.hypot(x-p[0],y-p[1]));return d;};
const clamp=n=>Math.max(0,Math.min(1,n));const smooth=(a,b,n)=>{let t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
function sample(n,x,y){const u=(((x+2*y))*.8%512+512)%512|0,v=(((2*y-x))*.8%512+512)%512|0;const i=(v*512+u)*3;return textures[n].subarray(i,i+3);}
const assets=[],placements=[],coverage=Object.fromEntries(names.map(n=>[n,0]));const chunk=768,res=384;
for(let cy=-4;cy<=4;cy++)for(let cx=-5;cx<=3;cx++){
 const x0=cx*chunk,y0=cy*chunk,b=Buffer.alloc(res*res*4);let pixels=0;
 for(let py=0;py<res;py++)for(let px=0;px<res;px++){
 const x=x0+px*2+1,y=y0+py*2+1;if(!inside(x,y))continue;
 let edge=1e9;for(let i=0;i<poly.length;i++)edge=Math.min(edge,seg([x,y],poly[i],poly[(i+1)%poly.length]));
 // Inward feather only: no pixels cross the annotated boundary.
 const alpha=smooth(0,36,edge);if(!alpha)continue;
 const iceX=-2160+220*Math.sin((y+1000)/1100),iceD=Math.abs(x-iceX);
 let name='snow-ground',mix=0,edgeName='';
 const pond=Math.min(Math.hypot((x+410)/1.15,y-1430),Math.hypot((x-1380)/1.1,y-1460));
 if(iceD<260||pond<215){name='cracked-ice';mix=1-smooth(155,260,Math.min(iceD,pond*260/215));edgeName='snow-ice-edge';}
 const path=near(x,y,paths);if(path<66&&mix<.4){name='packed-snow';mix=1-smooth(24,66,path);}
 const dirt=near(x,y,paving);if(dirt<155&&name!=='cracked-ice'){name='frozen-dirt';mix=1-smooth(70,155,dirt);edgeName='snow-dirt-edge';}
 if(dirt<68){name='ruined-stone-paving';mix=1-smooth(38,68,dirt);edgeName='snow-paving-edge';}
 const rock=near(x,y,rocks);if(rock<68&&dirt>100&&path>60){name='rocky-ground';mix=1-smooth(22,68,rock);}
 const snow=sample('snow-ground',x,y),other=sample(name,x,y),i=(py*res+px)*4;
 for(let c=0;c<3;c++)b[i+c]=Math.round(snow[c]*(1-mix)+other[c]*mix);
 // Original pair edge artwork contributes through intermediate bands, with outer joins blended.
 if(edgeName&&mix>.08&&mix<.92){let tx=Math.floor(mix*511),ty=((Math.floor((x+y)/2)%512)+512)%512,e=textures[edgeName],k=(ty*512+tx)*3,w=.45*Math.sin(mix*Math.PI);for(let c=0;c<3;c++)b[i+c]=Math.round(b[i+c]*(1-w)+e[k+c]*w);}
 b[i+3]=Math.round(alpha*255);coverage[name]++;pixels++;
 }
 if(!pixels)continue;const id=`ground:frozen-region-${cx+5}-${cy+3}`,file=`surface-${cx+5}-${cy+3}.png`;
 await sharp(b,{raw:{width:res,height:res,channels:4}}).png().toFile(`${out}/${file}`);
 assets.push({id,label:'Frozen terrain segment',file:`/frozen-terrain-apply/v1/${file}`,width:chunk,height:chunk,pivot:[.5,.5],blocks:[],layer:'ground',footprint:6,hidden:true});placements.push({id:'frozen-v1-'+file.replace('.png',''),asset:id,...mapPoint([x0+chunk/2,y0+chunk/2])});
}
// Palette patches use the same originals, with inward alpha and 2:1 ground projection.
for(const n of names){const raw=await sharp(`${root}/${n}.png`).resize(384,384).ensureAlpha().raw().toBuffer();for(let y=0;y<384;y++)for(let x=0;x<384;x++)raw[(y*384+x)*4+3]=Math.round(255*smooth(0,28,Math.min(x,y,383-x,383-y)));await sharp(raw,{raw:{width:384,height:384,channels:4}}).png().toFile(`${out}/${n}.png`);assets.push({id:'ground:frozen-'+n,label:n.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '),file:`/frozen-terrain-apply/v1/${n}.png`,width:768,height:384,pivot:[.5,.5],blocks:[],layer:'ground',footprint:6});}
await fs.writeFile(`${out}/manifest.json`,JSON.stringify({version:1,sourceTask:'lrtskdrxdwsrkwnqhiljqgzo',annotation:'DA164a1a1fb84052585c51d9b4',boundary,registration:{scale,anchor,origin},coverage,hashes,assets,placements},null,2));console.log({segments:placements.length,coverage});
