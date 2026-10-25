// Device hints choose a conservative start; sustained live frame timing can lower it further.
// No GPU benchmark or model-name allowlist is used. Explicit ?quality=low|balanced|high pins QA/user choice.
export type QualityTier='low'|'balanced'|'high';
export type RenderQuality={tier:QualityTier;targetFps:30|60;resolution:number;heroScale:1|2;idleFps:number;simpleShadow:boolean;particleLimit:number};
export const QUALITY_PROFILES:Record<QualityTier,RenderQuality>={
 low:{tier:'low',targetFps:30,resolution:1,heroScale:1,idleFps:15,simpleShadow:true,particleLimit:400},
 balanced:{tier:'balanced',targetFps:60,resolution:1.5,heroScale:2,idleFps:30,simpleShadow:true,particleLimit:800},
 high:{tier:'high',targetFps:60,resolution:2,heroScale:2,idleFps:60,simpleShadow:false,particleLimit:1400},
};
export function createQualityController(hints:{mobile:boolean;memory?:number;cores?:number},override:string|null=null){
 let pinned=override==='low'||override==='balanced'||override==='high';
 let tier:QualityTier=pinned?override as QualityTier:hints.mobile?((hints.memory!==undefined&&hints.memory<=4)||(hints.cores!==undefined&&hints.cores<=4)?'low':'balanced'):'high';
 let reason=pinned?'explicit':hints.mobile?'device-hint':'default',since=0,last=0,count=0,slow=0;
 const listeners=new Set<(q:RenderQuality)=>void>();
 let frameRate:30|60|undefined;
 const get=()=>frameRate?{...QUALITY_PROFILES[tier],targetFps:frameRate}:QUALITY_PROFILES[tier];
 function reset(){since=last=count=slow=0;}
 return {
  get,configure(quality:'auto'|'low'|'high',fps:30|60){
   pinned=quality!=='auto';frameRate=fps;
   tier=pinned?quality as QualityTier:hints.mobile?((hints.memory!==undefined&&hints.memory<=4)||(hints.cores!==undefined&&hints.cores<=4)?'low':'balanced'):'high';
   reason=pinned?'settings':'device-hint';reset();for(const fn of listeners)fn(get());
  },snapshot:()=>({...get(),reason,pinned}),reset,
  subscribe(fn:(q:RenderQuality)=>void){listeners.add(fn);return ()=>listeners.delete(fn);},
  noteFrame(now:number,dt:number,browserCapped=false){
   if(pinned||tier==='low'||browserCapped){reset();return;}
   if(!Number.isFinite(dt)||dt<=0||dt>=1000||last&&now-last>1500){reset();return;}
   last=now;since||=now;count++;if(dt>1000/get().targetFps*1.25)slow++;
   // Isolated hitches do not lower quality; require a majority of late frames over four seconds.
   if(now-since<4000)return;
   if(count>=40&&slow/count>.5){tier=tier==='high'?'balanced':'low';reason='sustained-slow-frames';for(const fn of listeners)fn(get());}
   // Quality stays lowered for this page load, preventing oscillation and texture/context churn.
   reset();
  },
 };
}
const nav=typeof navigator==='undefined'?undefined:navigator;
export const renderQuality=createQualityController({mobile:Boolean(nav&&(/Android|iPhone|iPad|iPod/i.test(nav.userAgent)||nav.platform==='MacIntel'&&nav.maxTouchPoints>1)),memory:(nav as Navigator&{deviceMemory?:number}|undefined)?.deviceMemory,cores:nav?.hardwareConcurrency},typeof location==='undefined'?null:new URLSearchParams(location.search).get('quality'));
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>renderQuality.reset());

