import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'arkodia-publish-lifecycle-'));
const oldPath=process.env.PATH,oldFetch=globalThis.fetch;
try{
 const calls=path.join(root,'calls.jsonl');process.env.LIFECYCLE_CALLS=calls;process.env.FURAL_PUBLISH_MEMBER='fixture';
 process.env.LIFECYCLE_DIGEST=createHash('sha256').update(fs.readFileSync('scripts/arkodia/gateway.mjs')).digest('hex');
 fs.writeFileSync(path.join(root,'fural-agent'),`#!${process.execPath}\nconst fs=require('fs'),a=process.argv.slice(2);fs.appendFileSync(process.env.LIFECYCLE_CALLS,JSON.stringify(a)+'\\n');let result={};if(a[0]==='organization')result={content:JSON.stringify({version:1,digest:process.env.LIFECYCLE_MODE==='upgrade'?'old':process.env.LIFECYCLE_DIGEST})};if(a[1]==='ps')result=[{name:fs.readFileSync(process.env.LIFECYCLE_CALLS,'utf8').trim().split('\\n').map(JSON.parse).find(x=>x[1]==='exec')[4],running:false,exit_code:process.env.LIFECYCLE_MODE==='failure'?1:0}];if(a[1]==='logs')result={log:'fixture reload result'};console.log(JSON.stringify(result));\n`,{mode:0o755});
 process.env.PATH=root+path.delimiter+oldPath;globalThis.fetch=async()=>({ok:true});
 const {restart}=await import('./publish-layer.mjs');
 for(const mode of ['live','upgrade','failure']){
  fs.writeFileSync(calls,'');process.env.LIFECYCLE_MODE=mode;
  if(mode==='failure')await assert.rejects(restart('fixture','/'),/Live release failed/);else await restart('fixture','/',true);
  const observed=fs.readFileSync(calls,'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(!observed.some(a=>a[1]==='restart'||a[1]==='off'),'Publishing must not power-cycle the sandbox');
  assert.equal(observed.some(a=>a[1]==='boot'),mode==='upgrade');
  assert.equal(observed.some(a=>a[1]==='exec'),mode!=='upgrade');
 }
 console.log('PASS: live apply, gateway boot upgrade, and visible failure without sandbox power cycle');
}finally{process.env.PATH=oldPath;globalThis.fetch=oldFetch;fs.rmSync(root,{recursive:true,force:true});}
