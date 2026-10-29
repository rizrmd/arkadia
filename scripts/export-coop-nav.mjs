import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import {launchOptions} from './typography/browser.mjs';
// Export the Stronghold's collision footprints for the co-op server. The browser derives them from the sprite art
// (world-view.ts footprint()), so a fresh camp save is loaded headless and its columns are written to
// server/internal/sim/nav.json (embedded in the Go binary) and public/coop/nav.json (the client's prediction).
// Re-run after changing any court sprite, its slot or the footprint rules: node scripts/export-coop-nav.mjs
const vite=await createServer({server:{port:5191,host:'127.0.0.1'},logLevel:'error'});await vite.listen();
const browser=await chromium.launch(launchOptions());
try{
 const page=await browser.newPage();if(process.env.ENVIRONMENT_MAP)await page.route('**/api/environment/published*',r=>r.fulfill({contentType:'application/json',body:process.env.ENVIRONMENT_MAP}));await page.goto('http://127.0.0.1:5191/?time=0.5&offline=1');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&window.__STRONGHOLD_NAV__,null,{timeout:120000});
 const nav=await page.evaluate(()=>window.__STRONGHOLD_NAV__());
 if(nav.layout.sort().join()!=='expedition,gate')throw Error('Expected the camp layout, got '+nav.layout);
 const json=JSON.stringify(nav);await fs.mkdir('public/coop',{recursive:true});
 for(const file of ['server/internal/sim/nav.json','public/coop/nav.json'])await fs.writeFile(file,json+'\n');
 console.log('Exported',nav.columns.length,'columns for',nav.layout.join('+'),'('+json.length+' bytes)');
}finally{await browser.close();await vite.close();}
