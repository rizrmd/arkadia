import fs from 'node:fs/promises';
import sharp from 'sharp';
const source='assets-src/starter-boundary/starter-components-cutout.png',out='public/buildings/starter-boundary';
await fs.mkdir(out,{recursive:true});
// Pixel rectangles on the approved master. Row three deliberately has unequal cells.
const names=['straight-ne-a','straight-ne-b','straight-se-a','straight-se-b','corner-west','corner-south','corner-north','corner-east','gate-frame','gate-leaf-left','gate-leaf-right','threshold','broken-se','broken-ne','debris','endcap'];
const boxes=names.map((_,i)=>[i%4*384,Math.floor(i/4)*256,384,256]);
boxes[0]=[0,0,416,256];boxes[2]=[768,0,416,256];boxes[4]=[0,256,416,256];boxes[12]=[0,768,416,256];boxes[13]=[400,768,416,256];
boxes[8]=[0,512,512,248];boxes[9]=[530,512,225,248];boxes[10]=[810,512,230,248];boxes[11]=[1070,512,466,248];
const assets=[];
for(let i=0;i<names.length;i++){
 const [left,top,width,height]=boxes[i],file=names[i]+'.png';
 const {data:raw,info:ri}=await sharp(source).extract({left,top,width,height}).raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(width*height),parts=[];
 for(let k=0;k<width*height;k++){if(seen[k]||raw[k*4+3]<100)continue;const todo=[k],pixels=[];seen[k]=1;while(todo.length){const q=todo.pop();pixels.push(q);const x=q%width,y=Math.floor(q/width);for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const n=ny*width+nx;if(nx<0||nx>=width||ny<0||ny>=height||seen[n]||raw[n*4+3]<100)continue;seen[n]=1;todo.push(n);}}parts.push(pixels);}
 const main=parts.sort((a,b)=>b.length-a.length)[0],keep=new Uint8Array(width*height);
 for(const q of main)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=q%width+dx,y=Math.floor(q/width)+dy;if(x>=0&&x<width&&y>=0&&y<height)keep[y*width+x]=1;}
 for(let k=0;k<keep.length;k++)if(!keep[k])raw[k*4+3]=0;
 await sharp(raw,{raw:{width,height,channels:ri.channels}}).png().toFile(out+'/'+file);
 const {data,info}=await sharp(out+'/'+file).raw().toBuffer({resolveWithObject:true});let clear=0,solid=0,edge=0;for(let k=3;k<data.length;k+=4){if(!data[k])clear++;if(data[k]>240)solid++;}
 for(let x=0;x<width;x++)edge+=data[x*4+3]+data[((height-1)*width+x)*4+3];
 assets.push({name:names[i],file,sourceRect:boxes[i],width:info.width,height:info.height,alpha:{clear,solid,edge}});
}
await fs.writeFile(out+'/manifest.json',JSON.stringify({source,method:'Built-in imagegen background extraction; original pixel isolation, no repainted runtime stand-ins',assets},null,2));
console.log('Exported',assets.length,'approved components');
// Sixteen hinged poses from the two approved isolated leaves. Keep the frame fixed.
const frames=[];
for(let i=0;i<16;i++){
 const t=i/15,cos=Math.cos(t*Math.PI*.46),w=Math.max(8,Math.round(100*cos));
 const left=await sharp(out+'/gate-leaf-left.png').resize(w,190,{fit:'fill'}).toBuffer();
 const right=await sharp(out+'/gate-leaf-right.png').resize(w,190,{fit:'fill'}).toBuffer();
 const base=await sharp({create:{width:512,height:256,channels:4,background:'#00000000'}}).composite([
  {input:left,left:184,top:27},{input:right,left:340-w,top:27},
  {input:out+'/gate-frame.png',left:0,top:0}
 ]).png().toBuffer();
 frames.push(base);
}
await sharp(frames[0]).toFile(out+'/gate-closed.png');await sharp(frames[15]).toFile(out+'/gate-open.png');
await sharp({create:{width:2048,height:1024,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%4*512,top:Math.floor(i/4)*256}))).png().toFile(out+'/gate-sheet.png');
await fs.writeFile(out+'/gate-sheet.json',JSON.stringify({image:'gate-sheet.png',starter:true,columns:4,frames:16,frame:{w:512,h:256},fps:24,region:{x:0,y:0,w:270,h:135}},null,2));
