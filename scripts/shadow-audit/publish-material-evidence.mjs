import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {publishLayer,readDir} from '../arkodia/publish-layer.mjs';
const root='docs/shadow-audit/',files={};
for(const folder of ['static-final','delivered-static-live','raised-casters-live','brazier-material','brazier-gpu','material-live-desktop','material-live-mobile','material-live-desktop-first-attempt','material-live-desktop-probe-framing'])for(const [p,data] of Object.entries(await readDir(root+folder)))if(!p.endsWith('/progress.json'))files['/'+folder+p]=data;
for(const name of ['inventory.json','static-visual-acceptance.json','material-companion-delivery.json','delivered-source-audit.json','material-regression.json','hardware-performance-availability.json'])files['/'+name]=(await fs.readFile(root+name)).toString('base64');
for(const name of ['family-gallery.html','material-companions.json','materials/brazier-physical.png','materials/brazier-emissive.png','materials/brazier-mask.png'])files['/'+name]=(await fs.readFile('public/shadow-audit/'+name)).toString('base64');
const receipt={runtimeCommit:'7957773ab1a59f1d17733426a0a400503aca13fd',entry:'/assets/index-BjGJB5qD.js',gameLayer:'1793012434704-game-7957773a-1fa2bb17c0bd',inventoryRows:670,staticVariants:314,sunCases:942,assetReceiveControls:942,raisedCasterCases:834,raisedCastingVariants:278,intentionalNoncasters:36,sourceDelivery:{sources:43,uniformFullImageDownscales:18,resizedAtlases:0},material:{alphaComparisons:1062670,mismatches:0,gpuControls:36,profiles:['desktop/high','mobile/low'],samplers:4},limits:['13 drift variants retain authored-proxy/raster edge approximation; not measured volumetric self-shadowing.','Physical-device performance on this runtime remains unverified. Software GPU measurements do not certify desktop/mobile FPS.','Particle FX remain unlit presentation; Canvas fallback has legacy ground-only shadows.','Semantic material boundaries and scalar mixed-pixel response are approximations.'],files:Object.fromEntries(Object.entries(files).map(([p,data])=>[p.slice(1),createHash('sha256').update(Buffer.from(data,'base64')).digest('hex')]))};
await fs.writeFile(root+'material-release.json',JSON.stringify(receipt,null,2)+'\n');
if(process.argv.includes('--prepare')){console.log(JSON.stringify({prepared:true,files:Object.keys(files).length}));process.exit(0);}
files['/material-release.json']=(await fs.readFile(root+'material-release.json')).toString('base64');
const layer=process.argv.includes('--verify-only')?'1793016131990-shadow-material-7957773a-evidence-fdf621af4623':await publishLayer({name:'shadow-material-7957773a-evidence',files,prefix:'/shadow-audit',check:'/shadow-audit/material-release.json'});
const entries=Object.entries(files),verified=[];
async function verify([p,data]){
 const expected=createHash('sha256').update(Buffer.from(data,'base64')).digest('hex');
 let actual,status;
 for(let attempt=0;attempt<3;attempt++){
  const url='https://ark-whachat.fural.space/shadow-audit'+p+'?audit='+expected+(p.endsWith('.png')?'&format=png':'');
  const r=await fetch(url,{signal:AbortSignal.timeout(30000)});status=r.status;actual=createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
  if(r.ok&&actual===expected)break;
  console.warn(JSON.stringify({retry:attempt+1,path:p,status,actual,expected}));
 }
 if(status!==200||actual!==expected)throw Error('Evidence verification failed '+p);
 verified.push({path:p,sha256:expected,status});
}
for(let i=0;i<entries.length;i+=4){
 const results=await Promise.allSettled(entries.slice(i,i+4).map(verify));
 await fs.writeFile(root+'material-package-live.json',JSON.stringify({layer,status:'in_progress',verified,total:entries.length},null,2)+'\n');
 console.log(JSON.stringify({verified:verified.length,total:entries.length}));
 const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
}
await fs.writeFile(root+'material-package-live.json',JSON.stringify({layer,status:'pass',verified,total:entries.length},null,2)+'\n');
console.log(JSON.stringify({layer,files:Object.keys(files).length,hashesVerified:true}));
