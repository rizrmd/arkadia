import {createServer} from 'vite';
import assert from 'node:assert/strict';
const v=await createServer({server:{middlewareMode:true},logLevel:'error'});
try{
 const {coreUpgradeRecipe:r,coreUpgradeHeader:header,nearCore}=await v.ssrLoadModule('/src/stronghold/core-upgrade-panel.ts');
 assert.deepEqual(r(1),{level:2,gold:375,wood:188,minutes:6});
 assert.deepEqual(r(29),{level:30,gold:193871,wood:96936,minutes:990});assert.equal(r(30),null);
 for(let l=1;l<30;l++){const x=r(l);assert.equal(x.gold,Math.ceil(300*1.25**l));assert.equal(x.wood,Math.ceil(150*1.25**l));assert.equal(x.minutes,Math.ceil(5*1.2**l));}
 assert.equal(header(1),'campfire');for(let level=2;level<=30;level++){const expected=JSON.parse(await (await import('node:fs/promises')).readFile('src/stronghold/core-art.json')).levels[level-1].milestone;assert.equal(header(level),'core-'+String(expected).padStart(2,'0'));}
 assert(nearCore(577,400));assert(!nearCore(577,401));assert(!nearCore(577,420));assert(!nearCore(577,500));assert.throws(()=>r(0));
 console.log('PASS: published recipes levels 2–30, maximum tier, proximity range');
}finally{await v.close();}
