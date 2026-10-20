import fs from 'node:fs/promises';
import sharp from 'sharp';
const generated='/home/dev/.codex/generated_images/01a15989-e333-78a3-9e52-3ff69d32b7cd/';
const sources={paving:'47b828fc-f6d2-4ba6-96db-320f31f91c51',snow:'c924307d-46f3-4463-948d-56cf5bb25bc9','wall-ne':'32393b16-41d9-4522-a199-a8073e7bed47','wall-se':'e1753450-ae3d-49bb-9e8d-96e75f5250ce',tower:'ba62b16c-97a3-4006-9549-a17fda0c5f1d',gate:'cdc06595-4e40-4838-8fd6-6468ca4dd481',pine:'2defe72e-5ce4-44a6-85b5-58db02b81be8',rocks:'e6f8266c-b532-4fdb-bc0f-92d97e459aa3',moss:'04e39cae-6536-42e9-a6c1-b28d012e9ddb',crate:'61ba0325-1c3b-4dcb-a1d8-1c2f362ccecd',barrel:'43e5b8f0-d5bc-47b9-a6d6-3290b9f8a970',banner:'826d3311-d194-48dd-834d-47123e501e29',torch:'7ec95219-3807-4014-8297-d2653b33bc41'};
const out='public/modular-stronghold';await fs.mkdir(out,{recursive:true});await fs.mkdir('assets-src/modular-stronghold',{recursive:true});
const manifest={version:1,generator:'Built-in imagegen; one call per asset',projection:{halfWidth:64,halfHeight:32,axes:[-.5,.5]},assets:{}};
const widths={paving:128,snow:128,'wall-ne':256,'wall-se':256,tower:110,gate:230,pine:100,rocks:180,moss:80,crate:34,barrel:26,banner:34,torch:18};
for(const [id,uuid] of Object.entries(sources)){
 const source=`assets-src/modular-stronghold/${id}.png`;try{await fs.access(source);}catch{await fs.copyFile(generated+`exec-${uuid}.png`,source);}
 if(id==='paving'||id==='snow'){
  // Sample the generated top surface, then make a periodic texture by reflection.
  // Opposite UV edges are identical; every diamond therefore joins exactly.
  const m=await sharp(source).metadata(),size=128;
  const {data}=await sharp(source).extract({left:Math.floor(m.width/2-256),top:Math.floor(m.height/2-128),width:512,height:256}).resize(size,size).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const n=256,texture=Buffer.alloc(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const sx=x<size?x:n-1-x,sy=y<size?y:n-1-y,s=(sy*size+sx)*3,d=(y*n+x)*4;data.copy(texture,d,s,s+3);texture[d+3]=255;}
  await sharp(texture,{raw:{width:n,height:n,channels:4}}).png().toFile(`${out}/${id}-texture.png`);
  const w=256,h=128,tile=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(x+.5)/w-.5,dy=(y+.5)/h-.5,u=dx+dy+.5,v=dy-dx+.5;if(u<0||u>=1||v<0||v>=1)continue;const s=(Math.min(255,Math.floor(v*n))*n+Math.min(255,Math.floor(u*n)))*4;texture.copy(tile,(y*w+x)*4,s,s+4);}
  await sharp(tile,{raw:{width:w,height:h,channels:4}}).png().toFile(`${out}/${id}.png`);
 }else await sharp(source).trim({background:'#00000000',threshold:12}).resize({width:640,height:640,fit:'inside'}).png().toFile(`${out}/${id}.png`);
 const m=await sharp(`${out}/${id}.png`).metadata();manifest.assets[id]={file:`/modular-stronghold/${id}.png`,source,width:m.width,height:m.height,displayWidth:widths[id],pivot:[.5,(id==='paving'||id==='snow')?.5:.97],kind:['paving','snow'].includes(id)?'terrain':id.startsWith('wall')||['tower','gate'].includes(id)?'structure':'prop'};
}
for(const id of ['forge','barracks','altar','mage','mine','expedition'])manifest.assets[id]={file:`/assets/stronghold/${id}.png`,source:`assets-src/stronghold/${id}.png`,kind:'building',pivot:[.5,.95],reused:true};
manifest.assets['forge-states']={file:'/fortress-ui/forge-states.webp',kind:'building states',reused:true};
await fs.writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
const cells=[],labels=[];let i=0;for(const [id,a] of Object.entries(manifest.assets)){const thumb=await sharp('public'+a.file).resize(240,185,{fit:'contain',background:'#172127'}).png().toBuffer();const x=(i%4)*260,y=Math.floor(i/4)*220;cells.push({input:thumb,left:x+10,top:y+5});labels.push(`<text x="${x+130}" y="${y+211}" text-anchor="middle" fill="#ede4d1" font-size="16">${id}</text>`);i++;}
const height=Math.ceil(i/4)*220;cells.push({input:Buffer.from(`<svg width="1040" height="${height}">${labels.join('')}</svg>`),left:0,top:0});await sharp({create:{width:1040,height,channels:4,background:'#172127'}}).composite(cells).png().toFile(`${out}/contact-sheet.png`);
console.log('Prepared',Object.keys(manifest.assets).length,'assets; source artwork preserved; periodic tile UV edges match.');
