import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {build} from 'vite';
import {publishRelease} from '../arkodia/publish-layer.mjs';
// Add compiled code + server to the retained static site. No new gameplay raster
// assets are needed; existing public assets and other review routes stay in www.
const stage=await fs.mkdtemp(path.join(os.homedir(),'releases/burn-stage-')),site=path.join(stage,'site');
try{
 await build({logLevel:'error',build:{copyPublicDir:false,outDir:site,emptyOutDir:true}});
 execFileSync('go',['build','-trimpath','-ldflags=-s -w','-o',path.join(stage,'arkodia'),'./cmd/arkodia'],{cwd:'server',stdio:'inherit',env:{...process.env,CGO_ENABLED:'0',GOOS:'linux',GOARCH:'amd64'}});
 execFileSync('node',['scripts/flame-fan-flipbook/build.mjs'],{stdio:'inherit'});
 await fs.cp('dist-flame-fan-flipbook',path.join(site,'ember-warden-review/flame-fan-flipbook'),{recursive:true});
 await fs.cp('docs/burn-soil',path.join(site,'burn-soil/evidence'),{recursive:true});
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 await fs.writeFile(path.join(site,'burn-soil/release.json'),JSON.stringify({commit:sha,balancePending:true,damagePerTick:null,tickOffsetsMs:[200,400,600,800,1000],preview:'/ember-warden-review/flame-fan-flipbook/'},null,2));
 const archive=path.join(os.homedir(),'releases',`burn-soil-${sha.slice(0,8)}-${Date.now()}.tgz`);
 execFileSync('python3',['-c',"import sys,tarfile\nwith tarfile.open(sys.argv[2],'w:gz',format=tarfile.USTAR_FORMAT) as t:t.add(sys.argv[1],arcname='.')",stage,archive]);
 await publishRelease({name:'burn-soil-'+sha.slice(0,8),tgz:archive});
 console.log('Burn Soil release:',sha,'https://ark-whachat.fural.space/burn-soil/release.json');
}finally{await fs.rm(stage,{recursive:true,force:true});}
