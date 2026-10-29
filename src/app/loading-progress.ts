// Keep the boot entry independent of Pixi so it can report code downloads before
// the renderer and gameplay dependency graphs have finished loading.
export type Progress=(done:number,total:number,label:string)=>void;

interface LoadingScreenApi{
 set(pct:number,text?:string):void;
 progress:Progress;
 done():void;
 fail(message:string):void;
}
declare global{
 interface Window{
  __LOADING_READY__?:boolean;
  __LOADING_SCREEN__?:LoadingScreenApi;
  __BOOT_ASSETS__?:{game:Record<string,number>};
 }
}

export function loadingScreen(){
 return {
  progress(done:number,total:number,label:string){window.__LOADING_SCREEN__?.progress(done,total,label);},
  done(){window.__LOADING_SCREEN__?.done();},
  fail(message:string){window.__LOADING_SCREEN__?.fail(message);},
 };
}

export function trackBootCode(){
 const assets=window.__BOOT_ASSETS__?.game;
 if(!assets||typeof PerformanceObserver==='undefined')return ()=>{};
 const completed=new Set<string>(),total=Object.values(assets).reduce((a,b)=>a+b,0);
 const report=(entries:PerformanceEntry[])=>{
  for(const entry of entries){const file=new URL(entry.name,location.href).pathname;if(file in assets)completed.add(file);}
  const bytes=[...completed].reduce((sum,file)=>sum+assets[file],0);
  loadingScreen().progress(1+10*bytes/Math.max(1,total),100,`Loading game code · ${completed.size}/${Object.keys(assets).length}`);
 };
 const observer=new PerformanceObserver(list=>report(list.getEntries()));
 // Older browsers may expose PerformanceObserver without resource entries.
 // Progress reporting is optional; it must never prevent the game from booting.
 try{
  observer.observe({type:'resource',buffered:true});
  report(performance.getEntriesByType('resource'));
 }catch{observer.disconnect();}
 return ()=>observer.disconnect();
}
