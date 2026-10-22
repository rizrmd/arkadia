// Publishes the sprite player as a layer at https://ark-whachat.fural.space/rift-runner/sprite-player/ and checks every deployed byte.
//   node scripts/sprite-player/publish.mjs
// /rift-runner/ is already an open gateway folder, so the gateway itself is not redeployed. Writes docs/sprite-player/deployment.json.
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {publishLayer,readDir,URL_BASE} from '../arkadia/publish-layer.mjs';
const root='public/rift-runner/sprite-player',prefix='/rift-runner/sprite-player',hash=b=>createHash('sha256').update(b).digest('hex');
const get=async p=>{const r=await fetch(URL_BASE+p,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${p}: ${r.status}`);return Buffer.from(await r.arrayBuffer());};
const gameBefore=hash(await get('/'));
const files=await readDir(root);await publishLayer({name:'sprite-player',files,prefix});
const resources={};
for(const [file,base64] of Object.entries(files)){const expected=hash(Buffer.from(base64,'base64')),actual=hash(await get(prefix+file+'?verification='+Date.now()));if(actual!==expected)throw Error('Checksum mismatch '+file);resources[file]=expected;}
const gameAfter=hash(await get('/'));if(gameBefore!==gameAfter)throw Error('Game homepage changed during publish; inspect concurrent deployment');
const receipt={status:'all-deployed-resource-bytes-match',url:URL_BASE+prefix+'/',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),resources,gameHomepageUnchanged:true,verifiedAt:new Date().toISOString()};
await fs.mkdir('docs/sprite-player',{recursive:true});await fs.writeFile('docs/sprite-player/deployment.json',JSON.stringify(receipt,null,1)+'\n');
console.log(JSON.stringify({status:receipt.status,url:receipt.url,resources:Object.keys(resources).length}));
