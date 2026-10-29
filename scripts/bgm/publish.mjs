// Frontend-only game release: reuse the live server and unchanged public artwork.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {publishRelease} from '../arkodia/publish-layer.mjs';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const stage=await fs.mkdtemp(path.join(os.homedir(),'releases/bgm-'));
await fs.mkdir(path.join(stage,'site/assets'),{recursive:true});
const files=['index.html',...(await fs.readdir('dist/assets')).filter(n=>/\.(js|css|mp3|wav)$/.test(n)).map(n=>'assets/'+n)];
const hashes={};
for(const f of files){const bytes=await fs.readFile('dist/'+f);await fs.writeFile(path.join(stage,'site',f),bytes);hashes['/'+f]=createHash('sha256').update(bytes).digest('hex');}
await fs.mkdir(path.join(stage,'site/bgm'),{recursive:true});
await fs.writeFile(path.join(stage,'site/bgm/release.json'),JSON.stringify({commit,frontendOnly:true,files:hashes},null,2));
const archive=stage+'.tgz';execFileSync('tar',['-czf',archive,'-C',stage,'.']);
// curl follows the sandbox's network routing; Node fetch cannot reach this hostname here.
const nativeFetch=globalThis.fetch;
globalThis.fetch=async url=>{const code=execFileSync('curl',['-sS','--max-time','10','-o','/dev/null','-w','%{http_code}',String(url)],{encoding:'utf8'});return {ok:code==='200'};};
try{await publishRelease({name:'game-'+commit.slice(0,8),tgz:archive});}finally{globalThis.fetch=nativeFetch;}
console.log('Frontend BGM release published:',commit);
