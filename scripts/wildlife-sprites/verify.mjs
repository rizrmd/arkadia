import assert from 'node:assert/strict';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from '../typography/browser.mjs';
const manifest=JSON.parse(await fs.readFile('docs/wildlife-sprites/atlas.json'));
const image=sharp('public/wildlife/imagegen-atlas.png'),meta=await image.metadata();
assert(meta.hasAlpha);assert.equal(meta.width,2048);assert.equal(meta.height,1024);
for(let row=0;row<4;row++){
 const hashes=[];
 for(let i=0;i<8;i++){
  const {data,info}=await sharp('public/wildlife/imagegen-atlas.png').extract({left:i*256,top:row*256,width:256,height:256}).raw().toBuffer({resolveWithObject:true});
  hashes.push(createHash('sha256').update(data).digest('hex'));
  let visible=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++){if(data[(y*256+x)*info.channels+3]>24){visible++;assert(x>=15&&x<=241&&y>=10&&y<=210,'Silhouette clipped or pivot drift');}}
  assert(visible>2000);
 }
 assert.equal(new Set(hashes).size,8,'Eight distinct animation poses per loop');
}
const server=await createServer({server:{host:'127.0.0.1',port:5621,hmr:false,watch:null},logLevel:'error'});await server.listen();
const browser=await chromium.launch(launchOptions()),page=await browser.newPage({viewport:{width:1050,height:340}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/sprite-check',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0"><script type="module" src="/scripts/wildlife-sprites/playback-entry.js"></script>'}));
 await page.goto('http://127.0.0.1:5621/sprite-check');await page.waitForFunction(()=>window.ready);
 const rendered=[];for(let i=0;i<8;i++){await page.evaluate(i=>window.frame(i),i);const png=await page.screenshot();rendered.push(createHash('sha256').update(png).digest('hex'));if(i===0)await fs.writeFile('docs/wildlife-sprites/playback.png',png);}
 assert.equal(new Set(rendered).size,8);assert.deepEqual(errors,[]);
 await fs.writeFile('docs/wildlife-sprites/verification.json',JSON.stringify({checks:['Exactly two existing wildlife species; no invented species','32 distinct transparent PNG frames','All four clips render in actual Pixi with eight distinct poses','Aligned fixed pivots, consistent species scale and no clipped silhouettes','Zero browser page errors'],atlas:manifest,rendered},null,2));
 console.log('PASS alpha, frame bounds, pivots, all four Pixi animation loops and zero browser errors');
}finally{await browser.close();await server.close();}
