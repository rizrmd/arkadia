import {create3dHeroRenderer} from './hero-3d';
import {retainUnifiedActorShadows} from './shadow-actor-sources';
import {skinVertex,vector} from './shadow-skinned-reference';
const digest=async(bytes:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
/** Normal producer updates: no auditPose resets, forced animation times, or alternate skin clock. */
export async function auditGlbBlends(heroId='ember-warden'){
 const manifest=await fetch('/assets/characters/manifest.json').then(r=>r.json()),cell=manifest.characters[heroId].cell,release=retainUnifiedActorShadows(),producer=create3dHeroRenderer({diagnostic:true,heroId}),rows:any[]=[],failures:string[]=[],canvas=document.createElement('canvas'),seen=new Set<string>();let checkedVertices=0,maxVertexDelta=0,maxHeightContractDelta=0,maxGroundOffsetDelta=0,cachedFrames=0,ticks=0;
 const plan=[{name:'idle',clip:'idle',moving:false,frames:12},{name:'run',clip:'move',moving:true,frames:18},{name:'idle-cast',clip:'attack',moving:false,frames:12},{name:'run-cast',clip:'attack',moving:true,frames:12},{name:'hit',clip:'hit',moving:false,frames:9},{name:'recover-idle',clip:'idle',moving:false,frames:12},{name:'recover-run',clip:'move',moving:true,frames:12},{name:'death',clip:'die',moving:false,frames:60}];
 try{
  const start=performance.now();while(!producer.isHeroReady(heroId)){if(performance.now()-start>120000)throw Error('Blend source load timeout');await new Promise(r=>setTimeout(r,20));}
  let lastRevision=-1,indices:number[]|undefined;
  for(let heading=0;heading<8;heading++)for(const stage of plan){
   // notifyHeroCast uses a real wall-clock hold, as gameplay does. Let it expire
   // before testing the recovery transitions rather than bypassing that path.
   if(stage.name==='recover-idle')await new Promise(r=>setTimeout(r,1000));
   for(let frame=0;frame<stage.frames;frame++){
    const time=ticks/30,yaw=heading*Math.PI/4+Math.sin(time*1.7)*.15,night=heading%2?.5:0,result=producer.updateAndRender({heroId,clip:stage.clip,moving:stage.moving,yaw,dt:1/30,tint:night?'210,224,255':'255,255,255',night,cell});ticks++;if(!result)throw Error('Missing normal blend publication');
    if(result.revision===lastRevision){cachedFrames++;await new Promise(r=>setTimeout(r,17));continue;}lastRevision=result.revision;seen.add(result.activeClip);
    const pose=result.shadowMeshes[0];if(result.shadowMeshes.length!==1)throw Error('Unexpected blend mesh count');
    if(!indices){const count=pose.geometry.positions.length/3,representatives=new Map<number,{index:number;weight:number}>();for(let i=0;i<count;i++)for(let j=0;j<4;j++){const joint=pose.geometry.joints[i*4+j],weight=pose.geometry.weights[i*4+j];if(weight>0&&weight>(representatives.get(joint)?.weight??-1))representatives.set(joint,{index:i,weight});}indices=[...new Set([...Array.from({length:32},(_,i)=>Math.floor(i*(count-1)/31)),...Array.from(representatives.values(),v=>v.index)])];}
    const top=result.spriteTop*cell.h/(result.spriteH-result.spriteTop),height=(cell.h+top)*.66,pivotY=(cell.pivot.y+top)/(cell.h+top),heightScale=pose.heightScale*.66,groundError=Math.abs((.5-pose.camera[13]*.5-pivotY)*height-(result.groundY-cell.pivot.y)*.66);maxGroundOffsetDelta=Math.max(maxGroundOffsetDelta,groundError);if(groundError>1e-4)failures.push('Blend ground/pivot mismatch '+ticks);
    for(const expected of producer.auditVertices(heroId,indices)){const actual=skinVertex(pose,expected.index),delta=Math.max(...actual.map((v,i)=>Math.abs(v-expected.world[i]))),q=vector(pose.camera,actual),floor=vector(pose.camera,[actual[0],0,actual[2]]),heightDelta=Math.abs((q[1]-floor[1])*.5*height-actual[1]*heightScale);checkedVertices++;maxVertexDelta=Math.max(maxVertexDelta,delta);maxHeightContractDelta=Math.max(maxHeightContractDelta,heightDelta);if(delta>1e-5||heightDelta>1e-4)failures.push('Blend deformation/height mismatch '+ticks+':'+expected.index);if(actual[1]<pose.heightRange[0]-1e-5||actual[1]>pose.heightRange[1]+1e-5)failures.push('Blend bounds omitted vertex '+ticks+':'+expected.index);}
    canvas.width=result.spriteW;canvas.height=result.spriteH;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(result.sprite,0,0,result.spriteW,result.spriteH,0,0,canvas.width,canvas.height);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data,alpha=Uint8Array.from({length:rgba.length/4},(_,i)=>rgba[i*4+3]);let opaque=0;for(const value of alpha)if(value===255)opaque++;if(!opaque)failures.push('Empty blend silhouette '+ticks);
    rows.push({heading,stage:stage.name,frame,requestedClip:stage.clip,activeClip:result.activeClip,requestedYaw:yaw,night,revision:result.revision,sourceSize:[canvas.width,canvas.height],alphaSha256:await digest(alpha),opaque,checkedVertices:indices.length});await new Promise(r=>setTimeout(r,17));
   }
  }
  for(const clip of ['idle','run','idle_cast','run_cast','hit','death'])if(!seen.has(clip))failures.push('Normal transition did not exercise '+clip);
  return {heroId,cell,plan,headings:8,sourceFrames:rows.length,ticks,cachedFrames,checkedVertices,maxVertexDelta,maxHeightContractDelta,maxGroundOffsetDelta,activeClips:[...seen],rows,failures,scope:'Normal production mixer fades, run/cast phase-lock, procedural arm raise, recovery/death, continuous yaw and day/night tint; source/skin/height alignment. GPU field controls are separate; no forced pose time.'};
 }finally{producer.destroy();release();}
}
