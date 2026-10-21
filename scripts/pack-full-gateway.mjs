import sharp from 'sharp';import fs from 'node:fs/promises';
const source='assets-src/full-gateway/generated.png',out='public/modular-stronghold/v2',m=await sharp(source).metadata();
if(!m.hasAlpha||m.width%4||m.height%4)throw Error('Expected transparent 4x4 gateway atlas');
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height,seen=new Uint8Array(w*h),stack=new Int32Array(w*h),components=[];
// The generated grid has unequal outer margins. Find complete gateway silhouettes instead of cutting through towers.
for(let a=0;a<w*h;a++){if(seen[a]||data[a*4+3]<128)continue;let n=0,head=0;stack[n++]=a;seen[a]=1;let l=w,t=h,r=0,b=0;
 while(head<n){const q=stack[head++],x=q%w,y=Math.floor(q/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
  for(const v of [x?q-1:-1,x<w-1?q+1:-1,y?q-w:-1,y<h-1?q+w:-1])if(v>=0&&!seen[v]&&data[v*4+3]>=128){seen[v]=1;stack[n++]=v;}}
 if(n>10000)components.push({l,t,r,b});
}
components.sort((a,b)=>Math.round(a.t/240)-Math.round(b.t/240)||a.l-b.l);if(components.length!==16)throw Error('Expected 16 complete gateway silhouettes');
const frame={w:384,h:256},parts=[],registration=[];
for(let i=0;i<16;i++){
 const box=components[i],left=Math.round((box.l+box.r)/2-184),top=box.b-228;
 const raw=await sharp(source).extract({left,top:Math.max(0,top),width:368,height:Math.min(232,h-Math.max(0,top))}).resize(384,244,{fit:'contain',position:'bottom',background:'#00000000'}).extend({top:6,bottom:6,left:0,right:0,background:'#00000000'}).png().toBuffer();
 parts.push({input:raw,left:i%4*frame.w,top:Math.floor(i/4)*frame.h});registration.push({frame:i,sourceBounds:box});

}
// Freeze all masonry, banners, torches and silhouette pixels to the approved closed frame.
// Only the arched doorway keeps the existing generated motion; every output is still a full gateway frame.
const reference=await sharp(parts[0].input).ensureAlpha().raw().toBuffer();
const aperture={left:146,right:242,springY:134,rise:23,bottom:216};
for(let i=0;i<parts.length;i++){
 const pixels=await sharp(parts[i].input).ensureAlpha().raw().toBuffer();
 for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++){
  const dx=(x-194)/48,inside=x>=aperture.left&&x<=aperture.right&&y<=aperture.bottom&&y>=aperture.springY-aperture.rise*Math.sqrt(Math.max(0,1-dx*dx));
  if(!inside){const p=(y*frame.w+x)*4;reference.copy(pixels,p,p,p+4);}
 }
 parts[i].input=await sharp(pixels,{raw:{width:frame.w,height:frame.h,channels:4}}).png().toBuffer();
 if(i===0||i===15)await sharp(parts[i].input).webp({lossless:true}).toFile(out+`/full-gateway-v3-${i?'open':'closed'}.webp`);
}
await sharp({create:{width:frame.w*4,height:frame.h*4,channels:4,background:'#00000000'}}).composite(parts).webp({lossless:true}).toFile(out+'/full-gateway-v3-sheet.webp');
const meta={image:'full-gateway-v3-sheet.webp',columns:4,frames:16,frame,fps:20,region:{x:0,y:0,w:270,h:180},pivot:{x:.5,y:.97},threshold:{x:577,y:770},stabilization:{referenceFrame:0,aperture},registration};
await fs.writeFile(out+'/full-gateway-v3-sheet.json',JSON.stringify(meta,null,2));console.log('Packed 16 full-gateway frames, registered to one 270x180 world rectangle');
