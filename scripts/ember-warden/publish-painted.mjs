import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// A scoped layer for the existing consolidated Arkodia gateway. Never writes
// the game page, binaries, gateway configuration, or another review directory.
const root='public/ember-warden/v2',prefix='/ember-warden-review/v2',base='https://ark-whachat.fural.space';
const run=args=>{try{return JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:4e6,stdio:['ignore','pipe','pipe']}))}catch(e){throw Error((e.stderr||e.stdout||e.message).toString().slice(0,2000))}};
const sandboxes=run(['sandboxes','list','--project','PJ8758f22f61165f3d3215e454']),sandbox=sandboxes.find(s=>s.name==='arkadia');
if(!sandbox?.boot_running)throw Error('Existing Arkodia gateway must be running before publishing');
const files={},resources={};
for(const file of await fs.readdir(root,{recursive:true})){const full=root+'/'+file;if(!(await fs.stat(full)).isFile())continue;const b=await fs.readFile(full);files['/'+file]=b.toString('base64');resources[file]=createHash('sha256').update(b).digest('hex')}
const bytes=gzipSync(JSON.stringify(files)),hash=createHash('sha256').update(bytes).digest('hex').slice(0,12),stage=path.resolve('.publish/ember-painted');
await fs.mkdir(stage,{recursive:true});const parts=[];
for(let i=0;i<bytes.length;i+=4e6){const name=`ember-painted-${hash}-${parts.length}.part`;await fs.writeFile(stage+'/'+name,bytes.subarray(i,i+4e6));parts.push(name)}
for(const name of parts){try{run(['organization','home-files','transfer','--from-member','US4f550b10dab65dc9756fa429','--from',path.relative(os.homedir(),stage+'/'+name),'--to-custom-sandbox',sandbox.id,'--to','layers/'+name])}catch(e){if(!e.message.includes('already exists'))throw e}}
const id=Date.now()+'-ember-painted-'+hash;
run(['organization','home-files','write','--custom-sandbox',sandbox.id,'--path','layers/'+id+'.json','--content',JSON.stringify({seq:Date.now(),hash,parts,format:'gzjson',prefix})]);
run(['sandboxes','restart',sandbox.id]);
let healthy=false;
for(let i=0;i<12;i++){try{const response=await fetch(base+prefix+'/manifest.json?release='+hash,{signal:AbortSignal.timeout(5000)});if(response.ok&&JSON.stringify(await response.json())===JSON.stringify(JSON.parse(await fs.readFile(root+'/manifest.json')))){healthy=true;break}}catch{}await new Promise(r=>setTimeout(r,2000))}
if(!healthy)throw Error('Painted art layer did not become healthy within the bounded release check');
// Verify the entire uploaded layer, including HTML, scripts and screenshots.
for(const [file,expected]of Object.entries(resources)){const response=await fetch(base+prefix+'/'+file+'?release='+hash,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Deployed file missing '+file);const actual=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');if(actual!==expected)throw Error('Deployed bytes mismatch '+file)}
const receipt={status:'all-deployed-resource-bytes-match',url:base+prefix+'/',sandbox:sandbox.id,layer:id,hash,resources};
await fs.writeFile('docs/ember-warden-v2/deployment.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,url:receipt.url,resources:Object.keys(resources).length,layer:id}));
