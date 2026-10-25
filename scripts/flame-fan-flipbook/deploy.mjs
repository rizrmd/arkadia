import {readDir,publishLayer,restart,sandboxId} from '../arkodia/publish-layer.mjs';
import {partitionLayerFiles} from '../flame-fan-gameplay/batch-files.mjs';
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
// Preview source and shared publisher must match committed code. Peer WIP is never packaged.
execFileSync('git',['diff','--exit-code','HEAD','--','src/fx/flame-fan-flipbook.ts','flame-fan-flipbook.html','vite.flame-fan-flipbook.config.ts','public/flame-fan-flipbook','scripts/flame-fan-flipbook','scripts/arkodia/publish-layer.mjs','scripts/flame-fan-gameplay/batch-files.mjs'],{stdio:'inherit'});
execFileSync('node',['scripts/flame-fan-flipbook/build.mjs'],{stdio:'inherit'});
const files=await readDir('dist-flame-fan-flipbook');
for(const name of await fs.readdir('docs/flame-fan-flipbook'))if(/\.(png|json|md)$/.test(name))files['/evidence/'+name]=(await fs.readFile('docs/flame-fan-flipbook/'+name)).toString('base64');
const batches=partitionLayerFiles(files,6*1024*1024),ids=[],sandbox=sandboxId();
for(const [i,batch] of batches.entries())ids.push(await publishLayer({name:'flame-fan-flipbook-'+i,files:batch,prefix:'/ember-warden-review/flame-fan-flipbook',deferRestart:true,targetSandbox:sandbox}));
await restart(sandbox,'/ember-warden-review/flame-fan-flipbook/');
await fs.writeFile('/home/dev/attachments/flame-deployment.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),ids,budgetBytes:6*1024*1024,url:'https://ark-whachat.fural.space/ember-warden-review/flame-fan-flipbook/'},null,2));
