import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const sha=async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex');
const components=['frame','charcoal','hammer','header','gold','wood','clock','tick','divider','button-disabled'];
const manifest={generation:'Built-in image_gen: new Mine portrait; reuse approved imagegen Core kit-v2 components.',portrait:{file:'/mine-panels/kit/mine.png',sha256:await sha('public/mine-panels/kit/mine.png')},components:await Promise.all(components.map(async n=>({file:`/core-upgrade/kit-v2/${n}.png`,sha256:await sha(`public/core-upgrade/kit-v2/${n}.png`)}))),targets:Array.from({length:30},(_,i)=>({target:i+1,operation:i?'Upgrade':'Build',from:i,gold:Math.ceil(150*1.25**i),wood:Math.ceil(100*1.25**i),minutes:Math.ceil(3*1.2**i),requiredCompletedCore:i+1,portrait:'/mine-panels/kit/mine.png',capture:`/mine-panels/target-${String(i+1).padStart(2,'0')}.png`})),transactionsAvailable:false};
await fs.writeFile('public/mine-panels/kit/manifest.json',JSON.stringify(manifest,null,2));
const tiles=[];for(let i=0;i<30;i++){const b=await sharp(`docs/mine-panels/target-${String(i+1).padStart(2,'0')}.png`).extract({left:230,top:65,width:540,height:478}).resize(270,239).png().toBuffer();tiles.push({input:b,left:(i%5)*270,top:Math.floor(i/5)*239});}
await sharp({create:{width:1350,height:1434,channels:4,background:'#25323b'}}).composite(tiles).png().toFile('docs/mine-panels/all-targets.png');
console.log('Packaged thirty target captures and bitmap provenance manifest');
