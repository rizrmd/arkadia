import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {readDir,publishLayer,restart,sandboxId} from '../arkodia/publish-layer.mjs';import {partitionLayerFiles} from '../flame-fan-gameplay/batch-files.mjs';
execFileSync('node',['scripts/houdini-flame-fan/build.mjs'],{stdio:'inherit'});
const files=await readDir('dist-houdini-flame-fan'),id=sandboxId(),layers=[];
for(const [i,batch] of partitionLayerFiles(files,6*1024*1024).entries())layers.push(await publishLayer({name:'houdini-flame-fan-'+i,files:batch,prefix:'/houdini-flame-fan',deferRestart:true,targetSandbox:id}));
await restart(id,'/houdini-flame-fan/');
await fs.writeFile(process.env.HOME+'/releases/houdini-flame-fan-deployment.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),layers,url:'https://ark-whachat.fural.space/houdini-flame-fan/'},null,2));
