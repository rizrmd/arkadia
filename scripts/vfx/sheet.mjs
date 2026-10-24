// Tiles FX screenshots into one review sheet: node scripts/vfx/sheet.mjs out.png <columns> a.png b.png …
// Each shot is cropped to its centre (the FX Lab stage) and labelled with its file name.
import sharp from 'sharp';
import path from 'node:path';
const [out,cols,...files]=process.argv.slice(2),W=640,H=380,C=+cols,R=Math.ceil(files.length/C);
const label=t=>Buffer.from(`<svg width="${W}" height="28"><rect width="100%" height="100%" fill="#0e1418" opacity=".8"/><text x="10" y="19" font-family="Georgia" font-size="15" fill="#f2c46b">${t}</text></svg>`);
const comps=(await Promise.all(files.map(async(f,i)=>{const left=(i%C)*W,top=Math.floor(i/C)*H,m=await sharp(f).metadata(),w=Math.min(m.width,960),h=Math.min(m.height,570);
 return [{input:await sharp(f).extract({left:Math.round((m.width-w)/2),top:Math.round((m.height-h)/2),width:w,height:h}).resize(W,H).toBuffer(),left,top},{input:label(path.basename(f,'.png')),left,top}];}))).flat();
await sharp({create:{width:W*C,height:H*R,channels:3,background:'#000'}}).composite(comps).png().toFile(out);
console.log(out);
