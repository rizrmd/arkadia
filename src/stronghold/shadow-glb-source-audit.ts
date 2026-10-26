import {create3dHeroRenderer} from './hero-3d';
import {skinVertex} from './shadow-skinned-reference';
const digest=async(bytes:BufferSource)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
/** All authored keys and their interpolation midpoints, rather than just a clip thumbnail. */
export async function auditGlbSourceFrames(heroId='ember-warden',clip='idle',yaws=Array.from({length:8},(_,i)=>i*Math.PI/4)){
 const manifest=await fetch('/assets/characters/manifest.json').then(r=>r.json()),cell=manifest.characters[heroId]?.cell;if(!cell)throw Error('Unknown hero cell '+heroId);
 const producer=create3dHeroRenderer({diagnostic:true,heroId}),start=performance.now();
 try{
  while(!producer.isHeroReady(heroId)){if(performance.now()-start>120000)throw Error('GLB producer load timeout');await new Promise(r=>setTimeout(r,20));}
  const metadata=producer.auditClips(heroId).find(c=>c.name===clip);if(!metadata)throw Error('Missing clip '+clip);
  const times=[...new Set([...metadata.times,...metadata.times.slice(1).map((v,i)=>(v+metadata.times[i])*.5)])].sort((a,b)=>a-b),rows:any[]=[],failures:string[]=[],canvas=document.createElement('canvas');let checkedVertices=0,maxVertexDelta=0;
  for(const time of times)for(const yaw of yaws){
   const result=producer.updateAndRender({heroId,clip,moving:clip.startsWith('run'),yaw,dt:0,tint:'255,255,255',night:0,cell,auditPose:{clip,time}});if(!result)throw Error('Missing GLB source frame');
   canvas.width=result.spriteW;canvas.height=result.spriteH;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(result.sprite,0,0,result.spriteW,result.spriteH,0,0,canvas.width,canvas.height);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data,alpha=new Uint8Array(canvas.width*canvas.height);let opaque=0,partial=0;
   for(let i=0;i<alpha.length;i++){const a=data[i*4+3];alpha[i]=a;if(a===255)opaque++;else if(a)partial++;}
   if(!opaque||result.activeClip!==clip||result.shadowMeshes.length!==1)failures.push('Invalid source '+clip+':'+time+':'+yaw);
   const pose=result.shadowMeshes[0],count=pose.geometry.positions.length/3,indices=[...new Set(Array.from({length:32},(_,i)=>Math.floor(i*(count-1)/31)))];
   for(const expected of producer.auditVertices(heroId,indices)){const actual=skinVertex(pose,expected.index),delta=Math.max(...actual.map((v,i)=>Math.abs(v-expected.world[i])));checkedVertices++;maxVertexDelta=Math.max(maxVertexDelta,delta);if(delta>1e-5)failures.push('Source pose deformation mismatch '+time+':'+yaw+':'+expected.index+':'+delta);}
   const matrices=[pose.bindInverse,pose.bones,pose.model,pose.camera],poseBytes=new Uint8Array(matrices.reduce((n,m)=>n+m.byteLength,0));let offset=0;for(const matrix of matrices){poseBytes.set(new Uint8Array(matrix.buffer,matrix.byteOffset,matrix.byteLength),offset);offset+=matrix.byteLength;}
   const [alphaSha256,poseSha256]=await Promise.all([digest(alpha),digest(poseBytes)]);
   rows.push({time,yaw,activeClip:result.activeClip,revision:result.revision,sourceSize:[canvas.width,canvas.height],alphaSha256,poseSha256,opaque,partial,heightScale:pose.heightScale,heightRange:pose.heightRange});
  }
  return {heroId,clip,cell,metadata,headings:yaws,authoredKeys:metadata.times.length,interpolationMidpoints:times.length-metadata.times.length,sourceFrames:rows.length,checkedVertices,maxVertexDelta,rows,failures,scope:'Every authored key and interval midpoint at eight runtime headings; original post-process alpha and the matching evaluated skin matrices. Detailed field casting/reception is a separate GPU report; this is not an exhaustive test of continuous real-valued time.'};
 }finally{producer.destroy();}
}
