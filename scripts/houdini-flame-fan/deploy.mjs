import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {publishRelease} from '../arkodia/publish-layer.mjs';
execFileSync('node',['scripts/houdini-flame-fan/build.mjs'],{stdio:'inherit'});
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),stage=await fs.mkdtemp(path.join(os.homedir(),'releases/houdini-stage-'));
try{
 const site=path.join(stage,'site/houdini-flame-fan');await fs.mkdir(site,{recursive:true});await fs.cp('dist-houdini-flame-fan',site,{recursive:true});
 const archive=path.join(os.homedir(),'releases',`houdini-flame-fan-${sha.slice(0,8)}-${Date.now()}.tgz`);
 execFileSync('python3',['-c',"import sys,tarfile\nwith tarfile.open(sys.argv[2],'w:gz',format=tarfile.USTAR_FORMAT) as t:t.add(sys.argv[1],arcname='.')",stage,archive]);
 await publishRelease({name:'houdini-flame-fan-'+sha.slice(0,8),tgz:archive,check:'/houdini-flame-fan/'});
 await fs.writeFile(os.homedir()+'/releases/houdini-flame-fan-deployment.json',JSON.stringify({commit:sha,archive,url:'https://ark-whachat.fural.space/houdini-flame-fan/'},null,2));
}finally{await fs.rm(stage,{recursive:true,force:true});}
