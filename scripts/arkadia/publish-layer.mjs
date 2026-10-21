import fs from 'node:fs/promises';import {readFileSync} from 'node:fs';import os from 'node:os';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
// Release into the one Arkadia sandbox (https://ark-whachat.fural.space, served by gateway.mjs).
// A layer is a set of files at a URL prefix; the gateway applies new layers in order when the sandbox boots.
//   node scripts/arkadia/publish-layer.mjs --dir public/ember-warden/v1 --prefix /ember-warden-review --name ember
//   node scripts/arkadia/publish-layer.mjs --tgz release.tgz --name game        (game release from scripts/fural-deploy.sh: arkadia binary +
//                                                                                site/, plus this commit's gateway and boot script)
//   node scripts/arkadia/publish-layer.mjs --gateway                             (gateway.mjs and the boot script only)
// From code: import {publishLayer} from './arkadia/publish-layer.mjs'; await publishLayer({name, files: {'/path': base64}, prefix}).
// The game itself ships only as a release: review and evidence layers take a prefix and never carry /index.html.
export const SANDBOX='arkadia',URL_BASE='https://ark-whachat.fural.space',PROJECT='PJ8758f22f61165f3d3215e454',MEMBER='US4f550b10dab65dc9756fa429';
export const BOOT=`cd "$HOME"
if [ ! -f www/.seeded ] && ls seed/www.tgz.* >/dev/null 2>&1; then rm -rf www builds coop && cat seed/www.tgz.* | tar -xz && touch www/.seeded && rm -rf seed; fi
exec node gateway.mjs
`;
const run=args=>{try{return JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:180000,maxBuffer:8e6,stdio:['ignore','pipe','pipe']}));}catch(e){throw Error((e.stderr||e.stdout||e.message).toString().slice(0,1800));}};
export function sandboxId(){const s=run(['sandboxes','list']),list=Array.isArray(s)?s:s.sandboxes||s.items||[],b=list.find(x=>x.name===SANDBOX);if(!b)throw Error(`Custom sandbox ${SANDBOX} not found`);return b.id;}
const stage=path.join(os.homedir(),'releases/arkadia-layers');

// Upload bytes as content-named parts under layers/, so a retry skips parts already there.
async function upload(id,bytes,name,size=4e6){
 const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12),parts=[];await fs.mkdir(stage,{recursive:true});
 for(let i=0;i<bytes.length;i+=size){const n=`${name}-${hash}-${parts.length}.part`;await fs.writeFile(path.join(stage,n),bytes.subarray(i,i+size));parts.push(n);}
 for(const n of parts)try{run(['organization','home-files','transfer','--from-member',MEMBER,'--from',path.relative(os.homedir(),path.join(stage,n)),'--to-custom-sandbox',id,'--to','layers/'+n]);}catch(e){if(!e.message.includes('already exists'))throw e;}
 return {hash,parts};
}
async function register(id,name,layer){
 const lid=`${Date.now()}-${name}-${layer.hash}`;run(['organization','home-files','write','--custom-sandbox',id,'--path',`layers/${lid}.json`,'--content',JSON.stringify({seq:Date.now(),...layer})]);
 console.log('Registered layer',lid,'in',layer.parts.length,'parts');return lid;
}
// Power cycle so the boot script applies pending layers, then wait for the gateway.
export async function restart(id=sandboxId(),check='/healthz'){
 run(['sandboxes','restart',id]);
 for(let i=0;i<60;i++){try{if((await fetch(URL_BASE+check,{signal:AbortSignal.timeout(10000)})).ok){console.log('Live:',URL_BASE+check);return;}}catch{}await new Promise(r=>setTimeout(r,5000));}
 throw Error(`${URL_BASE}${check} did not come back`);
}
export async function publishLayer({name,files,prefix='',check}){
 if(!prefix&&'/index.html' in files)throw Error('The game page ships only as a release (scripts/fural-deploy.sh)');
 const id=sandboxId(),{hash,parts}=await upload(id,gzipSync(JSON.stringify(files)),name);
 await register(id,name,{hash,parts,format:'gzjson',prefix});await restart(id,check||(prefix?prefix+'/':'/'));
}
// Write this commit's gateway and boot script; they take effect at the next restart.
function installGateway(id){
 const src=readFileSync(fileURLToPath(new URL('./gateway.mjs',import.meta.url)),'utf8');
 run(['organization','home-files','write','--custom-sandbox',id,'--path','gateway.mjs','--content',src]);run(['sandboxes','update',id,'--boot-script',BOOT]);
}
export async function publishRelease({name='game',tgz,check='/healthz'}){
 const id=sandboxId(),{hash,parts}=await upload(id,await fs.readFile(tgz),name);
 installGateway(id);await register(id,name,{hash,parts,format:'tgz'});await restart(id,check);
}
export async function deployGateway(){const id=sandboxId();installGateway(id);await restart(id,'/');}
export async function readDir(dir){const files={};for(const f of await fs.readdir(dir,{recursive:true})){const p=path.join(dir,f);if((await fs.stat(p)).isFile())files['/'+f.split(path.sep).join('/')]=(await fs.readFile(p)).toString('base64');}return files;}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const arg=k=>{const i=process.argv.indexOf('--'+k);return i<0?undefined:process.argv[i+1]??true;};
 if(arg('gateway'))await deployGateway();
 else if(arg('tgz'))await publishRelease({name:arg('name')||'game',tgz:arg('tgz')});
 else if(arg('dir'))await publishLayer({name:arg('name')||path.basename(path.resolve(arg('dir'))),files:await readDir(arg('dir')),prefix:arg('prefix')||''});
 else{console.error('Usage: --dir DIR --prefix /folder [--name N] | --tgz FILE [--name N] | --gateway');process.exit(1);}
}
