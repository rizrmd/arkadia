// The game is Arkodia: saves under the pre-rename 'arkadia*' storage keys move to 'arkodia*' on first load,
// and the page title and loading screen use the new name. With SITE_DIR set, the built bundle must not name the game Arkadia.
//   BASE=http://127.0.0.1:3000 node scripts/verify-arkodia-rename.mjs → docs/arkodia-rename/results.json + page.webp
import {chromium} from 'playwright';import sharp from 'sharp';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const base=process.env.BASE||'http://127.0.0.1:3000',out=process.env.OUT||'docs/arkodia-rename';
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const results={base,checks:[]};const ok=(name,value)=>{results.checks.push({name,value});console.log('ok',name,JSON.stringify(value));};
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 ok('title',await page.title());assert.match(await page.title(),/^Arkodia/);
 ok('loading screen',await page.evaluate(()=>({label:document.querySelector('#loading-screen')?.getAttribute('aria-label'),logo:document.querySelector('#loading-logo')?.getAttribute('alt')})));
 // A returning player: progress and settings saved under the old names, plus one key already saved under the new name.
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();
  localStorage.setItem('arkadia.hero','rift-runner');localStorage.setItem('arkadia.stronghold.hero',JSON.stringify({x:590,y:420}));
  localStorage.setItem('arkadia-stronghold-v1','{"legacy":true}');localStorage.setItem('arkadia.coop.name','Old');localStorage.setItem('arkodia.coop.name','New');
  sessionStorage.setItem('arkadia.hero.picked','1');});
 await page.reload({waitUntil:'load'});await page.waitForTimeout(1500);
 const keys=await page.evaluate(()=>({local:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)]))}));
 ok('storage after reload',keys);
 assert.ok(!Object.keys(keys.local).concat(Object.keys(keys.session)).some(k=>k.startsWith('arkadia')),'old keys removed');
 assert.equal(keys.local['arkodia.hero'],'rift-runner');assert.equal(keys.session['arkodia.hero.picked'],'1');
 assert.equal(keys.local['arkodia.coop.name'],'New','a key saved under the new name wins');
 assert.ok(keys.local['arkodia-stronghold-v1'],'economy save carried over');
 await page.waitForTimeout(3000);await fs.mkdir(out,{recursive:true});await sharp(await page.screenshot()).webp({quality:80}).toFile(out+'/page.webp');
 if(process.env.SITE_DIR){const hits=[];for(const f of await fs.readdir(process.env.SITE_DIR,{recursive:true}))if(/\.(js|html|css)$/.test(f)){const t=await fs.readFile(process.env.SITE_DIR+'/'+f,'utf8');for(const m of t.matchAll(/[A-Za-z_.'-]{0,24}(ARKADIA|Arkadia)[A-Za-z_.'-]{0,24}/g))hits.push(f+': '+m[0]);}
  ok('Arkadia in built bundle',hits);assert.deepEqual(hits,[]);}
 results.ok=true;
}finally{await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/results.json',JSON.stringify(results,null,1)+'\n');await browser.close();}
