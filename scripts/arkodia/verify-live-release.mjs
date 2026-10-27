import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'arkodia-live-release-'));
const freePort=()=>new Promise(resolve=>{const s=http.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const port=await freePort(),coopPort=await freePort(),base=`http://127.0.0.1:${port}`;
let child,logs='',monitoring=false,requests=0,failures=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const apply=()=>new Promise((resolve,reject)=>{const q=http.request({socketPath:path.join(root,'.gateway-control.sock'),method:'POST',path:'/apply'},r=>{let body='';r.on('data',b=>body+=b);r.on('end',()=>resolve({status:r.statusCode,body}));});q.on('error',reject);q.end();});
const binary=version=>`#!${process.execPath}\nconst http=require('http'),fs=require('fs');const s=http.createServer((q,r)=>r.end('${version}'));s.listen(+process.env.PORT,'127.0.0.1');process.on('SIGTERM',()=>{fs.writeFileSync(process.env.GAME_SAVE_DIR+'/saved-${version}','saved');s.close(()=>process.exit(0));});\n`;
async function waitFor(check){for(let i=0;i<200;i++){if(child.exitCode!==null)throw Error(logs);try{if(await check())return;}catch{}await pause(25);}throw Error('Timed out: '+logs);}
try{
 for(const dir of ['www/rift-dash/player','layers','coop','game-saves'])await fs.mkdir(path.join(root,dir),{recursive:true});
 for(const name of ['gateway.mjs','apply-json-layer.mjs'])await fs.copyFile('scripts/arkodia/'+name,path.join(root,name));
 await fs.writeFile(path.join(root,'www/index.html'),'game v1');await fs.writeFile(path.join(root,'www/rift-dash/player/index.html'),'player v1');
 await fs.writeFile(path.join(root,'coop/arkodia'),binary('v1'),{mode:0o755});
 child=spawn(process.execPath,['gateway.mjs'],{cwd:root,env:{...process.env,PORT:String(port),COOP_PORT:String(coopPort)},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
 await waitFor(async()=>await fs.stat(path.join(root,'.gateway-control.sock'))&&(await (await fetch(base+'/healthz')).text())==='v1');
 const pid=JSON.parse(await fs.readFile(path.join(root,'.gateway-live.json'))).pid;
 monitoring=true;const monitor=(async()=>{while(monitoring){for(const p of ['/dev','/rift-dash/player/']){try{const r=await fetch(base+p);const text=await r.text();requests++;if(r.status!==200||!text)failures.push({p,status:r.status});}catch(e){failures.push({p,error:e.message});}}await pause(2);}})();
 // A review layer changes the player without restarting the gateway or game process.
 await fs.writeFile(path.join(root,'layers/review.part'),gzipSync(JSON.stringify({'/index.html':Buffer.from('player v2').toString('base64'),'/large.bin':Buffer.alloc(8<<20,1).toString('base64')})));
 await fs.writeFile(path.join(root,'layers/review.json'),JSON.stringify({seq:1,format:'gzjson',parts:['review.part'],prefix:'/rift-dash/player'}));
 assert.equal((await apply()).status,200);assert.equal(await(await fetch(base+'/rift-dash/player/')).text(),'player v2');
 await assert.rejects(fs.stat(path.join(root,'game-saves/saved-v1')));
 // A full release replaces the running executable atomically and flushes old game saves.
 const fixture=path.join(root,'fixture');await fs.mkdir(path.join(fixture,'site'),{recursive:true});await fs.writeFile(path.join(fixture,'arkodia'),binary('v2'),{mode:0o755});await fs.writeFile(path.join(fixture,'site/index.html'),'game v2');await fs.writeFile(path.join(fixture,'site/payload.bin'),Buffer.alloc(16<<20,7));
 execFileSync('tar',['-czf',path.join(root,'layers/game.part'),'-C',fixture,'.']);
 await fs.writeFile(path.join(root,'layers/game.json'),JSON.stringify({seq:2,format:'tgz',parts:['game.part']}));
 assert.equal((await apply()).status,200);await waitFor(async()=>await(await fetch(base+'/healthz')).text()==='v2');
 assert.equal(await fs.readFile(path.join(root,'game-saves/saved-v1'),'utf8'),'saved');assert.equal(await(await fetch(base+'/dev')).text(),'game v2');
 assert.equal(JSON.parse(await fs.readFile(path.join(root,'.gateway-live.json'))).pid,pid);
 // A corrupt archive fails visibly while the existing game/player keep serving.
 await fs.writeFile(path.join(root,'layers/broken.part'),'not a gzip');await fs.writeFile(path.join(root,'layers/broken.json'),JSON.stringify({seq:3,format:'tgz',parts:['broken.part']}));
 assert.equal((await apply()).status,500);assert.equal(await(await fetch(base+'/rift-dash/player/')).text(),'player v2');assert.equal(await(await fetch(base+'/healthz')).text(),'v2');
 assert.ok(!JSON.parse(await fs.readFile(path.join(root,'applied.json'))).includes('broken'));
 monitoring=false;await monitor;assert.deepEqual(failures,[]);assert.ok(requests>10);
 const report={pass:true,requests,failures,gatewayPidUnchanged:true,reviewPreservesGameProcess:true,fullReleaseFlushesSave:true,corruptReleasePreservesExistingPages:true};
 await fs.mkdir('docs/dev-menu-availability',{recursive:true});await fs.writeFile('docs/dev-menu-availability/local-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{monitoring=false;if(child&&child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}await fs.rm(root,{recursive:true,force:true});}
