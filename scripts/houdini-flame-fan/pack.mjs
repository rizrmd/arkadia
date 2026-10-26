import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';import {createHash} from 'node:crypto';
const positional=process.argv.slice(2).filter(a=>!a.startsWith('--'));const input=positional[0]??'experiments/houdini-flame-fan/masters',out=positional[1]??'experiments/houdini-flame-fan/player/artifacts';
const production=process.argv.includes('--production');await fs.mkdir(out,{recursive:true});const levels=[];
for(let level=1;level<=5;level++){
 const base=path.join(input,`lv${level}-full`),m=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8'));
 if(production&&(!m.commercialEligible||m.experimental||m.license.includes('Apprentice')))throw Error('Apprentice assets cannot enter commercial production');
 if(m.frameWidth!==1280||m.frameHeight!==720||m.level!==level)throw Error('Invalid master contract');
 const frames=[],hashes=new Set();let x0=1280,y0=720,x1=0,y1=0,transparent=0,colored=0;
 for(let n=1;n<=m.frameCount;n++){
  const name=`fan.${String(n).padStart(4,'0')}.png`,file=path.join(base,'frames',name),buf=await fs.readFile(file),im=sharp(buf),meta=await im.metadata();
  if(meta.width!==1280||meta.height!==720||!meta.hasAlpha)throw Error('Frame dimensions/alpha mismatch');
  hashes.add(createHash('sha256').update(buf).digest('hex'));
  const data=await im.ensureAlpha().raw().toBuffer();
  for(let y=0;y<576;y++)for(let x=0;x<1280;x++){const i=(y*1280+x)*4,a=data[i+3];if(a===0)transparent++;if(a>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);if(data[i]>data[i+1]+15)colored++;}}
  frames.push(file);
 }
 if(hashes.size<12||!transparent||!colored)throw Error('Blank/static/non-fire sequence');
 const levelReport={...m,uniqueFrames:hashes.size,masterEffectBounds:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1},transparentPixels:transparent,coloredPixels:colored,variants:{}};
 for(const [variant,w,h,cols,maxRows] of [['mobile',320,180,6,6],['desktop',640,360,3,5]]){
  const cellW=w+4,cellH=h+4,capacity=cols*maxRows,pages=[];
  for(let start=0;start<frames.length;start+=capacity){const slice=frames.slice(start,start+capacity),rows=Math.ceil(slice.length/cols),pw=cellW*cols,ph=cellH*rows;
   if(pw>2048||ph>2048)throw Error('Atlas exceeds mobile texture cap');
   const frameMap={},composites=[];
   for(let i=0;i<slice.length;i++){
    const x=(i%cols)*cellW+2,y=Math.floor(i/cols)*cellH+2;
    // Sharp resamples alpha with color; preserve the entire raw image including watermark.
    const raw=await sharp(slice[i]).ensureAlpha().raw().toBuffer();
    // Pyro emission can greatly exceed smoke opacity. Make an explicit, documented
    // experimental coverage adjustment for normal-blend sprites; retain raw masters.
    for(let y=0;y<576;y++)for(let x=0;x<1280;x++){const a=(y*1280+x)*4+3;raw[a]=Math.min(255,raw[a]*16);}
    const data=await sharp(raw,{raw:{width:1280,height:720,channels:4}}).resize(w,h).png().toBuffer();composites.push({input:data,left:x,top:y});
    frameMap[`frame${String(start+i).padStart(3,'0')}`]={frame:{x,y,w,h},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w,h},sourceSize:{w,h},anchor:m.pivot};
   }
   const stem=`lv${level}-${variant}-${pages.length}`,image=stem+'.png';await sharp({create:{width:pw,height:ph,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png().toFile(path.join(out,image));
   const atlas={frames:frameMap,animations:{flameFan:Object.keys(frameMap)},meta:{app:'Houdini Flame Fan experimental packer',version:'1',image,format:'RGBA8888',size:{w:pw,h:ph},scale:'1',premultipliedAlpha:false},flameFan:{...m,variant,coverageGain:16,coverageRegion:'top 80% only; raw masters unchanged; watermark untouched',firstFrame:start,frameDurationMs:1000/m.fps,blendMode:'normal',loop:false,worldWidthGameUnits:16,productionApproved:false,cropSuggestionOnly:{x:0,y:0,w,h:Math.floor(h*.8),pivot:{x:m.pivot.x,y:m.pivot.y/.8}},note:'Raw watermark retained; proposed crop does not change license.'}};
   await fs.writeFile(path.join(out,stem+'.json'),JSON.stringify(atlas,null,2));pages.push({json:stem+'.json',image,frames:slice.length,decodedBytes:pw*ph*4});
  }
  levelReport.variants[variant]={pages,decodedBytes:pages.reduce((s,p)=>s+p.decodedBytes,0)};
 }
 levels.push(levelReport);
}
const report={status:'experimental-render-verified',productionApproved:false,limitations:['Apprentice: noncommercial only','Canonical east view; arbitrary 3D view directions need separate bakes','Visual quality and physical-device performance remain unapproved','Burn Soil is metadata only; existing gameplay remains authoritative'],levels};
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(report,null,2));await fs.mkdir('docs/houdini-flame-fan',{recursive:true});await fs.writeFile('docs/houdini-flame-fan/atlas-validation.json',JSON.stringify(report,null,2));console.log(levels.map(l=>({level:l.level,bounds:l.masterEffectBounds,mobileMiB:l.variants.mobile.decodedBytes/1048576,desktopMiB:l.variants.desktop.decodedBytes/1048576})));
