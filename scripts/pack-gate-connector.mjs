import sharp from 'sharp';

// Trim only transparent margins; retain the generated alpha, including edge AA.
const input='assets-src/gate-seamless/connecting-pillar-source.png';
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let left=info.width,top=info.height,right=0,bottom=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 if(data[(y*info.width+x)*4+3]<=128)continue;
 left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
}
await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1})
 .resize(140,360,{fit:'fill'}).png().toFile('public/modular-stronghold/v2/gate-connector.png');
