import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from '../typography/browser.mjs';
const server=await createServer({plugins:[{name:'blank-fixture',configureServer(s){s.middlewares.use('/shadow-live-fixture',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Shadow GPU fixture</title>');});}}],server:{host:'127.0.0.1',port:5632,strictPort:true,hmr:false,watch:null},logLevel:'error'});await server.listen();
let browser;const errors=[];
try{browser=await chromium.launch(launchOptions());const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto('http://127.0.0.1:5632/shadow-live-fixture');
 const result=await page.evaluate(async()=>{const {runLiveShadowFixture}=await import('/src/stronghold/shadow-live-fixture.ts');return runLiveShadowFixture();});console.log(JSON.stringify({result,errors},null,2));if(process.env.OUT){await fs.mkdir(process.env.OUT,{recursive:true});await fs.writeFile(process.env.OUT+'/gpu-live-fixture.json',JSON.stringify({result,errors},null,2)+'\n');}if(errors.length||!result.ok)throw Error('Live GPU fixture failed');
}finally{await browser?.close();await server.close();}
