import sharp from 'sharp';
const pieces=[];
for(let t=1;t<=30;t++)pieces.push({input:await sharp(`docs/lumber-panels/target-${String(t).padStart(2,'0')}.png`).extract({left:225,top:112,width:550,height:425}).resize(330,255).toBuffer(),left:(t-1)%5*330,top:Math.floor((t-1)/5)*255});
await sharp({create:{width:1650,height:1530,channels:4,background:'#152027'}}).composite(pieces).png().toFile('docs/lumber-panels/coverage.png');
