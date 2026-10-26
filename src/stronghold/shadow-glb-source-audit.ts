import {retainUnifiedActorShadows} from './shadow-actor-sources';
import {create3dHeroRenderer} from './hero-3d';
import {skinVertex,vector} from './shadow-skinned-reference';
const digest=async(bytes:BufferSource)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
/** All authored keys and their interpolation midpoints, rather than just a clip thumbnail. */
export async function auditGlbSourceFrames(heroId='ember-warden',clip='idle',yaws=Array.from({length:8},(_,i)=>i*Math.PI/4)){
 const manifest=await fetch('/assets/characters/manifest.json').then(r=>r.json()),cell=manifest.characters[heroId]?.cell;if(!cell)throw Error('Unknown hero cell '+heroId);
 const release=retainUnifiedActorShadows(),producer=create3dHeroRenderer({diagnostic:true,heroId}),start=performance.now();
 try{
  while(!producer.isHeroReady(heroId)){if(performance.now()-start>120000)throw Error('GLB producer load timeout');await new Promise(r=>setTimeout(r,20));}
  const metadata=producer.auditClips(heroId).find(c=>c.name===clip);if(!metadata)throw Error('Missing clip '+clip);
  const times=[...new Set([...metadata.times,...metadata.times.slice(1).map((v,i)=>(v+metadata.times[i])*.5)])].sort((a,b)=>a-b),rows:any[]=[],failures:string[]=[],canvas=document.createElement('canvas');let checkedVertices=0,maxVertexDelta=0,maxHeightContractDelta=0,maxGroundOffsetDelta=0;const geometrySamples=new Map<string,number[]>();
  for(const time of times)for(const yaw of yaws){
   const result=producer.updateAndRender({heroId,clip,moving:clip.startsWith('run'),yaw,dt:0,tint:'255,255,255',night:0,cell,auditPose:{clip,time}});if(!result)throw Error('Missing GLB source frame');
   canvas.width=result.spriteW;canvas.height=result.spriteH;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(result.sprite,0,0,result.spriteW,result.spriteH,0,0,canvas.width,canvas.height);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data,alpha=new Uint8Array(canvas.width*canvas.height);let opaque=0,partial=0;
   for(let i=0;i<alpha.length;i++){const a=data[i*4+3];alpha[i]=a;if(a===255)opaque++;else if(a)partial++;}
   if(!opaque||result.activeClip!==clip||result.shadowMeshes.length!==1)failures.push('Invalid source '+clip+':'+time+':'+yaw);
   const pose=result.shadowMeshes[0],count=pose.geometry.positions.length/3;
   let indices=geometrySamples.get(pose.geometry.key);
   if(!indices){const representatives=new Map<number,{index:number;weight:number}>();for(let i=0;i<count;i++)for(let j=0;j<4;j++){const joint=pose.geometry.joints[i*4+j],weight=pose.geometry.weights[i*4+j];if(weight>0&&weight>(representatives.get(joint)?.weight??-1))representatives.set(joint,{index:i,weight});}indices=[...new Set([...Array.from({length:32},(_,i)=>Math.floor(i*(count-1)/31)),...Array.from(representatives.values(),v=>v.index)])];geometrySamples.set(pose.geometry.key,indices);}
   const display=.66,top=result.spriteTop*cell.h/(result.spriteH-result.spriteTop),frameHeight=(cell.h+top)*display,pivotY=(cell.pivot.y+top)/(cell.h+top),heightScale=pose.heightScale*display;
   const groundError=Math.abs((.5-pose.camera[13]*.5-pivotY)*frameHeight-(result.groundY-cell.pivot.y)*display);maxGroundOffsetDelta=Math.max(maxGroundOffsetDelta,groundError);if(groundError>1e-4)failures.push('Ground/pivot mismatch '+time+':'+yaw+':'+groundError);
   let frameHeightDelta=0;
   for(const expected of producer.auditVertices(heroId,indices)){
    const actual=skinVertex(pose,expected.index),delta=Math.max(...actual.map((v,i)=>Math.abs(v-expected.world[i]))),projected=vector(pose.camera,actual),floor=vector(pose.camera,[actual[0],0,actual[2]]),heightDelta=Math.abs((projected[1]-floor[1])*.5*frameHeight-actual[1]*heightScale);
    checkedVertices++;maxVertexDelta=Math.max(maxVertexDelta,delta);maxHeightContractDelta=Math.max(maxHeightContractDelta,heightDelta);frameHeightDelta=Math.max(frameHeightDelta,heightDelta);
    if(delta>1e-5)failures.push('Source pose deformation mismatch '+time+':'+yaw+':'+expected.index+':'+delta);
    if(heightDelta>1e-4)failures.push('Source projected height mismatch '+time+':'+yaw+':'+expected.index+':'+heightDelta);
    if(actual[1]<pose.heightRange[0]-1e-5||actual[1]>pose.heightRange[1]+1e-5)failures.push('Pose bounds omitted vertex '+time+':'+yaw+':'+expected.index);
   }
   const matrices=[pose.bindInverse,pose.bones,pose.model,pose.camera],poseBytes=new Uint8Array(matrices.reduce((n,m)=>n+m.byteLength,0));let offset=0;for(const matrix of matrices){poseBytes.set(new Uint8Array(matrix.buffer,matrix.byteOffset,matrix.byteLength),offset);offset+=matrix.byteLength;}
   const [alphaSha256,poseSha256]=await Promise.all([digest(alpha),digest(poseBytes)]);
   rows.push({time,yaw,activeClip:result.activeClip,revision:result.revision,sourceSize:[canvas.width,canvas.height],alphaSha256,poseSha256,opaque,partial,heightScale:pose.heightScale,heightRange:pose.heightRange,checkedVertices:indices.length,heightContractDelta:frameHeightDelta,groundOffsetDelta:groundError});
  }
  return {sourceMode:"Unified live actor source; legacy projected-shadow passes suppressed",heroId,clip,cell,metadata,headings:yaws,authoredKeys:metadata.times.length,interpolationMidpoints:times.length-metadata.times.length,sourceFrames:rows.length,checkedVertices,maxVertexDelta,maxHeightContractDelta,maxGroundOffsetDelta,sampling:"32 distributed vertices plus strongest-weight representative of every used joint, deduplicated; detailed GPU matrix separately checks every vertex",rows,failures,scope:'Every authored key and interval midpoint at eight runtime headings; original post-process alpha and the matching evaluated skin matrices. Detailed field casting/reception is a separate GPU report; this is not an exhaustive test of continuous real-valued time.'};
 }finally{producer.destroy();release();}
}
