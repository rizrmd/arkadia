import {uploadReleaseParts} from './release-parts.mjs';
import fs from 'node:fs/promises';import {readFileSync} from 'node:fs';import os from 'node:os';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
// Release into the one Arkodia sandbox (https://ark-whachat.fural.space, served by gateway.mjs).
// A layer is a set of files at a URL prefix; the gateway applies new layers in order when the sandbox boots.
//   node scripts/arkodia/publish-layer.mjs --dir public/ember-warden/v1 --prefix /ember-warden-review --name ember
//   node scripts/arkodia/publish-layer.mjs --tgz release.tgz --name game        (game release from scripts/fural-deploy.sh: arkodia binary +
//                                                                                site/, plus this commit's gateway and boot script)
//   node scripts/arkodia/publish-layer.mjs --gateway                             (gateway.mjs and the boot script only)
// From code: import {publishLayer} from './arkodia/publish-layer.mjs'; await publishLayer({name, files: {'/path': base64}, prefix}).
// The game itself ships only as a release: review and evidence layers take a prefix and never carry /index.html.
const run=args=>{try{return JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:180000,maxBuffer:8e6,stdio:['ignore','pipe','pipe']}));}catch(e){throw Error((e.stderr||e.stdout||e.message).toString().slice(0,1800));}};
export const SANDBOX='arkadia',URL_BASE=process.env.ARKODIA_URL_BASE||'https://arkodia.online',PROJECT='PJ8758f22f61165f3d3215e454',MEMBER=process.env.FURAL_PUBLISH_MEMBER||(()=>{try{return run(['whoami']).user_id;}catch{return '';}})()||'US4f550b10dab65dc9756fa429';
export const BOOT=`cd "$HOME"
if [ ! -f www/.seeded ] && ls seed/www.tgz.* >/dev/null 2>&1; then rm -rf www builds coop && cat seed/www.tgz.* | tar -xz && touch www/.seeded && rm -rf seed; fi
exec node gateway.mjs
`;
export function sandboxId(){const s=run(['sandboxes','list']),list=Array.isArray(s)?s:s.sandboxes||s.items||[],b=list.find(x=>x.slug===SANDBOX)||list.find(x=>x.name===SANDBOX);if(!b)throw Error(`Custom sandbox ${SANDBOX} not found`);return b.id;}
const stage=path.join(os.homedir(),'releases/arkodia-layers');

export async function retryPartTransfer(transfer,wait=ms=>new Promise(r=>setTimeout(r,ms))){
 for(let attempt=0;;attempt++){
  try{return transfer();}catch(e){
   if(/already exists/i.test(e.message))return;
   const transient=/TLS handshake timeout|connection reset|client_timeout|transport error|unexpected EOF|temporary failure|i\/o timeout/i.test(e.message);
   if(!transient||attempt>=4)throw e;
   await wait(500*(attempt+1));
  }
 }
}

// Upload bytes as content-named parts under layers/, so a retry skips parts already there.
async function upload(id,bytes,name,size=4e6){
 const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12),parts=[];await fs.mkdir(stage,{recursive:true});
 for(let i=0;i<bytes.length;i+=size){const n=`${name}-${hash}-${parts.length}.part`;await fs.writeFile(path.join(stage,n),bytes.subarray(i,i+size));parts.push(n);}
 for(const n of parts)await retryPartTransfer(()=>run(['organization','home-files','transfer','--from-member',MEMBER,'--from',path.relative(os.homedir(),path.join(stage,n)),'--to-custom-sandbox',id,'--to','layers/'+n]));
 return {hash,parts};
}
async function register(id,name,layer){
 const lid=`${Date.now()}-${name}-${layer.hash}`;run(['organization','home-files','write','--custom-sandbox',id,'--path',`layers/${lid}.json`,'--content',JSON.stringify({seq:Date.now(),...layer})]);
 console.log('Registered layer',lid,'in',layer.parts.length,'parts');return lid;
}
// Apply layers without removing the public domain or listener. A gateway code upgrade needs
// a boot-process replacement once; never power-cycle the sandbox for ordinary publishing.
export async function restart(id=sandboxId(),check='/healthz',gatewayChanged=false){
 const source=readFileSync(fileURLToPath(new URL('./gateway.mjs',import.meta.url)));
 const digest=createHash('sha256').update(source).digest('hex');
 let live;try{live=JSON.parse(run(['organization','home-files','file','--custom-sandbox',id,'--path','.gateway-live.json']).content);}catch{}
 if(live?.version===1&&(!gatewayChanged||live.digest===digest)){
  const job='apply-release-'+Date.now();
  run(['sandboxes','exec',id,'--name',job,'--cmd','cd "$HOME" && node apply-live.mjs']);
  let finished=false;
  for(let i=0;i<100;i++){
   const process=run(['sandboxes','ps',id]).find(p=>p.name===job);
   if(process&&!process.running){
    const logs=run(['sandboxes','logs',id,'--name',job,'--lines','30']);
    if(process.exit_code!==0)throw Error('Live release failed: '+JSON.stringify(logs));
    console.log('Applied without sandbox restart:',JSON.stringify(logs));finished=true;break;
   }
   await new Promise(r=>setTimeout(r,2000));
  }
  if(!finished)throw Error('Live release has not finished; inspect sandbox logs before retrying');
 }else{
  const state=run(['sandboxes','get',id]);
  run(['sandboxes',state.enabled===false?'on':'boot',id]);
 }
 for(let i=0;i<60;i++){try{if((await fetch(URL_BASE+check,{signal:AbortSignal.timeout(10000)})).ok){console.log('Live:',URL_BASE+check);return;}}catch{}await new Promise(r=>setTimeout(r,1000));}
 throw Error(`${URL_BASE}${check} did not come back`);
}
export async function publishLayer({name,files,prefix='',check,deferRestart=false,targetSandbox}){
 if(!prefix&&'/index.html' in files)throw Error('The game page ships only as a release (scripts/fural-deploy.sh)');
 const id=targetSandbox||sandboxId(),{hash,parts}=await upload(id,gzipSync(JSON.stringify(files)),name);
 const layerId=await register(id,name,{hash,parts,format:'gzjson',prefix});if(!deferRestart)await restart(id,check||(prefix?prefix+'/':'/'));return layerId;
}
// Write this commit's gateway and boot script; they take effect at the next restart.
function installGateway(id){
 const helper=readFileSync(fileURLToPath(new URL('./apply-live.mjs',import.meta.url)),'utf8');
 run(['organization','home-files','write','--custom-sandbox',id,'--path','apply-live.mjs','--content',helper]);
 const src=readFileSync(fileURLToPath(new URL('./gateway.mjs',import.meta.url)),'utf8');
 run(['organization','home-files','write','--custom-sandbox',id,'--path','gateway.mjs','--content',src]);
 const jsonLayer=readFileSync(fileURLToPath(new URL('./apply-json-layer.mjs',import.meta.url)),'utf8');run(['organization','home-files','write','--custom-sandbox',id,'--path','apply-json-layer.mjs','--content',jsonLayer]);run(['sandboxes','update',id,'--boot-script',BOOT]);
}
// Full-state persistence is a shipped compatibility contract, never an optional layer.
export function requireReleaseAncestor(required,head='HEAD'){
 try{execFileSync('git',['merge-base','--is-ancestor',required,head],{stdio:'pipe'});}catch{throw Error(`Release would remove shipped gameplay: merge ${required} before publishing ${head}`);}
}
export async function publishRelease({name='game',tgz,check='/healthz'}){
 requireReleaseAncestor('d63f71921b6cf0c715fd4daa9423eeb96e8c73d6');
 const id=sandboxId();
 const applied=JSON.parse(run(['organization','home-files','file','--custom-sandbox',id,'--path','applied.json']).content);
 const latest=applied.map(n=>n.match(/-(?:game|gameplay-progress|environment-editor|settings-pixi|skill-inspection|houdini-flame-fan)-([a-f0-9]{7,40})-[a-f0-9]{12}$/)?.[1]).filter(Boolean).at(-1);
 if(latest)requireReleaseAncestor(latest);
 const {hash,parts}=await uploadReleaseParts({file:tgz,name,dir:stage,transfer:async(local,part)=>{await retryPartTransfer(()=>run(['organization','home-files','transfer','--from-member',MEMBER,'--from',path.relative(os.homedir(),local),'--to-custom-sandbox',id,'--to',`layers/${part}`]));}});
 installGateway(id);await register(id,name,{hash,parts,format:'tgz'});await restart(id,check,true);
}
export async function deployGateway(){const id=sandboxId();installGateway(id);await restart(id,'/',true);}
export async function readDir(dir){const files={};for(const f of await fs.readdir(dir,{recursive:true})){const p=path.join(dir,f);if((await fs.stat(p)).isFile())files['/'+f.split(path.sep).join('/')]=(await fs.readFile(p)).toString('base64');}return files;}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const arg=k=>{const i=process.argv.indexOf('--'+k);return i<0?undefined:process.argv[i+1]??true;};
 if(arg('gateway'))await deployGateway();
 else if(arg('tgz'))await publishRelease({name:arg('name')||'game',tgz:arg('tgz')});
 else if(arg('dir'))await publishLayer({name:arg('name')||path.basename(path.resolve(arg('dir'))),files:await readDir(arg('dir')),prefix:arg('prefix')||''});
 else{console.error('Usage: --dir DIR --prefix /folder [--name N] | --tgz FILE [--name N] | --gateway');process.exit(1);}
}
