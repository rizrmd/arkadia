import {execFileSync} from 'node:child_process';import {publishLayer,restart,sandboxId} from '../arkodia/publish-layer.mjs';import {partitionLayerFiles} from '../flame-fan-gameplay/batch-files.mjs';
const files={};for(const p of execFileSync('git',['ls-files','docs/burn-soil'],{encoding:'utf8'}).trim().split('\n'))files['/'+p.split('/').pop()]=execFileSync('git',['show','HEAD:'+p],{maxBuffer:8e6}).toString('base64');
const sandbox=sandboxId();for(const [i,batch] of partitionLayerFiles(files,6*1024*1024).entries())await publishLayer({name:'burn-soil-evidence-'+i,files:batch,prefix:'/burn-soil/evidence',deferRestart:true,targetSandbox:sandbox});
await restart(sandbox,'/burn-soil/evidence/live-preview.json');
