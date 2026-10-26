import {execFileSync} from 'node:child_process';import {publishLayer,restart,sandboxId,readDir} from '../arkodia/publish-layer.mjs';import {partitionLayerFiles} from '../flame-fan-gameplay/batch-files.mjs';
if(process.env.BURN_SOIL_PREVIEW==='1'){
 execFileSync('git',['diff','--exit-code','HEAD','--','src/fx/flame-fan-flipbook.ts','src/fx/burn-soil.ts','scripts/flame-fan-flipbook/build.mjs'],{stdio:'inherit'});
 execFileSync('node',['scripts/flame-fan-flipbook/build.mjs'],{stdio:'inherit'});
 const preview=await readDir('dist-flame-fan-flipbook'),sandbox=sandboxId();
 for(const [i,batch] of partitionLayerFiles(preview,6*1024*1024).entries())await publishLayer({name:'burn-soil-preview-'+i,files:batch,prefix:'/ember-warden-review/flame-fan-flipbook',deferRestart:true,targetSandbox:sandbox});
}
const files={};for(const p of execFileSync('git',['ls-files','docs/burn-soil'],{encoding:'utf8'}).trim().split('\n'))files['/'+p.split('/').pop()]=execFileSync('git',['show','HEAD:'+p],{maxBuffer:8e6}).toString('base64');
const sandbox=sandboxId();for(const [i,batch] of partitionLayerFiles(files,6*1024*1024).entries())await publishLayer({name:'burn-soil-evidence-'+i,files:batch,prefix:'/burn-soil/evidence',deferRestart:true,targetSandbox:sandbox});
await restart(sandbox,'/burn-soil/evidence/live-preview.json');
