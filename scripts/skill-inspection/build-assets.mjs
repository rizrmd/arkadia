import sharp from 'sharp';
import fs from 'node:fs/promises';
const base='public/skill-tree/inspection-v1',src='assets-src/skill-inspection/v1';
const frames={},entries=[];
async function asset(name,input,w,h,slice){
 frames[name]={width:w,height:h,...(slice?{slice}: {})};
 for(const s of [1,2,3]){await fs.mkdir(`${base}/@${s}x`,{recursive:true});await sharp(input).resize(w*s,h*s,{fit:'fill'}).png().toFile(`${base}/@${s}x/${name}.png`);}
 entries.push(name);
}
const modal=await sharp(`${src}/modal-source.png`).extract({left:47,top:69,width:1446,height:878}).png().toBuffer();
await asset('details-frame',modal,480,292,[34,34,34,34]);
const primary=await sharp(`${src}/primary-source.png`).trim().png().toBuffer();
await asset('primary',primary,240,50,[18,18,18,18]);
for(const [name,brightness] of [['primary-hover',1.12],['primary-pressed',.8],['primary-disabled',.55]])await asset(name,await sharp(primary).modulate({brightness,saturation:name.endsWith('disabled')?.1:1}).png().toBuffer(),240,50,[18,18,18,18]);
await asset('selected-ring',`${src}/selected-source.png`,192,192);
for(const [name,old] of [['secondary','level-plate'],['equipped-badge','level-plate'],['close','button-close'],['divider','line-h']]){
 const m=JSON.parse(await fs.readFile('public/skill-tree/v1/manifest.json')).frames[old];await asset(name,`public/skill-tree/v1/@3x/${old}.png`,m.width,m.height,m.slice);
}
await asset('info',Buffer.from('<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="#101014" stroke="#dfb953" stroke-width="2"/><path d="M24 22v13M24 13v3" stroke="#ffe6a0" stroke-width="4"/></svg>'),24,24);
await fs.writeFile(`${base}/manifest.json`,JSON.stringify({frames},null,2));
const cells=[];for(let i=0;i<entries.length;i++){
 const n=entries[i],left=(i%3)*330,top=Math.floor(i/3)*180;
 cells.push({input:await sharp(`${base}/@2x/${n}.png`).resize(290,130,{fit:'inside'}).png().toBuffer(),left:left+20,top:top+8});
 cells.push({input:Buffer.from(`<svg width="320" height="32" xmlns="http://www.w3.org/2000/svg"><text x="20" y="23" fill="#ffe6b0" font-size="18">${n}</text></svg>`),left,top:top+143});
}
await sharp({create:{width:990,height:Math.ceil(entries.length/3)*180,channels:4,background:'#24212b'}}).composite(cells).png().toFile('docs/skill-inspection/asset-sheet.png');
await fs.writeFile('docs/skill-inspection/assets.md',`## Skill inspection kit\n\nBuilt-in imagegen generated modal-source.png, primary-source.png and selected-source.png from approved reference DAeca15acb4225c291fecf421c. Prompts: blank smoky black double gold nine-slice modal frame; blank beveled gold action button; transparent cyan selection ring. Source PNGs retained in assets-src/skill-inspection/v1. Runtime assets at public/skill-tree/inspection-v1 in 1x/2x/3x.\n\nFrame slice borders are recorded in manifest.json. Button states derive brightness/saturation from the generated primary; secondary/equipped badge, close and divider reuse compatible established tree assets. Info matches the simple gold icon system. Labels are live Pixi text, including Equipped and Selected.\n\n${entries.map(n=>`- ${n}: ${JSON.stringify(frames[n])}`).join('\n')}\n`);
