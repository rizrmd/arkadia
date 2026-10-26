import {readDir,publishLayer,deployGateway,sandboxId,URL_BASE} from '../arkodia/publish-layer.mjs';
import {partitionLayerFiles} from '../flame-fan-gameplay/batch-files.mjs';
import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:8e6}));
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
execFileSync('git',['diff','--exit-code','HEAD','--','src/fx/rift-dash-player.ts','src/fx/rift-dash-vfx.ts','public/rift-dash','scripts/rift-dash','scripts/arkodia/gateway.mjs'],{stdio:'inherit'});
execFileSync('node',['scripts/rift-dash/build.mjs'],{stdio:'inherit'});
const id=sandboxId(),live=run(['organization','home-files','file','--custom-sandbox',id,'--path','gateway.mjs']).content;
const next=await fs.readFile('scripts/arkodia/gateway.mjs','utf8');
const previous=next.replace("'/rift-dash/',",'').replace(" if(p.startsWith('/rift-dash/')&&(p.endsWith('/')||!path.extname(p))){res.writeHead(404,NO_STORE).end('Rift Dash player missing');return;}\n",'');
assert(live===previous||live===next,'Live gateway changed: reconcile before publishing; never overwrite a peer gateway.');
// Check other member sessions too: their filesystem locks cannot span separate nodes.
const sessions=run(['sessions','list','--all','--live']);
for(const s of sessions){if(s.id===process.env.FURAL_TURN_ID)continue;const tree=JSON.stringify(run(['sessions','process-tree',s.id]));if(/scripts\/(?:fural-deploy\.sh|arkodia\/publish-layer\.mjs|[^" ]*\/deploy\.(?:sh|mjs))/.test(tree))throw Error(`Peer deployment active: ${s.id}`);}
const files={};
for(const [p,b] of Object.entries(await readDir('dist-rift-dash')))files['/player'+p]=b;
for(const [p,b] of Object.entries(await readDir('public/rift-dash/v2')))files['/v2'+p]=b;
for(const p of await fs.readdir('docs/rift-dash/v2'))if(/\.(json|png|md)$/.test(p))files['/evidence/'+p]=(await fs.readFile('docs/rift-dash/v2/'+p)).toString('base64');
const layers=[];
for(const [i,batch] of partitionLayerFiles(files,6*1024*1024).entries())layers.push(await publishLayer({name:'rift-dash-player-'+i,files:batch,prefix:'/rift-dash',deferRestart:true,targetSandbox:id}));
// Recheck immediately before replacing the gateway, after uploads finish.
assert.equal(run(['organization','home-files','file','--custom-sandbox',id,'--path','gateway.mjs']).content,live,'Peer gateway changed during staging');
await deployGateway();
const html=await (await fetch(URL_BASE+'/rift-dash/player/')).text();assert.match(html,/Rift Dash · VFX Player/,'Dedicated player document must be live');
await fs.writeFile('docs/rift-dash/v2/deployment.json',JSON.stringify({commit,layers,url:URL_BASE+'/rift-dash/player/',at:new Date().toISOString()},null,2));
