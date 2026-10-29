import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash,randomBytes} from 'node:crypto';import {spawnSync} from 'node:child_process';import {uploadReleaseParts} from './release-parts.mjs';
if(!process.argv.includes('--child')){const run=spawnSync(process.execPath,['--max-old-space-size=32',import.meta.filename,'--child'],{encoding:'utf8',timeout:60000});if(run.status!==0)throw Error(run.stderr||run.stdout);process.stdout.write(run.stdout);}else{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'publisher-memory-'));
 try{
  const file=path.join(root,'release.tgz'),block=randomBytes(1<<20),expected=createHash('sha256'),handle=await fs.open(file,'w');for(let i=0;i<128;i++){await handle.write(block);expected.update(block);}await handle.close();
  const received=createHash('sha256');let count=0,bytes=0,maxPart=0;const result=await uploadReleaseParts({file,name:'test',dir:path.join(root,'parts'),transfer:async(local,part)=>{const b=await fs.readFile(local);assert.ok(part.endsWith(`-${count}.part`));received.update(b);count++;bytes+=b.length;maxPart=Math.max(maxPart,b.length);}});
  assert.equal(result.hash,expected.digest('hex').slice(0,12));assert.equal(result.hash,received.digest('hex').slice(0,12));assert.equal(bytes,128<<20);assert.equal(count,result.parts.length);assert.ok(maxPart<=4e6);
  const maxRssKiB=process.resourceUsage().maxRSS;assert.ok(maxRssKiB<128*1024,`Publisher RSS ${maxRssKiB} KiB`);
  const report={pass:true,archiveBytes:bytes,parts:count,maxPartBytes:maxPart,maxRssKiB,rssLimitKiB:128*1024,contentAndNamesPreserved:true};await fs.mkdir('docs/android-stutter',{recursive:true});await fs.writeFile('docs/android-stutter/publisher-memory-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await fs.rm(root,{recursive:true,force:true});}
}
