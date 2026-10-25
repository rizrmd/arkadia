import fs from 'node:fs/promises';
export async function generateSolidCompanions({catalog,image,alpha}){
 const config=JSON.parse(await fs.readFile('assets-src/shadows/solid-height-rules.json','utf8')),assets={};
 const profile=(points,w,h)=>Array.from({length:17},(_,i)=>{const x=i*(w-1)/16;let j=1;while(j<points.length&&points[j][0]<x)j++;const a=points[Math.max(0,Math.min(points.length-1,j-1))],b=points[Math.min(points.length-1,j)];return Number(((x<=a[0]?a[1]:x>=b[0]?b[1]:a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]))/h).toFixed(6));});
 for(const [id,rule] of Object.entries(config.rules)){const sprite=rule.asset?catalog.assets[rule.asset]:null,source=sprite?catalog.atlas:rule.source,{data,info,sha256}=await image(source),frame=sprite?.frame??[0,0,info.width,info.height],[fx,fy,w,h]=frame,top=[],bottom=[];let low=-1,lx=0;
  for(let x=0;x<w;x++){let first=-1,last=-1;for(let y=0;y<h;y++)if(data[((fy+y)*info.width+fx+x)*4+3]>160){if(first<0)first=y;last=y;}if(first>=0){top.push([x,first]);bottom.push([x,last+1]);if(last+1>low){low=last+1;lx=x;}}}
  if(!top.length)throw Error('Solid companion has no opaque source '+id);const support=bottom.filter(([x,y])=>y>=low-.5*Math.abs(x-lx)-3),frontGround=sprite?.ground??profile(support,w,h),backGround=profile(top,w,h).map(v=>Number((v+rule.capHeightFraction).toFixed(6))),a=await alpha(source,frame);
  assets[id]={model:'closed alpha solid with capped front and back camera-ray intervals',source,sourceSize:[info.width,info.height],frame,sourceSha256:sha256,alphaSha256:a.alphaSha256,capHeightFraction:rule.capHeightFraction,frontGround,backGround,reason:rule.reason};
 }
 const result={version:1,atlasSha256:catalog.sha256,heightUnit:config.units,alphaPolicy:'Original alpha supplies every occupied source cell. No RGB value is used as height or depth.',assets};await fs.writeFile('src/world/maps/solid-shadow-companions.json',JSON.stringify(result,null,1)+'\n');await fs.writeFile('public/shadow-audit/solid-companions.json',JSON.stringify(result)+'\n');return result;
}
