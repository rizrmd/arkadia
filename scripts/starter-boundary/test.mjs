import assert from 'node:assert/strict';import fs from 'node:fs/promises';import sharp from 'sharp';import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true},logLevel:'error'});
try{
 const {starterEnclosure,palisadeColumns,STARTER_COMPONENTS}=await vite.ssrLoadModule('/src/stronghold/starter-enclosure.ts');
 const walls=starterEnclosure([]),contacts=[];assert.equal(walls.length,16);
 for(const p of walls){
  const c=STARTER_COMPONENTS[p.file.split('/').pop().slice(0,-4)],scale=p.width/c.width;
  const points=c.contacts.map(([x,y])=>{const dx=(x-c.width/2)*scale;return {x:p.x+dx,y:p.y+p.shear*dx+p.vertical*(y-p.foot*256)*scale};});
  const cols=palisadeColumns(p);assert(cols.length>50);assert(cols.every(c=>c.front>c.back&&c.height===62));
  for(const q of points)assert(cols.some(c=>Math.abs(c.x-q.x)<4&&Math.abs((c.front+c.back)/2-q.y)<2));
  contacts.push(...points);
 }
 // Every endpoint meets another segment or one of the two physical gate returns.
 for(const q of contacts){const n=contacts.filter(p=>Math.hypot(p.x-q.x,p.y-q.y)<.001).length;if(n===1){assert(Math.abs(Math.abs(q.x-577)-120)<.001);assert(Math.abs(q.y-773)<.001);}else assert.equal(n,2);}
 const manifest=JSON.parse(await fs.readFile('public/buildings/starter-boundary/manifest.json'));
 for(const a of manifest.assets){const stats=await sharp('public/buildings/starter-boundary/'+a.file).stats();assert.equal(stats.channels[3].min,0);assert(stats.channels[3].max>240);assert(a.alpha.clear>1000&&a.alpha.solid>1000);}
 assert.equal(await fs.readFile('src/environment/catalog.json','utf8'),await fs.readFile('server/internal/environment/catalog.json','utf8'),'Client/server asset registry parity');
 const catalog=JSON.parse(await fs.readFile('src/environment/catalog.json')).assets,preview=catalog.find(a=>a.id==='stronghold').components;
 assert.equal(catalog.filter(a=>a.id.startsWith('starter-boundary:')).length,18);
 for(const p of walls)assert(preview.some(c=>c.file===p.file&&c.dx===p.x-577&&c.dy===p.y-320&&c.width===p.width&&c.foot===p.foot&&c.shear===p.shear&&c.vertical===p.vertical));
 const meta=JSON.parse(await fs.readFile('public/buildings/starter-boundary/gate-sheet.json'));assert.equal(meta.frames,16);assert(meta.starter);
 const closed=await sharp('public/buildings/starter-boundary/gate-closed.png').raw().toBuffer(),open=await sharp('public/buildings/starter-boundary/gate-open.png').raw().toBuffer();let removed=0;for(let y=90;y<190;y++)for(let x=225;x<300;x++){const k=(y*512+x)*4+3;if(closed[k]>128&&open[k]<32)removed++;}assert(removed>2000,'Actual gate opening clears leaf pixels');
 const report={pass:true,walls:walls.length,components:manifest.assets.length,endpointPairs:contacts.length-2,gateReturnEndpoints:2,openPixelsCleared:removed,editorMatches:true,alphaVerified:true,oldSpanUsed:false,scope:'Source-contact transforms and full collision intervals, all exported alpha channels, exact game/editor transforms and actual gate leaf opening pixels'};
 await fs.writeFile('docs/starter-boundary/geometry-verification.json',JSON.stringify(report,null,2));console.log(report);
}finally{await vite.close();}
