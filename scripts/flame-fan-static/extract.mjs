import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Irregular hand-inspected ownership polygons; coordinates refer to the original 1586×992 atlas.
const rows=[
[[0,0,330,310],[335,50,270,235],[608,30,218,265],[830,55,235,230],[1070,50,265,235],[1335,50,251,235]],
[[0,315,382,155],[355,280,262,213],[600,275,238,220],[815,285,280,218],[1080,272,290,220],[1340,290,246,175]],
[[0,470,329,163],[330,469,278,165],[605,455,279,175],[880,480,328,145],[1205,420,205,225],[1420,475,140,170]],
[[30,610,174,228],[207,614,256,225],[463,632,355,204],[813,598,271,240],[1080,650,301,184],[1370,660,210,179]],
[[65,840,143,125],[258,836,225,145],[522,840,178,140],[790,836,174,140],[1040,816,194,176],[1272,812,314,180]]];
const names=['crust-a','crust-b','perimeter','fragments','scorch','ash','straight','bend','fork','tee','cross','terminal','low-a','low-b','low-c','ribbon','accent','lick','wisp','puff','bank','billow','haze','ash-puff','ember','spark','coal','char','glow','cinders'];
const polygons={
6:[[0,35],[285,10],[355,0],[382,90],[300,145],[0,155]],
12:[[0,100],[42,52],[84,22],[135,25],[195,0],[250,2],[260,52],[300,45],[329,100],[329,163],[0,163]],
13:[[0,90],[24,35],[55,0],[90,0],[104,65],[150,38],[165,70],[229,35],[250,45],[278,110],[278,165],[0,165]],
14:[[0,125],[34,80],[55,25],[100,0],[154,0],[172,62],[210,70],[237,52],[279,90],[279,175],[0,175]],
15:[[0,70],[70,45],[145,0],[170,20],[190,70],[258,40],[285,45],[295,95],[328,105],[328,145],[0,145]],
16:[[0,160],[30,100],[54,65],[70,13],[115,0],[150,30],[167,84],[190,110],[205,185],[205,225],[0,225]]};
const exclude={7:[[0,170,80,43]],8:[[0,185,95,35]],10:[[165,145,125,75]],13:[[0,145,278,20]],14:[[0,0,130,25]],15:[[0,128,328,17]],18:[[0,0,174,18]],19:[[0,0,256,14]],21:[[0,0,60,32]],22:[[0,165,301,19]],23:[[0,155,210,24]]};
function inside(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>y)!=(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])c=!c;}return c;}
const source=await fs.readFile('public/flame-fan-static/source.png');const stats={attachment:'DAfcba584e98ce6d1456a9f8e0',sha256:createHash('sha256').update(source).digest('hex'),width:1586,height:992,alphaFloor:6,notes:'Original RGB retained. Nonuniform crops with ownership masks remove adjacent parts; 3px crop-edge feather suppresses hard glow seams. Source glow margins overlap: isolated edge glow cannot be recovered exactly.',parts:[]};
for(let i=0;i<30;i++){
 const [left,top,width,height]=rows.flat()[i]; const {data}=await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});let removed=0,border=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const k=(y*width+x)*4;const old=data[k+3];let a=old;if((exclude[i]||[]).some(([l,t,w,h])=>x>=l&&x<l+w&&y>=t&&y<t+h)||a<6||(polygons[i]&&!inside(x,y,polygons[i])))a=0;const edge=Math.min(x,y,width-1-x,height-1-y);a=Math.round(a*Math.min(1,edge/3));if(old&&!a)removed++;if(edge===0&&old>32)border++;data[k+3]=a;}
 await sharp(data,{raw:{width,height,channels:4}}).png().toFile(`public/flame-fan-static/${names[i]}.png`);stats.parts.push({name:names[i],index:i,rect:[left,top,width,height],ownershipPolygon:polygons[i]||null,excludedRects:exclude[i]||[],removedPixels:removed,sourceBorderPixelsAbove32:border});
}
await fs.writeFile('public/flame-fan-static/manifest.json',JSON.stringify(stats,null,2));
const thumbs=await Promise.all(stats.parts.map(async(p,i)=>({input:await sharp(`public/flame-fan-static/${p.name}.png`).resize(190,130,{fit:'contain',background:'#252b32'}).png().toBuffer(),left:(i%6)*190,top:Math.floor(i/6)*150})));
await sharp({create:{width:1140,height:750,channels:4,background:'#252b32'}}).composite(thumbs).png().toFile('docs/flame-fan-static/extracted-parts.png');
console.log('Extracted 30 parts; original source retained.');
