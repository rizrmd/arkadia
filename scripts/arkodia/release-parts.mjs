import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Two bounded passes over a completed archive: hash it, then stage/transfer one
// reusable part at a time. Retained files support the existing retry protocol.
export async function uploadReleaseParts({file,name,dir,size=4e6,transfer}){
 if(!Number.isSafeInteger(size)||size<1)throw Error('Invalid release part size');
 const before=await fs.stat(file),digest=createHash('sha256');
 for await(const chunk of createReadStream(file,{highWaterMark:1<<20}))digest.update(chunk);
 const hash=digest.digest('hex').slice(0,12),parts=[];
 await fs.mkdir(dir,{recursive:true});const handle=await fs.open(file,'r'),buffer=Buffer.allocUnsafe(size);
 try{
  let position=0;
  while(position<before.size){
   let length=0;
   while(length<size&&position+length<before.size){const {bytesRead}=await handle.read(buffer,length,Math.min(size-length,before.size-position-length),position+length);if(!bytesRead)throw Error('Release archive truncated during upload');length+=bytesRead;}
   const part=`${name}-${hash}-${parts.length}.part`,local=path.join(dir,part);
   await fs.writeFile(local,buffer.subarray(0,length));await transfer(local,part);parts.push(part);position+=length;
  }
  const after=await fs.stat(file);if(after.size!==before.size||after.mtimeMs!==before.mtimeMs)throw Error('Release archive changed during upload');
  return {hash,parts};
 }finally{await handle.close();}
}
