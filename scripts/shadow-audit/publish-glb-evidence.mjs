import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readDir,publishLayer} from '../arkodia/publish-layer.mjs';
const folders=['glb-before-live','glb-per-actor-low','glb-per-actor-balanced','glb-per-actor-floor','glb-camera-overlap','glb-live-desktop','glb-live-mobile'];
const files={};for(const folder of folders)for(const [path,data] of Object.entries(await readDir('docs/shadow-audit/'+folder)))files['/'+folder+path]=data;
for(const name of ['glb-contract.md','glb-release.json'])files['/'+name]=(await fs.readFile('docs/shadow-audit/'+name)).toString('base64');
const layer=await publishLayer({name:'shadow-glb-evidence-e3e7def5',files,prefix:'/shadow-audit',check:'/shadow-audit/glb-release.json'});
for(const [path,data] of Object.entries(files)){if(!path.endsWith('.json'))continue;const response=await fetch('https://ark-whachat.fural.space/shadow-audit'+path);if(!response.ok)throw Error('Evidence HTTP '+response.status+' '+path);const actual=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),expected=createHash('sha256').update(Buffer.from(data,'base64')).digest('hex');if(actual!==expected)throw Error('Evidence SHA mismatch '+path);}
console.log(JSON.stringify({layer,jsonHashesVerified:true,files:Object.keys(files).length}));
