import {createServer} from 'vite';import {chromium} from 'playwright';import {launchOptions} from './typography/browser.mjs';import fs from 'node:fs/promises';
// Regression for the player's pasted-panel report: no self-shadow may leak through the feathered ramp,
// the concave shoulder gap stays clear, and the hill still casts an external sun shadow.
const vite=await createServer({server:{host:'127.0.0.1',port:5972,strictPort:true,hmr:false,watch:null},plugins:[{name:'shadow-check',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/shadow-check.html'){res.setHeader('Content-Type','text/html');res.end('<body>Hill shadow check</body>');}else next();});}}],logLevel:'error'});await vite.listen();let browser;
try{browser=await chromium.launch(launchOptions());const page=await browser.newPage();await page.goto('http://127.0.0.1:5972/shadow-check.html');const report=await page.evaluate(async()=>{
 const {paintReliefShadow}=await import('/src/stronghold/relief-art.ts'),{RELIEF}=await import('/src/world/relief.ts'),{tilePoint}=await import('/src/stronghold/terrain.ts');
 const canvas=document.createElement('canvas'),box=paintReliefShadow(RELIEF.find(f=>f.id==='east-ridge'),1,.5,canvas),ctx=canvas.getContext('2d');
 const alpha=(u,v)=>{const p=tilePoint(u,v);return ctx.getImageData(Math.round(p.x-box.left),Math.round(p.y-box.top),1,1).data[3];};
 const samples={rampMouth:alpha(25.5,12.9),summitFootprint:alpha(25.5,7.2),concaveShoulderGap:alpha(23.8,10.8),externalSunShadow:alpha(28.3,8)};
 if(samples.rampMouth!==0||samples.summitFootprint!==0||samples.concaveShoulderGap!==0||samples.externalSunShadow<200)throw Error('Shadow regression '+JSON.stringify(samples));return {pass:true,direction:[1,.5],alpha:samples};
 });await fs.writeFile('docs/terrain-height/shadow-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}finally{await browser?.close();await vite.close();}
