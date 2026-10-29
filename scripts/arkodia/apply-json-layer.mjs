import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {createGunzip} from 'node:zlib';

// Publisher JSON is a flat {path: canonical-base64} object. Decode one chunk
// at a time and stage the whole layer until JSON and gzip CRC validation finish.
// Boot must not retain compressed bytes + expanded JSON + all decoded assets.
export async function applyJsonLayer(home,www,layer){
 const temporary=fs.mkdtempSync(path.join(home,'.layer-json-')),entries=[];
 let state='firstKeyOrEnd',keyText='',key='',escaped=false,carry='',fd=null;
 const write=(text,final=false)=>{
  if(!/^[A-Za-z0-9+/=]*$/.test(text))throw Error('Layer contains noncanonical base64');
  const combined=carry+text,n=final?combined.length:combined.length-combined.length%4;
  const bytes=Buffer.from(combined.slice(0,n),'base64');carry=combined.slice(n);
  for(let at=0;at<bytes.length;){const count=fs.writeSync(fd,bytes,at,bytes.length-at);if(!count)throw Error('Layer write made no progress');at+=count;}
 };
 async function* parts(){for(const part of layer.parts)for await(const chunk of fs.createReadStream(path.join(home,'layers',part)))yield chunk;}
 const input=Readable.from(parts()),gzip=createGunzip();gzip.setEncoding('utf8');input.on('error',error=>gzip.destroy(error));input.pipe(gzip);
 try{
  let started=false;
  for await(const text of gzip){let i=0;while(i<text.length){
   if(state==='value'){
    const end=text.indexOf('"',i);write(text.slice(i,end<0?text.length:end),end>=0);i=end<0?text.length:end+1;
    if(end>=0){fs.closeSync(fd);fd=null;carry='';state='commaOrEnd';}continue;
   }
   const c=text[i++];
   if(!started){if(/\s/.test(c))continue;if(c!=='{')throw Error('Layer must be an object');started=true;continue;}
   if(state==='key'){
    keyText+=c;if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(c==='"'){key=JSON.parse(keyText);state='colon';}continue;
   }
   if(/\s/.test(c))continue;
   if(state==='firstKeyOrEnd'||state==='nextKey'){
    if(c==='}'&&state==='firstKeyOrEnd'){state='done';continue;}
    if(c!=='"')throw Error('Layer key must be a JSON string');keyText='"';escaped=false;state='key';
   }else if(state==='colon'){if(c!==':')throw Error('Layer key requires colon');state='valueStart';}
   else if(state==='valueStart'){
    if(c!=='"')throw Error('Layer value must be base64 string');const file=path.join(temporary,String(entries.length));fd=fs.openSync(file,'w');entries.push({file,destination:path.join(www,path.normalize((layer.prefix||'')+key))});state='value';
   }else if(state==='commaOrEnd'){
    if(c==='}')state='done';else if(c===',')state='nextKey';else throw Error('Layer requires comma or end');
   }else throw Error('Unexpected content after layer');
  }}
  if(!started||state!=='done')throw Error('Incomplete layer JSON');
  for(const {file,destination} of entries){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(file,destination);}
  return entries.length;
 }finally{if(fd!==null)fs.closeSync(fd);input.destroy();gzip.destroy();fs.rmSync(temporary,{recursive:true,force:true});}
}
