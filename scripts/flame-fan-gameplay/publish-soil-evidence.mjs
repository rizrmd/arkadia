import {execFileSync} from 'node:child_process';import {readDir,publishLayer,restart,sandboxId} from '../arkodia/publish-layer.mjs';import {partitionLayerFiles} from './batch-files.mjs';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),prefix='/ember-warden-review/flame-fan-gameplay/soil-v2',files=await readDir('docs/flame-fan-gameplay/soil-v2'),batches=partitionLayerFiles(files),id=sandboxId();
for(let i=0;i<batches.length;i++)await publishLayer({name:`flame-soil-${commit.slice(0,8)}-${i+1}`,files:batches[i],prefix,deferRestart:true,targetSandbox:id});
await restart(id,prefix+'/README.md');console.log(JSON.stringify({commit,prefix,batches:batches.length}));
