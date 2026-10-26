import fs from 'node:fs';import fsp from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {randomBytes} from 'node:crypto';import {gzipSync} from 'node:zlib';import {spawn,execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
// Exercise the real gateway with a 96 MiB incompressible release. Archive application must remain below
// 100 MiB Node RSS, leaving ample room inside the production boot workload's 768 MiB limit.
const root=await fsp.mkdtemp(path.join(os.tmpdir(),'arkodia-release-memory-')),fixture=path.join(root,'fixture'),home=path.join(root,'home'),port=5984;
let child,peakKiB=0,logs='';
try{
 fs.mkdirSync(path.join(fixture,'site'),{recursive:true});fs.mkdirSync(path.join(home,'layers'),{recursive:true});
 const block=randomBytes(1<<20),fd=fs.openSync(path.join(fixture,'site/payload.bin'),'w');for(let i=0;i<96;i++)fs.writeSync(fd,block);fs.closeSync(fd);
 fs.writeFileSync(path.join(fixture,'site/index.html'),'bounded release test');const archive=path.join(root,'release.tgz');execFileSync('tar',['-czf',archive,'-C',fixture,'.']);
 const input=fs.openSync(archive,'r'),chunk=Buffer.allocUnsafe(4<<20),parts=[];let size;
 while((size=fs.readSync(input,chunk,0,chunk.length,null))>0){const name=`part-${parts.length}`;fs.writeFileSync(path.join(home,'layers',name),chunk.subarray(0,size));parts.push(name);}fs.closeSync(input);
 fs.writeFileSync(path.join(home,'layers/json.part'),gzipSync(JSON.stringify({'/proof.bin':'A'.repeat(64*1024*1024)})));fs.writeFileSync(path.join(home,'layers/json.json'),JSON.stringify({seq:0,format:'gzjson',parts:['json.part'],prefix:'/shadow-audit'}));fs.copyFileSync('scripts/arkodia/apply-json-layer.mjs',path.join(home,'apply-json-layer.mjs'));
 fs.writeFileSync(path.join(home,'layers/test.json'),JSON.stringify({seq:1,format:'tgz',parts}));fs.copyFileSync('scripts/arkodia/gateway.mjs',path.join(home,'gateway.mjs'));
 child=spawn(process.execPath,['gateway.mjs'],{cwd:home,env:{...process.env,PORT:String(port),COOP_PORT:'5983'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
 let ready=false;const start=Date.now();
 while(Date.now()-start<60000){
  try{const status=fs.readFileSync(`/proc/${child.pid}/status`,'utf8'),rss=+(/VmRSS:\s+(\d+)/.exec(status)?.[1]||0);peakKiB=Math.max(peakKiB,rss);}catch{}
  if(child.exitCode!==null)throw Error('Gateway exited: '+logs);
  if(logs.includes('gateway listening')){const r=await fetch(`http://127.0.0.1:${port}/`);assert.equal(await r.text(),'bounded release test');ready=true;break;}
  await new Promise(r=>setTimeout(r,10));
 }
 assert.ok(ready,'Gateway not ready: '+logs);assert.equal(fs.statSync(path.join(home,'www/payload.bin')).size,96<<20);assert.equal(fs.statSync(path.join(home,'www/shadow-audit/proof.bin')).size,48<<20);assert.ok(peakKiB<100*1024,`Gateway RSS ${peakKiB} KiB exceeds bound`);
 const report={pass:true,precedingJsonBytes:64<<20,compressedArchiveBytes:fs.statSync(archive).size,expandedPayloadBytes:96<<20,parts:parts.length,nodePeakRSSKiB:peakKiB,nodeLimitKiB:100*1024};fs.writeFileSync('docs/terrain-height/release-memory-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}await fsp.rm(root,{recursive:true,force:true});}
