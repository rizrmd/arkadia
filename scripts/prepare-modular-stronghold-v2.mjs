import fs from 'node:fs/promises';import sharp from 'sharp';
const root='/home/dev/.codex/generated_images/01a15989-e333-78a3-9e52-3ff69d32b7cd/';
const sources={'paving-warm':'2766d809-e86d-4447-9082-3a23df555f3a','snow-soft':'ff303c45-a42f-42f8-b1c3-920a469cae2d','rampart-ne':'079ea905-98a2-496c-8096-26251810e5d5','rampart-se':'9e2f5c72-1b63-4457-a437-c8668def943b',bastion:'4f168d60-6fa7-498f-ac92-6942dc51b68d','gateway-grand':'be0f1c25-423e-4376-b505-f1a68b391a23','spruce-mature':'752ed32d-9572-4e09-81fa-d7fe82ef56a6','fir-young':'7dd80517-031b-4a28-bf4b-7e5a28161232','cliff-snow':'46dccaea-95d2-4ce1-943d-71a970485c3a','boulders-snow':'20336039-7481-4e7c-a87d-c0956e80e710','weeds-edge':'bea6ef66-a8a8-4261-b44b-c4b8c2fb37c1','snowdrift-edge':'9e32e906-a27c-45be-be6d-ed12d8d6fc3a','supply-cart':'603d2c1b-d211-41a7-921e-a332d342f4ab',brazier:'ec6a4990-efa3-4b05-8572-88413baf0078','paving-worn':'20fe77e5-cbaf-474a-a46a-161408421e6e','wall-broken':'8d1da457-0b51-4964-b34e-4fb8079737a8'};
const widths={'paving-warm':128,'snow-soft':128,'rampart-ne':410,'rampart-se':410,bastion:180,'gateway-grand':270,'spruce-mature':160,'fir-young':130,'cliff-snow':360,'boulders-snow':200,'weeds-edge':130,'snowdrift-edge':230,'supply-cart':90,brazier:35,'paving-worn':190,'wall-broken':210};
const out='public/modular-stronghold/v2',manifest=JSON.parse(await fs.readFile('public/modular-stronghold/manifest.json'));manifest.version=2;manifest.reference='TA1c2c474293792da1bac027a7';
for(const [id,uuid] of Object.entries(sources)){
 const source=`assets-src/modular-stronghold-v2/${id}.png`;try{await fs.access(source);}catch{await fs.copyFile(root+`exec-${uuid}.png`,source);}
 const terrain=['paving-warm','snow-soft'].includes(id);
 if(terrain){
  const n=1024,{data}=await sharp(source).resize(n,n).removeAlpha().raw().toBuffer({resolveWithObject:true}),pixels=Buffer.from(data),band=24;
  // Local periodic boundary correction only: retain the complete generated field,
  // without reflected copies or a sampled miniature texture.
  for(let y=0;y<n;y++)for(let d=0;d<band;d++)for(let c=0;c<3;c++){const a=(y*n+d)*3+c,b=(y*n+n-1-d)*3+c,t=1-d/band,mean=(data[a]+data[b])/2;pixels[a]=Math.round(data[a]*(1-t)+mean*t);pixels[b]=Math.round(data[b]*(1-t)+mean*t);}
  const horizontal=Buffer.from(pixels);for(let x=0;x<n;x++)for(let d=0;d<band;d++)for(let c=0;c<3;c++){const a=(d*n+x)*3+c,b=((n-1-d)*n+x)*3+c,t=1-d/band,mean=(horizontal[a]+horizontal[b])/2;pixels[a]=Math.round(horizontal[a]*(1-t)+mean*t);pixels[b]=Math.round(horizontal[b]*(1-t)+mean*t);}
  await sharp(pixels,{raw:{width:n,height:n,channels:3}}).png().toFile(`${out}/${id}-texture.png`);
  const w=512,h=256,tile=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(x+.5)/w-.5,dy=(y+.5)/h-.5,u=dx+dy+.5,v=dy-dx+.5;if(u<0||u>=1||v<0||v>=1)continue;const at=(Math.floor(v*n)*n+Math.floor(u*n))*3,p=(y*w+x)*4;pixels.copy(tile,p,at,at+3);tile[p+3]=255;}
  await sharp(tile,{raw:{width:w,height:h,channels:4}}).png().toFile(`${out}/${id}.png`);
 }else await sharp(source).trim({background:'#00000000',threshold:8}).resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).png().toFile(`${out}/${id}.png`);
 await sharp(source).resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).webp({quality:94}).toFile(`${out}/source-${id}.webp`);
 const m=await sharp(`${out}/${id}.png`).metadata();manifest.assets[id]={file:`/modular-stronghold/v2/${id}.png`,source,width:m.width,height:m.height,displayWidth:widths[id],pivot:[.5,terrain?.5:.97],kind:terrain?'terrain':id.startsWith('rampart')||['bastion','gateway-grand','wall-broken'].includes(id)?'structure':'prop',revision:2,generation:uuid};
 if(terrain){manifest.assets[id].texture=`/modular-stronghold/v2/${id}-texture.png`;manifest.assets[id].materialScale=id==='paving-warm'?.22:.7;}
 if(id.startsWith('rampart'))manifest.assets[id].pivot=[.5,.74];
}
await fs.writeFile('public/modular-stronghold/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const cells=[],labels=[];let i=0;for(const id of Object.keys(sources)){const a=manifest.assets[id],x=i%4*320,y=Math.floor(i/4)*260;cells.push({input:await sharp('public'+a.file).resize(300,220,{fit:'contain',background:'#19252b'}).png().toBuffer(),left:x+10,top:y+5});labels.push(`<text x="${x+160}" y="${y+248}" text-anchor="middle" font-size="18" fill="#eee5d1">${id}</text>`);i++;}cells.push({input:Buffer.from(`<svg width="1280" height="1040">${labels.join('')}</svg>`),left:0,top:0});await sharp({create:{width:1280,height:1040,channels:4,background:'#19252b'}}).composite(cells).png().toFile(`${out}/contact-sheet.png`);await sharp(`${out}/contact-sheet.png`).webp({quality:94}).toFile(`${out}/contact-sheet.webp`);console.log('Prepared 16 reference-guided assets; full-resolution UV textures retained.');
