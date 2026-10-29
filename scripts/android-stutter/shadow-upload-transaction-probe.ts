import {Application,Container} from 'pixi.js';
import {createSceneShadows} from '../../src/stronghold/scene-shadows';
export async function probe(){
 const NativeWorker=Worker;
 // The real worker must resend receiver bytes when the previous bundle was canceled.
 const worker=new NativeWorker(new URL('../../src/stronghold/shadow-field-worker.ts',import.meta.url),{type:'module'});
 const request=(data:any)=>new Promise<any>((resolve,reject)=>{worker.onmessage=e=>resolve(e.data);worker.onerror=e=>reject(Error(e.message));worker.postMessage(data);});
 worker.postMessage({type:'scene',packed:new Float32Array()});const sun={dx:.2,dy:.3,alpha:.4};
 const first=await request({type:'build',id:1,revision:1,heightRevision:7,sun}),cached=await request({type:'build',id:2,revision:1,heightRevision:7,sun}),resent=await request({type:'build',id:3,revision:1,heightRevision:7,needHeight:true,sun});worker.terminate();
 const workers:any[]=[];
 class FakeWorker{onmessage:any;onerror:any;requests:any[]=[];constructor(){workers.push(this);}postMessage(data:any){if(data.type==='build')this.requests.push(data);}terminate(){}}
 (window as any).Worker=FakeWorker;
 const app=new Application();await app.init({width:16,height:16,preference:'webgl'});app.stop();let scene:ReturnType<typeof createSceneShadows>|undefined;
 try{
  const stage=app.stage.addChild(new Container());let commits=0;scene=createSceneShadows(stage,()=>commits++,app.renderer);scene.setScene([]);scene.setSun(sun);scene.place(0,0,1,390,734);await Promise.resolve();
  const fake=workers[0],r1=fake.requests[0],filter=scene.filter,oldSources=['uDepth','uSecondDepth','uHeight'].map(k=>filter.resources[k]);
  const map=(value:number)=>({bounds:{left:-20,top:-30,step:1.25,width:731,height:941},pixels:new Uint8ClampedArray(731*941*4).fill(value)});
  const response=(r:any)=>({id:r.id,revision:r.revision,heightRevision:r.heightRevision,sun,depth:map(11),second:map(22),height:map(33),samples:1,buildMs:1});
  const pending=fake.onmessage({data:response(r1)});await new Promise(requestAnimationFrame);
  const unpublished=commits===0&&oldSources.every((s,i)=>filter.resources[['uDepth','uSecondDepth','uHeight'][i]]===s);
  scene.place(-500,0,1,390,734);await pending;
  const canceledInvisible=commits===0&&oldSources.every((s,i)=>filter.resources[['uDepth','uSecondDepth','uHeight'][i]]===s);
  const r2=fake.requests.at(-1);let mixedFrames=0,running=true;
  const observe=()=>{const changed=oldSources.map((s,i)=>filter.resources[['uDepth','uSecondDepth','uHeight'][i]]!==s);if(changed.some(Boolean)&&!changed.every(Boolean))mixedFrames++;if(running)requestAnimationFrame(observe);};requestAnimationFrame(observe);
  await fake.onmessage({data:response(r2)});running=false;
  const committed=commits===1&&['uDepth','uSecondDepth','uHeight'].every(k=>(filter.resources[k] as any).width===731)&&scene.stats().ready;
  return {receiverCache:{initial:!!first.height,cached:cached.height===null,resent:!!resent.height,heightRevision:resent.heightRevision},unpublished,canceledInvisible,requestedHeight:r2.needHeight,committed,mixedFrames,error:scene.stats().error};
 }finally{scene?.destroy();app.destroy({removeView:true,releaseGlobalResources:false},{children:true});(window as any).Worker=NativeWorker;}
}
