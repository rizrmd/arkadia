import fs from 'node:fs/promises';import sharp from 'sharp';
const root='public/rift-runner/v1',m=JSON.parse(await fs.readFile(root+'/manifest.json'));await fs.mkdir(root+'/previews',{recursive:true});
for(const action of [...new Set(m.clips.map(c=>c.action))])for(const mode of action==='idle'||m.clips.find(c=>c.action===action).layer==='vfx'?['clip']:['clip','transition']){
 const clips=m.clips.filter(c=>c.action===action),cols=clips.length===8?4:1,rows=Math.ceil(clips.length/cols),w=cols*256,h=rows*280;
 const count=mode==='transition'?14:clips[0].frames.length,frames=[];
 for(let n=0;n<count;n++){
  const inputs=[];
  for(let i=0;i<clips.length;i++){let c=clips[i],f=n%c.frames.length;
   if(mode==='transition'){if(n<4||n>=10){c=m.clips.find(v=>v.id===`idle-${c.direction}`);f=n%c.frames.length}else f=n-4}
   const s=m.sheets.find(v=>v.name===c.sheet),[x,y]=c.frames[f],buf=await sharp(root+'/'+s.file).extract({left:x*256,top:y*256,width:256,height:256}).png().toBuffer();
   inputs.push({input:buf,left:i%cols*256,top:Math.floor(i/cols)*280+24});
   inputs.push({input:Buffer.from(`<svg width="256" height="24"><text x="8" y="18" fill="#dcebf0" font-family="sans-serif" font-size="15">${c.direction} · ${mode==='transition'?(n<4||n>=10?'Idle':'Action'):action}</text></svg>`),left:i%cols*256,top:Math.floor(i/cols)*280});
  }
  frames.push(await sharp({create:{width:w,height:h,channels:4,background:'#18232b'}}).composite(inputs).raw().toBuffer());
 }
 const file=`${action}-${mode}.webp`;await sharp(Buffer.concat(frames),{raw:{width:w,height:h*count,channels:4,pageHeight:h}}).webp({quality:80,loop:0,delay:mode==='transition'?125:Math.round(1000/clips[0].fps)}).toFile(root+'/previews/'+file);
 const info=await sharp(root+'/previews/'+file,{animated:true}).metadata();if(info.pages!==count)throw Error(`Incorrect preview frame count ${file}`);console.log(file,info.pages);
}
