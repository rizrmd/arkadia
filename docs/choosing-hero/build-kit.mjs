import fs from 'node:fs';
import sharp from 'sharp';
const root='public/choosing-hero/v1';
const items=JSON.parse(fs.readFileSync('docs/choosing-hero/generation.json'));
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const overlays=[];
for(let i=0;i<items.length;i++){const a=items[i];const x=(i%4)*380,y=Math.floor(i/4)*320;overlays.push({input:await sharp(a.file).resize(340,265,{fit:'inside'}).extend({top:0,bottom:0,left:0,right:0}).png().toBuffer(),left:x+20,top:y+35});overlays.push({input:svg(380,30,`<text x="190" y="23" text-anchor="middle" fill="#f5dd97" font-family="sans-serif" font-size="17">${a.name}</text>`),left:x,top:y});}
fs.mkdirSync(`${root}/previews`,{recursive:true});
await sharp({create:{width:1520,height:1600,channels:4,background:'#292932'}}).composite(overlays).png().toFile(`${root}/previews/component-contact-sheet.png`);
