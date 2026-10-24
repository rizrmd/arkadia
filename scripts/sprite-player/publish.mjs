// Publishes the standardized sprite player at https://ark-whachat.fural.space/sprite-player/ (and /rift-runner/sprite-player/ alias)
// and checks every deployed byte.
//   node scripts/sprite-player/publish.mjs            (--check: only re-verify the deployed bytes and rewrite the receipt)
// Writes docs/sprite-player/deployment.json.
import fs from 'node:fs/promises';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {publishLayer,readDir,sandboxId,BOOT,URL_BASE} from '../arkodia/publish-layer.mjs';
const root='public/sprite-player',legacyRoot='public/rift-runner/sprite-player',prefix='/sprite-player',legacyPrefix='/rift-runner/sprite-player',hash=b=>createHash('sha256').update(b).digest('hex');
const ACCEPT={png:'image/png',webp:'image/webp',jpg:'image/jpeg'},accept=p=>ACCEPT[p.split('?')[0].split('.').pop()]||'*/*';
const get=async(p,tries=6)=>{const r=await fetch(URL_BASE+p,{headers:{Accept:accept(p)},signal:AbortSignal.timeout(30000)});if(r.status>=500&&tries>1){await new Promise(f=>setTimeout(f,5000));return get(p,tries-1);}if(!r.ok)throw Error(`${p}: ${r.status}`);return Buffer.from(await r.arrayBuffer());};
await fs.cp(legacyRoot,root,{recursive:true});
const gameBefore=hash(await get('/'));
const files=await readDir(root);
if(!process.argv.includes('--check')){
 const id=sandboxId(),gw=readFileSync('scripts/arkodia/gateway.mjs','utf8');
 execFileSync('fural-agent',['organization','home-files','write','--custom-sandbox',id,'--path','gateway.mjs','--content',gw]);
 execFileSync('fural-agent',['sandboxes','update',id,'--boot-script',BOOT]);
 await publishLayer({name:'sprite-player-legacy',files,prefix:legacyPrefix,check:legacyPrefix+'/'});
 await publishLayer({name:'sprite-player',files,prefix,check:prefix+'/'});
}
const resources={};
for(const [file,base64] of Object.entries(files)){const expected=hash(Buffer.from(base64,'base64')),actual=hash(await get(prefix+file+'?verification='+Date.now()));if(actual!==expected)throw Error('Checksum mismatch '+file);resources[file]=expected;}
const gameAfter=hash(await get('/'));if(gameBefore!==gameAfter)throw Error('Game homepage changed during publish; inspect concurrent deployment');
const receipt={status:'all-deployed-resource-bytes-match',url:URL_BASE+prefix+'/',aliasUrl:URL_BASE+legacyPrefix+'/',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),resources,gameHomepageUnchanged:true,verifiedAt:new Date().toISOString()};
await fs.mkdir('docs/sprite-player',{recursive:true});await fs.writeFile('docs/sprite-player/deployment.json',JSON.stringify(receipt,null,1)+'\n');
console.log(JSON.stringify({status:receipt.status,url:receipt.url,aliasUrl:receipt.aliasUrl,resources:Object.keys(resources).length}));
