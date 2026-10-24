// Paints the particle textures of the NixieFX project (vfx/assets/textures) and a contact sheet of them.
//   node scripts/vfx/textures.mjs
import fs from 'node:fs/promises';
import {launch} from './browser.mjs';
const OUT='vfx/assets/textures',browser=await launch();
try{
 const page=await browser.newPage();await page.setContent('<!doctype html><body style="margin:0;background:#000"></body>');
 await page.addScriptTag({path:new URL('./texture-painters.js',import.meta.url).pathname});
 const list=await page.evaluate(()=>Object.entries(window.VFX_TEXTURES).map(([name,t])=>({name,w:t.w,h:t.h,tiles:t.tiles,data:t.render()})));
 await fs.mkdir(OUT,{recursive:true});
 const index={};
 for(const t of list){await fs.writeFile(`${OUT}/${t.name}.png`,Buffer.from(t.data.split(',')[1],'base64'));index[t.name]={width:t.w,height:t.h,tiles:t.tiles};}
 await fs.writeFile(`${OUT}/textures.json`,JSON.stringify(index,null,1)+'\n');
 // Contact sheet: every texture in white and in ember orange on a dark ground.
 const cells=list.map(t=>`<figure><div style="background-image:url(${t.data})"></div><div class=t style="-webkit-mask-image:url(${t.data})"></div><figcaption>${t.name} ${t.w}×${t.h}${t.tiles.join('x')!=='1x1'?' · '+t.tiles.join('×'):''}</figcaption></figure>`).join('');
 await page.setViewportSize({width:1280,height:900});
 await page.setContent(`<!doctype html><style>body{margin:0;padding:16px;background:#0d1216;font:12px Georgia,serif;color:#cfc6b4;display:grid;grid-template-columns:repeat(6,1fr);gap:12px}figure{margin:0}figure div{height:84px;background:center/contain no-repeat;border:1px solid #2a3238;border-radius:4px}.t{margin-top:4px;background:linear-gradient(#ffd27a,#ff5a1e);-webkit-mask:center/contain no-repeat}figcaption{margin-top:4px}</style>${cells}`);
 await fs.mkdir('docs/nixie-fx',{recursive:true});
 await page.screenshot({path:'docs/nixie-fx/textures.png',fullPage:true});
 console.log(JSON.stringify(Object.keys(index)));
}finally{await browser.close();}
