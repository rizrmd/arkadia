// Bound decoded JSON, not compressed bytes: the gateway parses one layer at a time.
export function partitionLayerFiles(files,limit=8*1024*1024){
 const batches=[];let batch={},bytes=2,count=0;
 for(const [key,value] of Object.entries(files)){
  const entry=Buffer.byteLength(JSON.stringify(key))+1+Buffer.byteLength(JSON.stringify(value));
  if(entry+2>limit)throw Error('File exceeds layer JSON budget: '+key);
  if(bytes+entry+(count?1:0)>limit){batches.push(batch);batch={};bytes=2;count=0;}
  batch[key]=value;bytes+=entry+(count?1:0);count++;
 }
 if(count)batches.push(batch);return batches;
}
