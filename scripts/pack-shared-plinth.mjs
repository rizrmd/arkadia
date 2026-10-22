import sharp from 'sharp';
import {matchStone,stoneMean} from './gateway-palette.mjs';

// Trim only transparent margins; retain the generated alpha, including edge AA.
const input='assets-src/gate-seamless/shared-plinth-pillar-source.png';
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let left=info.width,top=info.height,right=0,bottom=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 if(data[(y*info.width+x)*4+3]<=128)continue;
 left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
}
const base=await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(260,305,{fit:'fill'}).png().toBuffer();
const pixels=await sharp(base).ensureAlpha().raw().toBuffer();
matchStone(pixels,await stoneMean('public/modular-stronghold/v2/gate-connector-left-v2.png',{left:30,top:75,width:70,height:130}));
const trimmed=await sharp(pixels,{raw:{width:260,height:305,channels:4}}).png().toBuffer();
await sharp(trimmed).png().toFile('public/modular-stronghold/v2/gate-connector-left-v3.png');
await sharp(trimmed).flop().png().toFile('public/modular-stronghold/v2/gate-connector-right-v3.png');
console.log({left,top,right,bottom});
