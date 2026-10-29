import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from '../typography/browser.mjs';
const server=await createServer({plugins:[{name:'blank-fixture',configureServer(s){s.middlewares.use('/shadow-live-fixture',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Shadow GPU fixture</title>');});}}],server:{host:'127.0.0.1',port:5632,strictPort:true,hmr:false,watch:null},logLevel:'error'});await server.listen();
let browser;const errors=[];
try{browser=await chromium.launch(launchOptions());const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto('http://127.0.0.1:5632/shadow-live-fixture');
 const result=await page.evaluate(async()=>{const m=await import('/src/stronghold/shadow-camera-fixture.ts');return m.runActorCameraFixture()});await fs.mkdir('docs/shadow-audit/glb-camera-overlap',{recursive:true});await fs.writeFile('docs/shadow-audit/glb-camera-overlap/report.json',JSON.stringify({result,errors},null,2)+'\n');console.log(JSON.stringify({result,errors}));if(errors.length||!result.ok)throw Error('Skinned fixture failed');
}catch(e){console.error(JSON.stringify({errors}));throw e;}finally{await browser?.close();await server.close();}
